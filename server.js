import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import interestRoutes from "./routes/intrestRoutes.js";

// ⭐ Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log body for POST/PUT - but check if it exists
  if (req.method === 'POST' || req.method === 'PUT') {
    // For multipart, body might be empty until multer processes it
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

// ⭐ UPDATED: Serve static files with proper path resolution
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ⭐ Optional: Add logging for upload requests (for debugging)
app.use('/uploads', (req, res, next) => {
  console.log('📸 Uploads request:', req.url);
  console.log('📁 Serving from:', path.join(__dirname, 'uploads'));
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);

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
    uploadsPath: path.join(__dirname, 'uploads'),
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
app.get("/", (req, res) => res.send("Backend is live"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 Backend URL: ${process.env.BACKEND_URL || 'http://localhost:' + PORT}`);
});