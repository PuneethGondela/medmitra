interface ChatInputProps {
  inputMessage: string
  setInputMessage: (value: string) => void
  sendMessage: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  isConnected: boolean
}

export default function ChatInput({
  inputMessage,
  setInputMessage,
  sendMessage,
  handleKeyPress,
  isConnected,
}: ChatInputProps) {
  return (
    <div className="bg-white px-4 py-3 flex items-center space-x-2 border-t border-gray-200">
      <button
        className="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Add attachment"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
      </button>
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Type a message" : "Connecting..."}
          disabled={!isConnected}
          className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-whatsapp-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      {inputMessage.trim() ? (
        <button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-whatsapp-green text-white p-2 rounded-full hover:bg-whatsapp-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      ) : (
        <button
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Record voice message"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
