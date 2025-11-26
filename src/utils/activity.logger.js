// utils/activityLogger.js
const fs = require("fs");
const path = require("path");

class ActivityLogger {
  constructor() {
    this.logsDir = path.join(__dirname, "../logs");
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getCurrentLogFile() {
    // Keep logs for 14 days in one file, then rotate
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Create a new log file every 14 days
    const daysSinceEpoch = Math.floor(today / (1000 * 60 * 60 * 24));
    const fileNumber = Math.floor(daysSinceEpoch / 14);

    return path.join(this.logsDir, `activity-${fileNumber}.log`);
  }

  logActivity(user, action, resource, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      user: {
        id: user.id,
        name: user.name || user.username,
        email: user.email,
      },
      action,
      resource,
      details,
    };

    const logFile = this.getCurrentLogFile();

    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n", "utf8");
      console.log(`📝 Activity logged: ${action} ${resource} by ${user.name}`);
    } catch (error) {
      console.error("Error writing to log file:", error);
    }
  }

  getRecentActivities(days = 2) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const activities = [];

      // Read current log file
      const currentLogFile = this.getCurrentLogFile();
      if (fs.existsSync(currentLogFile)) {
        const content = fs.readFileSync(currentLogFile, "utf8");
        const lines = content.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const activity = JSON.parse(line);
            const activityDate = new Date(activity.timestamp);

            if (activityDate >= cutoffDate) {
              activities.push(activity);
            }
          } catch (e) {
            console.error("Error parsing log line:", e);
          }
        }
      }

      // Sort by timestamp (newest first) and limit to 20
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    } catch (error) {
      console.error("Error reading activities:", error);
      return [];
    }
  }

  getLogFiles() {
    try {
      const files = fs
        .readdirSync(this.logsDir)
        .filter((file) => file.startsWith("activity-") && file.endsWith(".log"))
        .map((file) => {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.modified - a.modified);

      return files;
    } catch (error) {
      console.error("Error getting log files:", error);
      return [];
    }
  }

  // Download log file
  getLogFileContent(filename) {
    try {
      const filePath = path.join(this.logsDir, filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8");
      }
      return null;
    } catch (error) {
      console.error("Error reading log file:", error);
      return null;
    }
  }
}

module.exports = new ActivityLogger();
