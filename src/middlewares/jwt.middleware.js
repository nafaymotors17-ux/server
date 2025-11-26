// middleware/authMiddleware.js - ADD DEBUG LOGGING
const User = require("../models/user.model");
const ApiError = require("../utils/api.error");
const asyncHandler = require("../utils/asyncHandler");

const authenticateUser = asyncHandler(async (req, res, next) => {
  try {
    console.log("🔐 Auth middleware checking...");
    console.log("🍪 Cookies:", req.cookies);

    // Get user data from cookie
    const userData = req.cookies.userData;

    if (!userData) {
      console.log("❌ No userData cookie found");
      throw ApiError.unauthorized("No authentication data found");
    }

    console.log("📦 Raw userData:", userData);

    // Parse user data
    let user;
    try {
      user = JSON.parse(userData);
      console.log("✅ Parsed user data:", user);
    } catch (parseError) {
      console.log("❌ Failed to parse userData:", parseError);
      throw ApiError.unauthorized("Invalid user data format");
    }

    // Verify user exists in database
    console.log("🔍 Looking for user with ID:", user.id);
    const dbUser = await User.findById(user.id).select("-password");

    if (!dbUser) {
      console.log("❌ User not found in database");
      throw ApiError.unauthorized("User not found");
    }

    console.log("✅ User found:", dbUser.email);

    // Add user to request object
    req.user = {
      id: dbUser._id,
      username: dbUser.username,
      email: dbUser.email,
      name: dbUser.username, // Since you don't have name field
    };

    console.log("✅ Authentication successful, user attached to request");
    next();
  } catch (error) {
    console.log("❌ Auth middleware error:", error.message);
    next(error);
  }
});

module.exports = authenticateUser;
