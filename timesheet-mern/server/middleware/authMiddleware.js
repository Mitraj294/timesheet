import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

// Middleware to protect routes (Only authenticated users)
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Extract token from "Bearer <token>"
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password"); // Attach user to request
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Middleware to allow only employers
export const employerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }

  if (req.user.role !== "employer") {
    return res.status(403).json({ message: "Access denied, only employers can perform this action" });
  }

  next();
};
