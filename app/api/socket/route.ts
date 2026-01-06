import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export async function GET(req: NextRequest) {
  if (!io) {
    const httpServer = new HTTPServer()
    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    })

    const users = new Map()

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      socket.on('setUsername', (username: string) => {
        users.set(socket.id, username)
        socket.broadcast.emit('userJoined', username)
        console.log(`User ${username} joined the chat`)
      })

      socket.on('message', (data: { text: string; sender: string; timestamp: string }) => {
        const username = users.get(socket.id) || data.sender || 'Anonymous'
        const messageData = {
          ...data,
          sender: username,
        }
        
        io?.emit('message', messageData)
        console.log(`Message from ${username}: ${data.text}`)
      })

      socket.on('disconnect', () => {
        const username = users.get(socket.id) || 'Anonymous'
        users.delete(socket.id)
        socket.broadcast.emit('userLeft', username)
        console.log(`User ${username} left the chat`)
      })
    })

    httpServer.listen(3001, () => {
      console.log('Socket.IO server running on port 3001')
    })
  }

  return new Response('Socket.IO server initialized', { status: 200 })
}
