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

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.badRequest("Invalid credentials");
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.badRequest("Invalid credentials");
  }

  const response = ApiResponse.success("Login successful", user.toJSON());
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
