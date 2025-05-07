
// /home/digilab/timesheet/server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure path is correct
import dotenv from "dotenv";

dotenv.config();

// Middleware to protect routes by verifying JWT token.
export const protect = async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Protect middleware: Processing ${req.method} ${req.originalUrl}`);
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object, excluding the password
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
          console.warn(`[${new Date().toISOString()}] Protect middleware: User not found for token ID: ${decoded.id}`);
          return res.status(401).json({ message: "Not authorized, user not found" });
      }

      console.log(`[${new Date().toISOString()}] Protect middleware: Token verified for user ${req.user.email}. Proceeding.`);
      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Protect middleware: Token verification failed. Error: ${error.message}`);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    console.warn(`[${new Date().toISOString()}] Protect middleware: No token provided in headers.`);
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Middleware to restrict access to employers only
// This middleware should be used *after* the 'protect' middleware.
export const employerOnly = (req, res, next) => {
  // Check if req.user (attached by 'protect' middleware) exists and has the 'employer' role.
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