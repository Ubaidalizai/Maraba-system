const express = require("express");
const {
  createUnit,
  getAllUnits,
  getUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unit.controller.js");

const router = express.Router();

router.route("/").post(createUnit).get(getAllUnits);

router.route("/:id").get(getUnit).patch(updateUnit).delete(deleteUnit);

module.exports = router;
