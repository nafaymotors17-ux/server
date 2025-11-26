// controllers/dashboardController.js
const Purchase = require("../models/purchase.model");
const ApiResponse = require("../utils/api.response");
const asyncHandler = require("../utils/asyncHandler");

exports.getDashboardStats = asyncHandler(async (req, res) => {
  // Get counts and totals for each status
  const statusStats = await Purchase.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalCost: { $sum: "$total" },
        totalSoldPrice: { $sum: "$soldPrice" },
      },
    },
  ]);

  // Convert to object for easy access
  const counts = {};
  const totals = {};
  const soldTotals = {};

  statusStats.forEach((item) => {
    counts[item._id] = item.count;
    totals[item._id] = item.totalCost || 0;
    soldTotals[item._id] = item.totalSoldPrice || 0;
  });

  // Calculate expiring soon (vehicles expiring in next 3 months)
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);

  const expiringSoonStats = await Purchase.aggregate([
    {
      $match: {
        expiryDate: { $ne: null, $exists: true },
        status: { $in: ["purchased", "load_requested", "loaded", "available"] }, // Only count active vehicles
      },
    },
    {
      $addFields: {
        expiryDateParsed: {
          $dateFromString: {
            dateString: { $concat: ["$expiryDate", "-01"] },
            format: "%Y-%m-%d",
            onError: null,
          },
        },
      },
    },
    {
      $match: {
        expiryDateParsed: {
          $gte: today,
          $lte: threeMonthsFromNow,
        },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalCost: { $sum: "$total" },
      },
    },
  ]);

  const expiringSoon = expiringSoonStats[0] || { count: 0, totalCost: 0 };

  // Get overall totals
  const overallStats = await Purchase.aggregate([
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalInvestment: { $sum: "$total" },
        totalRevenue: { $sum: "$soldPrice" },
      },
    },
  ]);

  const overall = overallStats[0] || {
    totalPurchases: 0,
    totalInvestment: 0,
    totalRevenue: 0,
  };

  const stats = {
    // Counts
    purchased: counts.purchased || 0,
    load_requested: counts.load_requested || 0,
    loaded: counts.loaded || 0,
    available: counts.available || 0,
    sold: counts.sold || 0,
    released: counts.released || 0,
    expired: counts.expired || 0,
    expiring_soon: expiringSoon.count || 0,

    // Financial totals
    total_purchased_cost: totals.purchased || 0,
    total_load_requested_cost: totals.load_requested || 0,
    total_loaded_cost: totals.loaded || 0,
    total_available_cost: totals.available || 0,
    total_sold_cost: totals.sold || 0,
    total_released_cost: totals.released || 0,
    total_expired_cost: totals.expired || 0,
    total_expiring_soon_cost: expiringSoon.totalCost || 0,

    // Sold prices
    total_sold_revenue: soldTotals.sold || 0,

    // Overall stats
    total_vehicles: overall.totalPurchases,
    total_investment: overall.totalInvestment,
    total_revenue: overall.totalRevenue,
    estimated_profit: overall.totalRevenue - overall.totalInvestment || 0,
  };
  console.log("stats are : ", stats);

  res
    .status(200)
    .json(ApiResponse.success("Dashboard stats retrieved successfully", stats));
});
