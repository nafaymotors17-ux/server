// routes/purchases.js
const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchase.controller");
const authMiddleware = require("../middlewares/jwt.middleware");
router.post("/create", authMiddleware, purchaseController.createPurchase);
router.get("/list", purchaseController.getPurchases);
router.put("/:id", authMiddleware, purchaseController.updatePurchase);
router.delete("/:id", authMiddleware, purchaseController.deletePurchase);
// routes/purchaseRoutes.js
router.patch(
  "/:id/status",
  authMiddleware,
  purchaseController.updatePurchaseStatus
);
router.patch("/:id/revert-to-purchased", purchaseController.revertToPurchased);

module.exports = router;
