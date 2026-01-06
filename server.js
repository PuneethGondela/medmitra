const { createServer } = require('http')
const { Server } = require('socket.io')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

const users = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('setUsername', (username) => {
    users.set(socket.id, username)
    socket.broadcast.emit('userJoined', username)
    console.log(`User ${username} joined the chat`)
  })

  socket.on('message', (data) => {
    const username = users.get(socket.id) || 'Anonymous'
    const messageData = {
      ...data,
      sender: username,
    }
    
    // Broadcast to all clients including sender
    io.emit('message', messageData)
    console.log(`Message from ${username}: ${data.text}`)
  })

  socket.on('disconnect', () => {
    const username = users.get(socket.id) || 'Anonymous'
    users.delete(socket.id)
    socket.broadcast.emit('userLeft', username)
    console.log(`User ${username} left the chat`)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
