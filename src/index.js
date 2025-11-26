const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const ApiError = require("./utils/api.error");
const cookieParser = require("cookie-parser");
const app = express();

// Import routes
const authRoutes = require("./routes/auth.routes");
const purchaseRoutes = require("./routes/purchase.route");
const activityRoutes = require("./routes/activity.routes");
// const dashboardRoutes = require("./routes/dashboard.routes");
// Use purchase routes
// Middleware
app.use(helmet());
app.use(cookieParser());
const allowedOrigins = ["http://localhost:5173", "*"];
app.use(
  cors({
    origin: true,

    // function (origin, callback) {
    //   // Allow requests with no origin (like Postman, server-to-server)
    //   if (!origin) return callback(null, true);

    //   if (allowedOrigins.includes(origin)) {
    //     callback(null, true);
    //   } else {
    //     callback(new Error("Not allowed by CORS"));
    //   }
    // },
    credentials: true, // allow cookies to be sent
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/activities", activityRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root route
app.use("/", (req, res) => {
  res.send("<h1>This is Nafay Motors Inventory Management Server Running</h1>");
});

// Global error handling middleware
app.use((error, req, res, next) => {
  let apiError = error;

  // Handle mongoose validation errors
  console.log(error);

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    apiError = ApiError.validationError("Validation failed", errors[0]);
  }

  // Handle mongoose cast errors (invalid ObjectId)
  if (error.name === "CastError") {
    apiError = ApiError.badRequest("Invalid resource ID format");
  }

  // Handle mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    apiError = ApiError.conflict(`${field} already exists`);
  }

  // Log unexpected errors
  if (!apiError.isOperational) {
    console.error("🚨 Unexpected Error:", error);
    apiError = ApiError.internalError();
  }

  // Send error response
  res.status(apiError.statusCode).json({
    success: apiError.success,
    message: apiError.message,
    type: apiError.type,
    details: apiError.details,
  });
});

module.exports = app;
