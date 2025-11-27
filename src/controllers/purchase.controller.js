// controllers/purchaseController.js
const Purchase = require("../models/purchase.model");
const ApiError = require("../utils/api.error");
const ApiResponse = require("../utils/api.response");
const asyncHandler = require("../utils/asyncHandler");
// const activityLogger = require("../utils/activity.logger");
// Create new purchase
exports.createPurchase = asyncHandler(async (req, res, next) => {
  const body = req.body;

  const safeTrim = (v) => (typeof v === "string" ? v.trim() : v);
  const safeUpperTrim = (v) =>
    typeof v === "string" ? v.trim().toUpperCase() : v;
  const safeNumber = (v) =>
    v === undefined || v === "" || v === null ? undefined : Number(v);

  // Required field validation (schema will validate too)
  const required = [
    "purchaseDate",
    "auctionNumber",
    "maker",
    "chassisNumber",
    "push",
    "tax",
    "auctionFee",
    "auction",
  ];
  for (const field of required) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
    ) {
      throw ApiError.badRequest(`${field} is required`);
    }
  }

  // Duplicate checks
  const chassis = safeUpperTrim(body.chassisNumber);
  if (await Purchase.findOne({ chassisNumber: chassis })) {
    throw ApiError.conflict(
      "A vehicle with this chassis number already exists"
    );
  }

  if (await Purchase.findOne({ auctionNumber: Number(body.auctionNumber) })) {
    throw ApiError.conflict("Auction number already exists");
  }

  // Build purchase object safely
  const purchaseData = {
    purchaseDate: new Date(body.purchaseDate),
    auctionNumber: Number(body.auctionNumber),
    maker: safeTrim(body.maker),
    chassisNumber: chassis,
    push: Number(body.push),
    tax: Number(body.tax),
    auctionFee: Number(body.auctionFee),
    auction: safeTrim(body.auction),
  };

  // Optional fields
  if (body.recycle !== undefined)
    purchaseData.recycle = safeNumber(body.recycle);
  if (body.risko !== undefined) purchaseData.risko = safeNumber(body.risko);
  if (body.yard !== undefined) purchaseData.yard = safeTrim(body.yard);
  if (body.loadDate) purchaseData.loadDate = new Date(body.loadDate);
  if (body.ETA) purchaseData.ETA = new Date(body.ETA);
  if (body.modelYear) purchaseData.modelYear = safeTrim(body.modelYear);
  if (body.status) purchaseData.status = body.status;

  // User tracking
  // if (req.user) {
  //   purchaseData.createdBy = req.user.id;
  //   purchaseData.createdByName = req.user.name || req.user.username;
  // }

  const purchase = new Purchase(purchaseData);
  await purchase.save(); // triggers pre-save → calculates total + expiry
  // Log the activity
  // if (req.user) {
  //   activityLogger.logActivity(req.user, "CREATE_PURCHASE", "PURCHASE", {
  //     purchaseId: purchase._id,
  //     chassisNumber: purchase.chassisNumber,
  //     auctionNumber: purchase.auctionNumber,
  //     maker: purchase.maker,
  //     modelYear: purchase.modelYear,
  //     totalCost: purchase.total,
  //   });
  // }

  res
    .status(201)
    .json(ApiResponse.created("Purchase created successfully", purchase));
});

// src/controllers/purchaseController.js

