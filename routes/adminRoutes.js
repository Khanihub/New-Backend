import express from "express";
import bcrypt from "bcryptjs";
import User from "../model/User.js"; // path adjust karo apne model ke hisaab se

const router = express.Router();

// Temporary admin creation route
router.get("/create-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@marriage.com" });
    if (existing) return res.json({ message: "Admin already exists" });

    const password = "Admin@123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);



    const admin = await User.create({
      name: "Super Admin",
      email: "admin6@marriage.com",
      password: hashedPassword,
      role: "admin"
    });

    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; // ✅ default export
