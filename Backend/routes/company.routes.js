const express = require("express");
const {
  createCompany,
  getAllCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  restoreCompany,
  permanentDeleteCompany,
} = require("../controllers/company.controller.js");
const { authorizeAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(createCompany).get(getAllCompanies);
router.patch("/:id/restore", restoreCompany);
router.delete("/:id/permanent", authorizeAdmin, permanentDeleteCompany);
router.route("/:id").get(getCompany).patch(updateCompany).delete(deleteCompany);

module.exports = router;
