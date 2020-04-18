const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const cors = require('cors')
const shortid = require('shortid')
const _ = require('lodash')

const PORT = process.env.PORT || 8080

const app = express()

app.use(cors())

const server = http.createServer(app)

const io = socketIO(server)


let historyData = {}

io.on('connection', socket => {
  console.log(`New User connected socketid: ${socket.id}`)

  socket.on('chatMessage', (data) => {
    console.log(`[SERVER] chatMessage '${data}' from [${socket.id}]`)
    io.to(data.roomCode).emit('chatData', data)
    
  })

  // socket.on('chatData', (data) => {
  //   io.sockets.emit('chatData', data)
  // })

  socket.on('chatTyping', (data) => {
    socket.broadcast.emit('chatTyping', data)
  })

  socket.on('createRoom', (data) => {
    const room = shortid.generate()
    socket.join(room)
    io.sockets.adapter.rooms[room].scores = {
      xScore: 0,
      oScore: 0,
    }

    io.sockets.adapter.rooms[room].hasAdded = false


    console.log(`[SERVER] New Room Created ID:[${room}] by [${socket.id}]`)

    const systemMessage = {
      message: `[SYSTEM] Room successfully created. Waiting for opponent... ROOM CODE: ${room}`,
      isSystemMessage: true,
    }
    socket.emit('systemMessage', systemMessage)
    socket.emit('createRoom', room)


  })

  socket.on('joinRoom', (room) => {
    let systemMessage = {};
    if (!io.sockets.adapter.rooms[room]) {
      systemMessage = {
        message: '[SYSTEM] Room does not exist',
        isSystemMessage: true,
      }
      socket.emit('systemMessage', systemMessage)
      return
    }
    const noUsers = io.sockets.adapter.rooms[room].length
    const MAX_USERS = 2
    if (noUsers === MAX_USERS) {
      systemMessage = {
        message: '[SYSTEM] Room is already full',
        isSystemMessage: true,
      }
      
    } else {
      systemMessage = {
        message: `[SYSTEM] You have entered the room. ROOM CODE: ${room}`,
        isSystemMessage: true,
      }
      socket.join(room)
      socket.emit('joinRoom', room)
      socket.emit('systemMessage', systemMessage)
      // io.to(room).emit('systemMessage', systemMessage)

      console.log(`[SERVER] [ROOM-${room}] New user [${socket.id}] has joined`)
      console.log(`[SERVER] [ROOM-${room}] Total Users: ${noUsers+1}`)
      systemMessage = {
        message: `[SYSTEM] Game has started. Enjoy!`,
        isSystemMessage: true,
      }
      socket.emit('gameStart')
      io.to(room).emit('gameStart')
      io.to(room).emit('systemMessage', systemMessage)

    }
    // socket.emit('systemMessage', systemMessage)
    
  })

  socket.on('gameUpdate', (data) => {
    io.to(data.roomCode).emit('gameData', data)
    console.log('[SERVER] Game has been updated')
    // socket.broadcast.to(data.roomCode).emit('gameData', data)
  })

  socket.on('addScoreX', (room) => {

    if (!io.sockets.adapter.rooms[room].hasAdded) {
      console.log('[SERVER] received addScoreX')
      io.sockets.adapter.rooms[room].scores.xScore += 1
      let data = io.sockets.adapter.rooms[room].scores
      io.to(room).emit('addScoreX', data)

      io.sockets.adapter.rooms[room].hasAdded = true
    } else {
      console.log('[SERVER] blocked duplicate addScoreX')
    }
    
  })

  socket.on('addScoreO', (room) => {

    if (!io.sockets.adapter.rooms[room].hasAdded) {
    console.log('[SERVER] received addScoreO')
    io.sockets.adapter.rooms[room].scores.oScore += 1
    let data = io.sockets.adapter.rooms[room].scores
    io.to(room).emit('addScoreO', data)
    io.sockets.adapter.rooms[room].hasAdded = true
    } else {
      console.log('[SERVER] blocked duplicate addScoreX')
    }
  })

  socket.on('gameReset', (room) => {
    console.log('[SERVER] Restarting game...')
    io.sockets.adapter.rooms[room].hasAdded = false
  })


  socket.on('disconnect', () => {
    console.log('User disconnected')
  })
})

server.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`)
})