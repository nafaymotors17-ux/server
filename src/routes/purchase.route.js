// routes/purchases.js
const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchase.controller");

router.post("/create", purchaseController.createPurchase);
router.get("/list", purchaseController.getPurchases);
router.put("/:id", purchaseController.updatePurchase);
router.delete("/:id", purchaseController.deletePurchase);
// routes/purchaseRoutes.js
router.patch("/:id/status", purchaseController.updatePurchaseStatus);
router.patch("/:id/revert-to-purchased", purchaseController.revertToPurchased);

module.exports = router;
