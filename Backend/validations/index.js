// Export all validation schemas from a single entry point
const { userValidationSchema } = require('./userValidation');
const { loginValidationSchema } = require('./loginValidation');
const { updateUserValidationSchema } = require('./updateUserValidation');
const { updateProfileValidationSchema } = require('./updateProfileValidation');
const {
  stockValidationSchema,
  updateStockValidationSchema,
} = require('./stockValidation');
const {
  unitValidationSchema,
  updateUnitValidationSchema,
} = require('./unitValidation');
const {
  productValidationSchema,
  updateProductValidationSchema,
} = require('./product.validation');
const {
  purchaseValidationSchema,
  purchaseItemSchema,
} = require('./purchase.validation');
const {
  createSaleSchema,
  updateSaleSchema,
  saleItemSchema,
} = require('./sale.validation');
const {
  supplierValidationSchema,
  updateSupplierValidationSchema,
} = require('./supplierValidation');
const {
  customerValidationSchema,
  updateCustomerValidationSchema,
} = require('./customerValidation');
const {
  employeeValidationSchema,
  updateEmployeeValidationSchema,
} = require('./employeeValidation');

module.exports = {
  userValidationSchema,
  loginValidationSchema,
  updateUserValidationSchema,
  updateProfileValidationSchema,
  stockValidationSchema,
  updateStockValidationSchema,
  unitValidationSchema,
  updateUnitValidationSchema,
  productValidationSchema,
  updateProductValidationSchema,
  purchaseValidationSchema,
  purchaseItemSchema,
  createSaleSchema,
  updateSaleSchema,
  saleItemSchema,
  supplierValidationSchema,
  updateSupplierValidationSchema,
  customerValidationSchema,
  updateCustomerValidationSchema,
  employeeValidationSchema,
  updateEmployeeValidationSchema,
};
