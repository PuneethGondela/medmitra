'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'

interface Message {
  id: string
  text: string
  sender: string
  timestamp: Date
  isOwn: boolean
}

export default function Chat() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string>('')

  useEffect(() => {
    // Generate a random user ID
    const userId = `User_${Math.random().toString(36).substr(2, 9)}`
    userIdRef.current = userId
    setCurrentUser(userId)

    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      newSocket.emit('setUsername', userId)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('message', (data: { text: string; sender: string; timestamp: string }) => {
      setMessages((prev) => {
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          text: data.text,
          sender: data.sender,
          timestamp: new Date(data.timestamp),
          isOwn: data.sender === userIdRef.current,
        }
        return [...prev, newMessage]
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (socket && inputMessage.trim() && userIdRef.current) {
      socket.emit('message', {
        text: inputMessage,
        sender: userIdRef.current,
        timestamp: new Date().toISOString(),
      })
      setInputMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-whatsapp-lighter">
      <ChatHeader 
        contactName="Chat Room" 
        isOnline={isConnected}
      />
      <ChatMessages 
        messages={messages} 
        currentUser={currentUser}
        messagesEndRef={messagesEndRef}
      />
      <ChatInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        sendMessage={sendMessage}
        handleKeyPress={handleKeyPress}
        isConnected={isConnected}
      />
    </div>
  )
}
