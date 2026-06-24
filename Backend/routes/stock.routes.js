const express = require("express");
const {
  createStock,
  getAllStocks,
  getStock,
  updateStock,
  deleteStock,
  getBatchesByProduct,
  getInventoryStats,
  getStockReport,
  getExpiringStocks,
  getStockPurchaseSource,
} = require("../controllers/stock.controller");

const router = express.Router();

router.get("/stats", getInventoryStats);
router.get("/expiring", getExpiringStocks);
// Reports route must come BEFORE /:productId routes
router.get("/reports", getStockReport);
router.get("/:productId/batches", getBatchesByProduct);

router.route("/").post(createStock).get(getAllStocks);

router.get("/:id/purchase-source", getStockPurchaseSource);
router.route("/:id").get(getStock).patch(updateStock).delete(deleteStock);

module.exports = router;
