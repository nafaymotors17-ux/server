// controllers/activity.controller.js - CREATE THIS FILE
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/api.response");
const ApiError = require("../utils/api.error");
const activityLogger = require("../utils/activity.logger");

// Get recent activities (last 2 days)
exports.getRecentActivities = asyncHandler(async (req, res) => {
  const activities = activityLogger.getRecentActivities(2); // Last 2 days
  res
    .status(200)
    .json(ApiResponse.success("Recent activities retrieved", activities));
});

// Download logs - fixed version
exports.downloadLogs = asyncHandler(async (req, res) => {
  const logFiles = activityLogger.getLogFiles();
  if (logFiles.length === 0) {
    throw ApiError.notFound("No log files found");
  }

  // Get the most recent log file
  const latestLogFile = logFiles[0];
  const logContent = activityLogger.getLogFileContent(latestLogFile.name);

  if (!logContent) {
    throw ApiError.notFound("Log file not found");
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${latestLogFile.name}`
  );
  res.send(logContent);
});
