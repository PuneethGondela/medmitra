interface Message {
  id: string
  text: string
  sender: string
  timestamp: Date
  isOwn: boolean
}

interface ChatMessagesProps {
  messages: Message[]
  currentUser: string
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export default function ChatMessages({ messages, currentUser, messagesEndRef }: ChatMessagesProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === currentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                message.sender === currentUser
                  ? 'bg-whatsapp-light text-gray-900'
                  : 'bg-white text-gray-900'
              }`}
            >
              {message.sender !== currentUser && (
                <p className="text-xs font-semibold text-whatsapp-dark mb-1">
                  {message.sender}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}
