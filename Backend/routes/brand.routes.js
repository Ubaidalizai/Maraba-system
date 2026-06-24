const express = require("express");
const {
  createBrand,
  getAllBrands,
  getBrand,
  updateBrand,
  deleteBrand,
  restoreBrand,
  permanentDeleteBrand,
} = require("../controllers/brand.controller.js");
const { authorizeAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(createBrand).get(getAllBrands);
router.patch("/:id/restore", restoreBrand);
router.delete("/:id/permanent", authorizeAdmin, permanentDeleteBrand);
router.route("/:id").get(getBrand).patch(updateBrand).delete(deleteBrand);

module.exports = router;
