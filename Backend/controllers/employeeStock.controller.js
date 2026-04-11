const EmployeeStock = require('../models/employeeStock.model');
const Employee = require('../models/employee.model');
const Product = require('../models/product.model');
const Stock = require('../models/stock.model');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

// ✅ Get all employee stocks (with employee + product details)
exports.getAllEmployeeStocks = asyncHandler(async (req, res) => {
  const query = { isDeleted: false };
  
  // Filter by employee if employeeId is provided
  if (req.query.employeeId) {
    query.employee = req.query.employeeId;
  }
  
  const stocks = await EmployeeStock.find(query)
    .populate('employee', 'name')
    .populate('product', 'name');


  res.status(200).json({
    success: true,
    count: stocks.length,
    data: stocks,
  });
});

// ✅ Get stock for a specific employee
exports.getEmployeeStockByEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  const stocks = await EmployeeStock.find({
    employee: employeeId,
    isDeleted: false,
  }).populate('product', 'name');

  // Return empty array instead of throwing error when no stocks found
  res.status(200).json({
    success: true,
    employee: employeeId,
    count: stocks.length,
    data: stocks,
  });
});

// ✅ Get single employee stock record (employee + product)
exports.getEmployeeStockRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const record = await EmployeeStock.findById(id)
    .populate('employee', 'name')
    .populate('product', 'name');

  if (!record) throw new AppError('Employee stock record not found', 404);

  res.status(200).json({
    success: true,
    data: record,
  });
});

// ✅ Already existing: Return employee stock to store
exports.returnEmployeeStock = asyncHandler(async (req, res, next) => {
  const { employeeId, productId, quantity } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const empStock = await EmployeeStock.findOne({
      employee: employeeId,
      product: productId,
    }).session(session);

    if (!empStock || empStock.quantity_in_hand < quantity) {
      throw new AppError('Invalid or insufficient employee stock', 400);
    }

    empStock.quantity_in_hand -= quantity;
    await empStock.save({ session });

    const storeStock = await Stock.findOneAndUpdate(
      { product: productId, location: 'store' },
      { $inc: { quantity } },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Returned employee stock to store successfully',
      employeeStock: empStock,
      storeStock,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message, 500);
  }
});
