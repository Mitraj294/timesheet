import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import User from "../models/User.js"; 

const router = express.Router();


router.post("/register", registerUser);


router.post("/login", loginUser);


router.post("/check-user", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    return res.json({ exists: !!user, user });
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Server error checking user." });
  }
});

export default router;
