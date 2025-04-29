
// /home/digilab/timesheet/server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure path is correct
import dotenv from "dotenv";

dotenv.config();

export const protect = async (req, res, next) => {
  // --- ADD THIS LOG ---
  console.log(`[${new Date().toISOString()}] protect middleware entered for: ${req.method} ${req.originalUrl}`);
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
          console.log(`[${new Date().toISOString()}] protect middleware: User not found for token ID: ${decoded.id}`);
          return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // --- ADD THIS LOG ---
      console.log(`[${new Date().toISOString()}] protect middleware: Token verified, user ${req.user.email} attached. Calling next().`);
      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error(`[${new Date().toISOString()}] protect middleware: Token verification failed:`, error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    console.log(`[${new Date().toISOString()}] protect middleware: No token provided.`);
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Middleware to restrict access to employers only
// Assumes the 'protect' middleware has already run and attached req.user
export const employerOnly = (req, res, next) => {
  // Check if req.user exists and has the role 'employer'
  // protect middleware should run *before* this one
  if (req.user && req.user.role === 'employer') {
    next(); // User is an employer, proceed
  } else {
    // User is not an employer or req.user wasn't attached (problem with protect middleware order)
    res.status(403).json({ message: 'Access denied: Employer role required' }); // 403 Forbidden is more appropriate here
  }
};

// Note: You might combine protect and employerOnly if needed,
// or ensure they are always used in the correct order in your routes:
// router.get('/some-employer-route', protect, employerOnly, (req, res) => { ... });