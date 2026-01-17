import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import interestRoutes from "./routes/intrestRoutes.js";

dotenv.config();
connectDB();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request Body:', req.body);
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
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);     // ← CHANGED FROM /api/profiles TO /api/profile
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));