// src/controllers/purchaseController.js
exports.getPurchases = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const chassisNumber = req.query.chassisNumber || "";
  const modelYear = req.query.modelYear || "";
  const maker = req.query.maker || "";
  const auctionNumber = req.query.auctionNumber || "";
  const status = req.query.status || ""; // ✅ Keep empty for all statuses
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder || "desc";

  const filter = {};

  // ✅ FIX: Only add status to filter if provided
  if (status) {
    filter.status = status;
  }
  // If status is empty string, don't filter by status (get all)

  // Quick search
  if (search) {
    const terms = search.trim().split(/\s+/);

    filter.$and = terms.map((term) => ({
      $or: [
        { maker: { $regex: term, $options: "i" } },
        { modelYear: { $regex: term, $options: "i" } },
        { chassisNumber: { $regex: term, $options: "i" } },
        { auction: { $regex: term, $options: "i" } },
      ],
    }));
  }

  if (chassisNumber) {
    filter.chassisNumber = { $regex: chassisNumber, $options: "i" };
  }
  if (modelYear) filter.modelYear = { $regex: modelYear, $options: "i" };
  if (maker) filter.maker = { $regex: maker, $options: "i" };
  if (auctionNumber && !isNaN(auctionNumber))
    filter.auctionNumber = parseInt(auctionNumber);

  console.log("🔍 Filter:", filter); // Debug log

  // EXPIRY DATE SORTING
  if (sortBy === "expiryDate") {
    filter.expiryDate = { $ne: "", $exists: true };

    const aggregateQuery = Purchase.aggregate([
      { $match: filter },
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
          expiryDateParsed: { $ne: null },
        },
      },
      {
        $sort: {
          expiryDateParsed: sortOrder === "desc" ? -1 : 1,
          createdAt: -1,
        },
      },
    ]);

    const options = { page, limit, lean: true };
    const result = await Purchase.aggregatePaginate(aggregateQuery, options);

    const purchases = result.docs.map((p) => {
      let remainingDays = null;
      if (p.expiryDate) {
        const [year, month] = p.expiryDate.split("-");
        const expiryDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        remainingDays = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
        );
      }
      return { ...p, remainingDays };
    });

    return res.status(200).json(
      ApiResponse.success("Purchases retrieved successfully", purchases, {
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.totalDocs,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage,
        },
      })
    );
  }

  // DEFAULT SORTING
  let sort = {};
  if (sortBy === "modelYear") {
    sort.modelYear = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "purchaseDate") {
    sort.purchaseDate = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "loadDate") {
    sort.loadDate = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "ETA") {
    sort.ETA = sortOrder === "desc" ? -1 : 1;
  } else {
    sort.createdAt = sortOrder === "desc" ? -1 : 1;
  }

  const options = { page, limit, sort, lean: true };
  const result = await Purchase.paginate(filter, options);

  const purchases = result.docs.map((p) => {
    let remainingDays = null;
    if (p.expiryDate) {
      const [year, month] = p.expiryDate.split("-");
      const expiryDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      remainingDays = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );
    }
    return { ...p, remainingDays };
  });

  res.status(200).json(
    ApiResponse.success("Purchases retrieved successfully", purchases, {
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPrevPage,
      },
    })
  );
});

// Update purchase with proper calculations
exports.updatePurchase = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  console.log("🔄 Update request for ID:", id);
  console.log("📦 Update data (changed fields only):", updateData);

  // Helpers
  const safeTrim = (str) => (typeof str === "string" ? str.trim() : str);
  const safeUpperTrim = (str) =>
    typeof str === "string" ? str.toUpperCase().trim() : str;

  try {
    // 1️⃣ Fetch the purchase
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      console.log("❌ Purchase not found with ID:", id);
      throw ApiError.notFound("Purchase not found");
    }

    console.log("📋 Found purchase:", purchase.chassisNumber);

    // 2️⃣ Duplicate validation ONLY for fields that are being updated
    if (updateData.chassisNumber || updateData.auctionNumber) {
      const duplicateConditions = [];
      if (updateData.chassisNumber) {
        duplicateConditions.push({
          chassisNumber: safeUpperTrim(updateData.chassisNumber),
          _id: { $ne: id },
        });
      }
      if (updateData.auctionNumber) {
        duplicateConditions.push({
          auctionNumber: updateData.auctionNumber,
          _id: { $ne: id },
        });
      }

      if (duplicateConditions.length > 0) {
        const duplicatePurchase = await Purchase.findOne({
          $or: duplicateConditions,
        });
        if (duplicatePurchase) {
          if (
            duplicatePurchase.chassisNumber ===
            safeUpperTrim(updateData.chassisNumber)
          ) {
            throw ApiError.conflict("Chassis number already exists");
          }
          if (
            duplicatePurchase.auctionNumber ===
            parseInt(updateData.auctionNumber)
          ) {
            throw ApiError.conflict("Auction number already exists");
          }
        }
      }
    }

    // 3️⃣ Process dates ONLY if they are in updateData
    if (updateData.purchaseDate) {
      const date = new Date(updateData.purchaseDate);
      if (isNaN(date.getTime()))
        throw ApiError.badRequest("Invalid purchase date");
      updateData.purchaseDate = date;
    }

    ["loadDate", "ETA"].forEach((field) => {
      if (field in updateData) {
        if (updateData[field]) {
          const date = new Date(updateData[field]);
          if (isNaN(date.getTime()))
            throw ApiError.badRequest(`Invalid ${field} date`);
          updateData[field] = date;
        } else {
          updateData[field] = null;
        }
      }
    });

    // 4️⃣ Numeric fields - ONLY process fields that are being updated
    const numericFields = [
      "auctionNumber",
      "push",
      "tax",
      "auctionFee",
      "recycle",
      "risko",
    ];
    numericFields.forEach((field) => {
      if (
        field in updateData &&
        updateData[field] !== null &&
        updateData[field] !== undefined
      ) {
        const num = parseFloat(updateData[field]);
        if (isNaN(num) || (field === "auctionNumber" && num <= 0) || num < 0) {
          throw ApiError.badRequest(
            `${field} must be a valid ${
              field === "auctionNumber"
                ? "positive number"
                : "non-negative number"
            }`
          );
        }
        updateData[field] = num;
      }
    });

    // 5️⃣ String fields - ONLY process fields that are being updated
    if ("maker" in updateData) updateData.maker = safeTrim(updateData.maker);
    if ("chassisNumber" in updateData)
      updateData.chassisNumber = safeUpperTrim(updateData.chassisNumber);
    if ("auction" in updateData)
      updateData.auction = safeTrim(updateData.auction);
    if ("yard" in updateData) updateData.yard = safeTrim(updateData.yard);
    if ("modelYear" in updateData)
      updateData.modelYear = safeTrim(updateData.modelYear);

    // 6️⃣ Model year format validation ONLY if being updated
    if (updateData.modelYear && !/^\d{4}-\d{2}$/.test(updateData.modelYear)) {
      throw ApiError.badRequest("Model year must be in YYYY-MM format");
    }

    // 7️⃣ Apply ONLY the updates that were sent
    Object.keys(updateData).forEach((key) => {
      purchase[key] = updateData[key];
    });

    console.log("💾 Saving updated purchase with changed fields only...");

    // 8️⃣ Save document (triggers pre-save calculations)
    const updatedPurchase = await purchase.save();

    console.log(
      "✅ Purchase updated successfully:",
      updatedPurchase.chassisNumber
    );
    // if (req.user) {
    //   activityLogger.logActivity(req.user, "UPDATE_PURCHASE", "PURCHASE", {
    //     purchaseId: updatedPurchase._id,
    //     chassisNumber: updatedPurchase.chassisNumber,
    //     auctionNumber: updatedPurchase.auctionNumber,
    //     maker: updatedPurchase.maker,
    //     modelYear: updatedPurchase.modelYear,
    //     changedFields: Object.keys(updateData),
    //     oldValues: {
    //       chassisNumber: purchase.chassisNumber, // ✅ Now available
    //       auctionNumber: purchase.auctionNumber,
    //       maker: purchase?.maker,
    //       modelYear: purchase?.modelYear,
    //       status: purchase?.status,
    //     },
    //     newValues: {
    //       chassisNumber: updatedPurchase.chassisNumber,
    //       auctionNumber: updatedPurchase.auctionNumber,
    //       maker: updatedPurchase.maker,
    //       modelYear: updatedPurchase.modelYear,
    //       status: updatedPurchase.status,
    //     },
    //   });
    // }

    res
      .status(200)
      .json(
        ApiResponse.success("Purchase updated successfully", updatedPurchase)
      );
  } catch (error) {
    console.error("❌ Error updating purchase:", error);
    next(error);
  }
});

