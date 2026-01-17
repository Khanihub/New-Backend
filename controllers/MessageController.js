import Message from "../model/Message.js"
import Match from "../model/Match.js"

// GET CONVERSATIONS
export const getConversations = async (req, res) => {
  const matches = await Match.find({
    users: req.user.id
  }).populate("users", "name")

  res.json(matches)
}

// GET MESSAGES
export const getMessages = async (req, res) => {
  const messages = await Message.find({
    match: req.params.matchId
  }).sort("createdAt")

  res.json(messages)
}

// SEND MESSAGE
export const sendMessage = async (req, res) => {
  const message = await Message.create({
    match: req.body.matchId,
    sender: req.user.id,
    text: req.body.text
  })

  res.status(201).json(message)
}
