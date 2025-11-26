const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.conteroller");

router.get("/download", activityController.downloadLogs);
router.get("/recent-activities", activityController.getRecentActivities);
module.exports = router;
