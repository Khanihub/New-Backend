import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import interestRoutes from "./routes/intrestRoutes.js";
import settingsRoutes from "./routes/settingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js"

// ⭐ Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://trae-dating-project.vercel.app'
    ],
    credentials: true
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log body for POST/PUT - but check if it exists
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Content-Type:', req.headers['content-type']);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request Body:', req.body);
    } else {
      console.log('Request Body: (multipart - will be parsed by multer)');
    }
  }
  
  next();
});

app.use(cors({
  origin: [
    'https://trae-dating-project.vercel.app', 
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐⭐⭐ CRITICAL: Serve static files - BOTH uploads AND assets ⭐⭐⭐
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ⭐ Optional: Add logging for static file requests (for debugging)
app.use('/uploads', (req, res, next) => {
  console.log('📸 Uploads request:', req.url);
  console.log('📁 Serving from:', path.join(__dirname, 'uploads'));
  next();
});

app.use('/assets', (req, res, next) => {
  console.log('🎨 Assets request:', req.url);
  console.log('📁 Serving from:', path.join(__dirname, 'assets'));
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);
// ====== SOCKET.IO CONNECTION HANDLING ======
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  socket.on("joinChat", (matchId) => {
    socket.join(matchId);
    console.log(`👤 Socket ${socket.id} joined room ${matchId}`);
  });

  socket.on("sendMessage", ({ matchId, message }) => {
    console.log("📤 Broadcasting message to room:", matchId);
    socket.to(matchId).emit("newMessage", message);
  });

  socket.on("deleteMessage", ({ matchId, messageId }) => {
    console.log("🗑️ Broadcasting deletion to room:", matchId);
    socket.to(matchId).emit("messageDeleted", { messageId });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Test routes for debugging
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working", timestamp: new Date().toISOString() });
});

app.post("/api/test-upload", (req, res) => {
  console.log("Test upload request body:", req.body);
  res.json({ success: true, received: req.body });
});

// ⭐ NEW: Health check endpoint that shows configuration
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    socketio: "enabled ✅",
    uploadsPath: path.join(__dirname, 'uploads'),
    assetsPath: path.join(__dirname, 'assets'),
    backendUrl: process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5000',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test route
app.get("/", (req, res) => res.send("Backend is live with Socket.IO ✅"));

const PORT = process.env.PORT || 5000;

// ⭐⭐⭐ CRITICAL FIX: Use server.listen() NOT app.listen() ⭐⭐⭐
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO enabled - Real-time messaging active!`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`📁 Assets directory: ${path.join(__dirname, 'assets')}`);
  console.log(`🌐 Backend URL: ${process.env.BACKEND_URL || 'http://localhost:' + PORT}`);
});