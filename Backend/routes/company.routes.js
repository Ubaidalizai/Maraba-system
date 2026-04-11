const express = require("express");
const {
  createCompany,
  getAllCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/company.controller.js");

const router = express.Router();

router.route("/").post(createCompany).get(getAllCompanies);

router.route("/:id").get(getCompany).patch(updateCompany).delete(deleteCompany);

module.exports = router;
