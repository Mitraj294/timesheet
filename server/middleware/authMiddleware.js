// /home/digilab/timesheet/server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

// Protect routes: check JWT and attach user to req
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }
      // Attach employerId for employees if present in token
      if (req.user.role === "employee" && decoded.employerId) {
        req.user.employerId = decoded.employerId;
      }
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Only allow employers
export const employerOnly = (req, res, next) => {
  if (req.user && req.user.role === "employer") {
    next();
  } else {
    res.status(403).json({ message: "Access denied: Employer role required" });
  }
};
