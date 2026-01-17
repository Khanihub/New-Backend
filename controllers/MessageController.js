import Message from "../model/Message.js"
import Match from "../model/Match.js"
import Profile from "../model/Profile.js"

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://i.pravatar.cc/400?img=1'
  if (imagePath.startsWith('http')) return imagePath
  
  const baseUrl = process.env.BACKEND_URL 
    || (process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.NODE_ENV === 'production'
        ? 'https://new-backend-production-766f.up.railway.app'
        : 'http://localhost:5000')
  
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${baseUrl}${path}`
}

// GET CONVERSATIONS
export const getConversations = async (req, res) => {
  try {
    console.log('=== GET CONVERSATIONS ===')
    console.log('User ID:', req.user.id)

    // Find all matches for the current user
    const matches = await Match.find({
      users: req.user.id
    }).populate("users", "name email")

    console.log('Found matches:', matches.length)

    // Format conversations with other user's info
    const conversations = await Promise.all(
      matches.map(async (match) => {
        // Get the other user (not the current user)
        const otherUser = match.users.find(
          (u) => u._id.toString() !== req.user.id.toString()
        )

        if (!otherUser) {
          console.log('No other user found in match:', match._id)
          return null
        }

        // Get the other user's profile for additional info
        const otherProfile = await Profile.findOne({ user: otherUser._id })

        // Get the last message in this conversation
        const lastMessage = await Message.findOne({ match: match._id })
          .sort({ createdAt: -1 })

        return {
          _id: match._id,
          matchId: match._id,
          user: {
            _id: otherUser._id,
            name: otherProfile?.fullName || otherUser.name || 'Unknown',
            email: otherUser.email,
            image: getImageUrl(otherProfile?.image)
          },
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            sender: lastMessage.sender
          } : null,
          unreadCount: 0
        }
      })
    )

    // Filter out null values
    const validConversations = conversations.filter(c => c !== null)

    console.log('Returning conversations:', validConversations.length)

    res.json({
      success: true,
      conversations: validConversations
    })

  } catch (error) {
    console.error('=== GET CONVERSATIONS ERROR ===')
    console.error('Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching conversations',
      error: error.message 
    })
  }
}

// GET MESSAGES
export const getMessages = async (req, res) => {
  try {
    console.log('=== GET MESSAGES ===')
    console.log('Match ID:', req.params.matchId)
    console.log('User ID:', req.user.id)

    const matchId = req.params.matchId

    // Verify that the current user is part of this match
    const match = await Match.findById(matchId)
    
    if (!match) {
      return res.status(404).json({ 
        success: false,
        message: 'Match not found' 
      })
    }

    // Get all messages for this match
    const messages = await Message.find({ match: matchId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 }) // Sort oldest first

    console.log('Found messages:', messages.length)

    // Format messages with sender info
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        const senderProfile = await Profile.findOne({ user: msg.sender._id })
        
        return {
          _id: msg._id,
          text: msg.text,
          sender: {
            _id: msg.sender._id,
            name: senderProfile?.fullName || msg.sender.name || 'Unknown',
            image: getImageUrl(senderProfile?.image)
          },
          isMine: msg.sender._id.toString() === req.user.id.toString(),
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        }
      })
    )

    res.json({
      success: true,
      messages: formattedMessages
    })

  } catch (error) {
    console.error('=== GET MESSAGES ERROR ===')
    console.error('Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching messages',
      error: error.message 
    })
  }
}

// SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    console.log('=== SEND MESSAGE ===')
    console.log('Request body:', req.body)
    console.log('User ID:', req.user.id)

    const { matchId, text } = req.body

    if (!matchId || !text || !text.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Match ID and message text are required' 
      })
    }

    // Verify that the current user is part of this match
    const match = await Match.findById(matchId)
    
    if (!match) {
      return res.status(404).json({ 
        success: false,
        message: 'Match not found' 
      })
    }

    // Create the message
    const message = await Message.create({
      match: matchId,
      sender: req.user.id,
      text: text.trim()
    })

    console.log('Message created:', message._id)

    // Populate sender info
    await message.populate('sender', 'name email')

    // Get sender's profile
    const senderProfile = await Profile.findOne({ user: req.user.id })

    // Format response
    const formattedMessage = {
      _id: message._id,
      text: message.text,
      sender: {
        _id: message.sender._id,
        name: senderProfile?.fullName || message.sender.name || 'Unknown',
        image: getImageUrl(senderProfile?.image)
      },
      isMine: true,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    }

    res.status(201).json({
      success: true,
      message: formattedMessage
    })

  } catch (error) {
    console.error('=== SEND MESSAGE ERROR ===')
    console.error('Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error sending message',
      error: error.message 
    })
  }
}