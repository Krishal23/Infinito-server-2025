import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";

// Authenticate User
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return next(new ErrorHandler("Access token is required", 401));
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?.userId).select("-password -refreshToken");
    
    if (!user) {
      return next(new ErrorHandler("Invalid access token", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid access token", 401));
  }
};

// Authorize Roles - Fixed version
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ErrorHandler(`Role (${req.user.role}) is not allowed to access this resource`, 403));
    }

    next();
  };
};

// Alternative authorize function (if you prefer this naming)
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        msg: "Forbidden: Insufficient role access" 
      });
    }
    next();
  };
};

// Verify Admin - Fixed version
export const verifyAdmin = async (req, res, next) => {
  try {
    // First authenticate the user
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - No token provided" 
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token - User not found" 
      });
    }

    // Check if user is admin
    if (user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access only" 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(401).json({ 
      success: false, 
      message: "Invalid token" 
    });
  }
};
