import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import {
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage  // ⭐ ADD THIS
} from "../controllers/MessageController.js"

const router = express.Router()

router.get("/conversations", protect, getConversations)
router.get("/:matchId", protect, getMessages)
router.post("/", protect, sendMessage)
router.delete("/:messageId", protect, deleteMessage)  // ⭐ ADD THIS

export default router