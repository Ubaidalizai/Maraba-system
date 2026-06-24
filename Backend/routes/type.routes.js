const express = require("express");
const {
  createType,
  getAllTypes,
  getType,
  updateType,
  deleteType,
  restoreType,
  permanentDeleteType,
} = require("../controllers/type.controller.js");
const { authorizeAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(createType).get(getAllTypes);
router.patch("/:id/restore", restoreType);
router.delete("/:id/permanent", authorizeAdmin, permanentDeleteType);
router.route("/:id").get(getType).patch(updateType).delete(deleteType);

module.exports = router;
