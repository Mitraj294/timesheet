import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide name, email, password, and role" });
    }
    // Add more validation as needed (e.g., password length, email format)

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash password before saving
    // Note: Hashing is done via middleware/hook in your User model, which is good practice.
    // If not, you would hash here:
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password, // Send plain password if model hook handles hashing
      // password: hashedPassword, // Send hashed password if hashing here
      role,
    });

    // Check if user creation was successful
    if (!user) {
      // This case might be redundant if User.create throws an error handled by catch block
      return res.status(400).json({ message: "Invalid user data, failed to create user" });
    }

    // Respond with success message and non-sensitive user data
    // Avoid sending back the whole user object if it contains sensitive info
    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id, // Use _id for consistency
        name: user.name,
        email: user.email,
        role: user.role,
      },
      // Optionally, generate and return a token immediately if registration implies login
      // token: generateToken(user._id, user.role) // Example call
    });
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    // Check if user exists and if password matches
    // Use a single "Invalid credentials" message for security (don't reveal if email exists)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" }); // Use 401 Unauthorized
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Payload
      process.env.JWT_SECRET,             // Secret Key
      { expiresIn: "1d" }                 // Options (e.g., expiration)
    );

    // Respond with token and non-sensitive user data
    res.json({
      token,
      user: {
        id: user._id, // Use id or _id consistently
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Helper function to generate token (optional, can be inline as above)
// const generateToken = (id, role) => {
//   return jwt.sign({ id, role }, process.env.JWT_SECRET, {
//     expiresIn: '1d', // Example: token expires in 1 day
//   });
// };
