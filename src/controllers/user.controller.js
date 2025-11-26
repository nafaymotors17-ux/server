const User = require("../models/user.model");
const ApiError = require("../utils/api.error");
const ApiResponse = require("../utils/api.response");
const asyncHandler = require("../utils/asyncHandler");

exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, phoneNumber } = req.body;
  // Check if user already exists
  const existingUser = await User.findOne({
    email: email,
  });

  if (existingUser) {
    throw ApiError.conflict("User already exists with this email");
  }

  // Create new user
  const user = new User({
    username,
    email,
    password,
    phoneNumber,
  });

  await user.save();

  const response = ApiResponse.success(
    "User created successfully",
    user.toJSON()
  );
  res.status(201).json(response);
});

// controllers/authController.js - ADD LOGGING TO LOGIN
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Login attempt for:", email);

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    console.log("❌ User not found:", email);
    throw ApiError.badRequest("Invalid credentials");
  }

  console.log("✅ User found, checking password...");

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    console.log("❌ Password mismatch for:", email);
    throw ApiError.badRequest("Invalid credentials");
  }

  // Prepare user data for cookie
  const userData = {
    id: user._id,
    username: user.username,
    email: user.email,
    name: user.username,
  };

  console.log("✅ Login successful, setting cookie...");

  const response = ApiResponse.success("Login successful", userData);

  res
    .status(200)
    .cookie("userData", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(response);

  console.log("✅ Login response sent with cookie");
});
// Add logout function
exports.logout = asyncHandler(async (req, res) => {
  // Clear the cookie
  res.clearCookie("userData", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  const response = ApiResponse.success("Logout successful");
  res.status(200).json(response);
});

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};
