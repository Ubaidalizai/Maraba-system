const express = require("express");
const {
  createType,
  getAllTypes,
  getType,
  updateType,
  deleteType,
} = require("../controllers/type.controller.js");

const router = express.Router();

router.route("/").post(createType).get(getAllTypes);

router.route("/:id").get(getType).patch(updateType).delete(deleteType);

module.exports = router;
