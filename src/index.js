const path = require('path')
const http = require('http')
const express = require('express')
const hbs = require('hbs')
const socketio = require('socket.io')
const Filter = require("bad-words")
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const viewsPath = path.join(__dirname, '../templates/views')
const publicPath = path.join(__dirname, '../public')

// app.set('view engine', 'hbs')
// app.set('views', viewsPath)

app.use(express.static(publicPath))

// app.get('', (req,res)=>{
//     res.render('index', {
//         //title: 'Weather app',
//         name: 'sam cui'
//     })
// })

//let count = 0

io.on('connection', (socket)=>{
    console.log('new webscoket connection')
    // socket.emit('countUpdated', count)
    // socket.on('increment', ()=>
    // {
    //     count++
    //     //socket.emit('countUpdated', count) //emits only to the current connection
    //     io.emit('countUpdated', count) //emits to all connections
    // })
    

    socket.on('join', ({username, room}, callback)=>{
        const {error, user} = addUser({id: socket.id, username, room})
        if(error)
        {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage(user.username, 'Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback)=>
    {
        const user = getUser(socket.id)
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed.')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)
        if(user)
        {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })

    socket.on('sendLocation', (coords, callback)=>
    {
        const user = getUser(socket.id)
        const url = 'https://google.com/maps?q='+coords.latitude+','+coords.longitude
        io.to(user.room).emit('location-message', generateLocationMessage(user.username, url))

        callback(url)
    })
})

server.listen(port,()=>{
    console.log('Server is up on port '+ port)
})