import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import './Messages.css'

// Use VITE_API from your .env (which already includes /api)
const API_BASE = import.meta.env.VITE_API || 'http://localhost:5000/api'

function Messages() {
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)

  const [conversations, setConversations] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')

    fetchConversations(token)
    setTimeout(() => setIsVisible(true), 100)
  }, [navigate])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      console.log('Conversations response:', data)
      
      // Backend returns { success: true, conversations: [...] }
      if (data.success && data.conversations) {
        setConversations(data.conversations)
      } else {
        setConversations([])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (matchId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/messages/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      console.log('Messages response:', data)
      
      // Backend returns { success: true, messages: [...] }
      if (data.success && data.messages) {
        setMessages(data.messages)
      } else {
        setMessages([])
      }
      setSelectedChat(matchId)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setMessages([])
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim() || !selectedChat) return

    setSending(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          matchId: selectedChat, // Backend expects matchId, not chatId
          text: messageText.trim()
        })
      })

      const data = await res.json()
      console.log('Send message response:', data)

      if (data.success) {
        // Add the new message to the list
        setMessages(prev => [...prev, data.message])
        setMessageText('')
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleEmojiClick = (emoji) => {
    setMessageText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInMs = now - messageDate
    const diffInMins = Math.floor(diffInMs / 60000)

    if (diffInMins < 1) return 'Just now'
    if (diffInMins < 60) return `${diffInMins}m ago`
    
    const diffInHours = Math.floor(diffInMins / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return messageDate.toLocaleDateString()
  }

  const filteredConversations = conversations.filter(conv =>
    conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConversation = conversations.find(c => c.matchId === selectedChat)

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '😍', '🙏', '😢', '😮', '🔥']

  return (
    <div className="messages-page">
      <main className="messages-main">
        {/* Header */}
        <div className={`messages-header ${isVisible ? 'visible' : ''}`}>
          <div className="header-bg-circle circle-1"></div>
          <div className="header-bg-circle circle-2"></div>
          <div className="header-content">
            <h1>💬 Messages</h1>
            <p>Connect and chat with your matches</p>
          </div>
        </div>

        {/* Messages Container */}
        <div className={`messages-container ${isVisible ? 'visible' : ''}`}>
          {/* Conversations Sidebar */}
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <h2>Conversations</h2>
              {conversations.length > 0 && (
                <span className="unread-badge">{conversations.length}</span>
              )}
            </div>

            {/* Search Box */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Conversations List */}
            <div className="conversations-list">
              {loading && (
                <div className="no-conversations">
                  <p>Loading conversations...</p>
                </div>
              )}

              {!loading && filteredConversations.length === 0 && (
                <div className="no-conversations">
                  <p>No conversations yet</p>
                  <small>Start matching to begin chatting!</small>
                </div>
              )}

              {filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`conversation-item ${selectedChat === conv.matchId ? 'active' : ''}`}
                  onClick={() => fetchMessages(conv.matchId)}
                >
                  <div className="conv-avatar-container">
                    <img
                      src={conv.user?.image || 'https://i.pravatar.cc/400?img=1'}
                      alt={conv.user?.name || 'User'}
                      className="conv-avatar"
                    />
                    <span className="online-indicator"></span>
                  </div>

                  <div className="conv-details">
                    <div className="conv-header">
                      <h3 className="conv-name">{conv.user?.name || 'Unknown User'}</h3>
                      {conv.lastMessage && (
                        <span className="conv-time">
                          {getTimeAgo(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="conv-message-row">
                      <p className="conv-last-message">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="unread-count">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {!selectedChat ? (
              <div className="no-chat-selected">
                <div className="no-chat-icon">💬</div>
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-user-info">
                    <div className="chat-avatar-container">
                      <img
                        src={selectedConversation?.user?.image || 'https://i.pravatar.cc/400?img=1'}
                        alt={selectedConversation?.user?.name || 'User'}
                      />
                      <span className="online-indicator"></span>
                    </div>
                    <div className="chat-user-details">
                      <h3>{selectedConversation?.user?.name || 'Unknown User'}</h3>
                      <p className="user-status">Active now</p>
                    </div>
                  </div>
                  <div className="chat-actions">
                    <button className="chat-action-btn" title="Call">📞</button>
                    <button className="chat-action-btn" title="Video call">📹</button>
                    <button className="chat-action-btn" title="More">⋮</button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="messages-area">
                  <div className="messages-list">
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`message-bubble ${msg.isMine ? 'sent' : 'received'}`}
                        >
                          <div className="message-content">
                            <p>{msg.text}</p>
                            <div className="message-meta">
                              <span className="message-time">
                                {getTimeAgo(msg.createdAt)}
                              </span>
                              {msg.isMine && (
                                <span className="message-status">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  <form onSubmit={handleSendMessage} className="message-input-form">
                    <button
                      type="button"
                      className="emoji-btn"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      😊
                    </button>

                    {showEmojiPicker && (
                      <div className="emoji-picker">
                        {emojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="emoji-item"
                            onClick={() => handleEmojiClick(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      className="message-input"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sending}
                    />

                    <button type="button" className="attach-btn" title="Attach file">
                      📎
                    </button>

                    <button
                      type="submit"
                      className="send-btn"
                      disabled={!messageText.trim() || sending}
                    >
                      <span className="send-icon">➤</span>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className={`tips-section ${isVisible ? 'visible' : ''}`}>
          <div className="tip-card">
            <div className="tip-icon">🔒</div>
            <div className="tip-content">
              <h4>Stay Safe</h4>
              <p>Never share personal information like passwords or financial details</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🤝</div>
            <div className="tip-content">
              <h4>Be Respectful</h4>
              <p>Treat everyone with kindness and respect in your conversations</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <div className="tip-content">
              <h4>Take Your Time</h4>
              <p>Get to know your matches before moving to other platforms</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Messages