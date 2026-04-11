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
} = require("../controllers/stock.controller");

const router = express.Router();

router.get("/stats", getInventoryStats);
// Reports route must come BEFORE /:productId routes
router.get("/reports", getStockReport);
router.get("/:productId/batches", getBatchesByProduct);

router.route("/").post(createStock).get(getAllStocks);

router.route("/:id").get(getStock).patch(updateStock).delete(deleteStock);

module.exports = router;
