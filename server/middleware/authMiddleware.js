// /home/digilab/timesheet/server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure path is correct
import dotenv from "dotenv";

// Load environment variables - Ensure this runs before JWT_SECRET is used
// It's often better to call dotenv.config() once in your main server entry file (e.g., server.js)
// but having it here works too if this file is imported early enough.
dotenv.config();

// Middleware to protect routes - requires a valid token
export const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from "Bearer <token>" string
      token = req.headers.authorization.split(" ")[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by ID from the token payload, exclude the password field
      // Attach the user object (without password) to the request object
      req.user = await User.findById(decoded.id).select("-password");

      // Handle case where user might not be found (e.g., deleted after token issued)
      if (!req.user) {
          return res.status(401).json({ message: "Not authorized, user not found" });
      }

      next(); // Token is valid, user found, proceed to the next middleware/route handler
    } catch (error) {
      console.error('Token verification failed:', error.message); // Log the error server-side
      // Handle specific JWT errors if needed (e.g., TokenExpiredError)
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    // No token found in the header
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
