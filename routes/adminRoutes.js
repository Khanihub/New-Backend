import express from "express";
import bcrypt from "bcryptjs";
import User from "../model/User.js";

const router = express.Router();

// Temporary admin creation route
router.get("/create-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@marriage.com" });
    if (existing) {
      return res.json({ message: "Admin already exists" });
    }

    // ✅ Fixed: Use 'password' instead of 'plainPassword'
    const password = "Admin@123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: "Super Admin",
      email: "admin@marriage.com", // ✅ Fixed: consistent email
      password: hashedPassword,
      role: "admin"
    });

    res.json({ 
      success: true, 
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;