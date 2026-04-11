const express = require("express");
const {
  createBrand,
  getAllBrands,
  getBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brand.controller.js");

const router = express.Router();

router.route("/").post(createBrand).get(getAllBrands);

router.route("/:id").get(getBrand).patch(updateBrand).delete(deleteBrand);

module.exports = router;