// Delete purchase (for future use)
exports.deletePurchase = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const purchase = await Purchase.findByIdAndDelete(id);

  if (!purchase) {
    throw ApiError.notFound("Record not found");
  }

  const response = ApiResponse.success("Record deleted successfully");
  // Log the activity
  // if (req.user) {
  //   activityLogger.logActivity(req.user, "DELETE_PURCHASE", "PURCHASE", {
  //     purchaseId: purchase._id,
  //     chassisNumber: purchase.chassisNumber,
  //     auctionNumber: purchase.auctionNumber,
  //     maker: purchase.maker,
  //     modelYear: purchase.modelYear,
  //   });
  // }
  res.status(200).json(response);
});

// Update purchase status (for future use)
exports.updatePurchaseStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = [
    "purchased",
    "load_requested",
    "loaded",
    "available",
    "sold",
    "released",
    "expired",
  ];

  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Use findByIdAndUpdate for status changes (no pre-save needed)
  const purchase = await Purchase.findByIdAndUpdate(
    id,
    {
      status,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!purchase) {
    throw ApiError.notFound("Purchase not found");
  }

  const response = ApiResponse.success(
    `Status updated to ${status} successfully`,
    purchase
  );
  // Log the activity
  // if (req.user) {
  //   activityLogger.logActivity(req.user, "STATUS_CHANGE", "PURCHASE", {
  //     purchaseId: purchase._id,
  //     chassisNumber: purchase.chassisNumber,
  //     auctionNumber: purchase.auctionNumber,
  //     maker: purchase.maker,
  //     oldStatus: status, // ✅ Use actual old status
  //     newStatus: status,
  //   });
  // }

  res.status(200).json(response);
});

// ✅ NEW: Route to revert from available to purchased
exports.revertToPurchased = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Use findByIdAndUpdate for status change only
  const purchase = await Purchase.findByIdAndUpdate(
    id,
    {
      status: "purchased",
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!purchase) {
    throw ApiError.notFound("Purchase not found");
  }

  const response = ApiResponse.success(
    "Vehicle reverted to purchased status",
    purchase
  );

  res.status(200).json(response);
});
