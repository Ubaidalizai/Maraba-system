const Employee = require('../models/employee.model');
const Stock = require('../models/stock.model');
const StockTransfer = require('../models/stockTransfer.model');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const AuditLog = require('../models/auditLog.model');
const EmployeeStock = require('../models/employeeStock.model');

// @desc    Transfer stock between locations (warehouse, store, employee)
// @route   POST /api/v1/stock-transfers
exports.transferStock = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { product, fromLocation, toLocation, employee, quantity, unit, notes } =
      req.body;

    if (fromLocation === toLocation)
      throw new AppError('مکان مبدا و مقصد نمیتواند یکسان باشد', 400);

    if (quantity <= 0)
      throw new AppError('تعداد باید بیشتر از صفر باشد', 400);

    const unitDoc = await Unit.findById(unit).session(session);
    if (!unitDoc) throw new AppError('واحد نامعتبر است', 400);

    const baseQuantity = quantity * unitDoc.conversion_to_base;

    if (fromLocation === 'employee') {
      const empStock = await EmployeeStock.findOne({
        employee,
        product,
        isDeleted: false,
      }).session(session);

      if (!empStock || empStock.quantity_in_hand < baseQuantity) {
        throw new AppError('موجودی کافی در انبار کارمند موجود نیست', 400);
      }

      empStock.quantity_in_hand -= baseQuantity;
      await empStock.save({ session });
    } else {
      const fromStock = await Stock.findOne({
        product,
        location: fromLocation,
        isDeleted: false,
      }).session(session);

      if (!fromStock) {
        throw new AppError(
          `موجودی این محصول در ${fromLocation} یافت نشد`,
          404
        );
      }

      if (fromStock.quantity < baseQuantity) {
        throw new AppError(
          `موجودی کافی در ${fromLocation} موجود نیست. موجود: ${fromStock.quantity}، درخواستی: ${baseQuantity}`,
          400
        );
      }

      fromStock.quantity -= baseQuantity;
      await fromStock.save({ session });
    }

    if (toLocation === 'employee') {
      let sourceStock;
      if (fromLocation === 'employee') {
        sourceStock = await Stock.findOne({
          product,
          isDeleted: false,
        }).session(session);
      } else {
        sourceStock = await Stock.findOne({
          product,
          location: fromLocation,
          isDeleted: false,
        }).session(session);
      }

      const purchasePricePerBaseUnit = sourceStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = sourceStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee, product, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: baseQuantity },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, new: true, session }
      );
    } else {
      let sourceStock;
      if (fromLocation === 'employee') {
        sourceStock = await Stock.findOne({
          product,
          isDeleted: false,
        }).session(session);
      } else {
        sourceStock = await Stock.findOne({
          product,
          location: fromLocation,
          isDeleted: false,
        }).session(session);
      }

      if (!sourceStock) {
        if (fromLocation === 'employee') {
          const productDoc = await Product.findById(product)
            .populate('unit')
            .session(session);
          if (!productDoc) throw new AppError('محصول یافت نشد', 404);
          sourceStock = {
            product,
            unit: productDoc.unit._id,
            batchNumber: 'DEFAULT',
            purchasePricePerBaseUnit: 0,
            expiryDate: null,
          };
        } else {
          throw new AppError(`موجودی مبدا در ${fromLocation} یافت نشد`, 404);
        }
      }

      const existingToStock = await Stock.findOne({
        product,
        location: toLocation,
        isDeleted: false,
      }).session(session);

      if (existingToStock) {
        existingToStock.quantity += baseQuantity;
        await existingToStock.save({ session });
      } else {
        await Stock.create(
          [
            {
              product: sourceStock.product,
              unit: sourceStock.unit,
              batchNumber: sourceStock.batchNumber,
              purchasePricePerBaseUnit: sourceStock.purchasePricePerBaseUnit,
              expiryDate: sourceStock.expiryDate,
              location: toLocation,
              quantity: baseQuantity,
            },
          ],
          { session }
        );
      }
    }

    const transfer = await StockTransfer.create(
      [
        {
          product,
          fromLocation,
          toLocation,
          employee: employee || null,
          quantity,
          unit,
          transferredBy: req.user._id,
          notes,
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          tableName: 'StockTransfer',
          operation: 'INSERT',
          oldData: null,
          newData: transfer[0].toObject(),
          reason: notes || 'انتقال موجودی ایجاد شد',
          changedBy: req.user?.name || 'System',
          recordId: transfer[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'موجودی با موفقیت انتقال یافت',
      transfer: transfer[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'انتقال موجودی ناموفق بود', 500);
  }
});

exports.getAllStockTransfers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const query = { isDeleted: { $ne: true } };

  const transfers = await StockTransfer.find(query)
    .populate('product', 'name')
    .populate('unit', 'name')
    .populate('employee', 'name')
    .populate('transferredBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await StockTransfer.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: transfers.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    data: transfers,
  });
});

exports.getStockTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  })
    .populate('product', 'name')
    .populate('unit', 'name')
    .populate('employee', 'name')
    .populate('transferredBy', 'name email');

  if (!transfer) {
    throw new AppError('انتقال موجودی یافت نشد', 404);
  }

  res.status(200).json({
    status: 'success',
    data: transfer,
  });
});

exports.updateStockTransfer = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      product,
      fromLocation,
      toLocation,
      quantity,
      notes,
      employee,
      reason,
    } = req.body;
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('unit', 'conversion_to_base')
      .session(session);

    if (!transfer || transfer.isDeleted)
      throw new AppError('انتقال موجودی یافت نشد', 404);

    const oldData = { ...transfer.toObject() };
    const oldBaseQuantity = transfer.quantity * (transfer.unit?.conversion_to_base || 1);

    if (transfer.toLocation === 'employee') {
      let empStock = await EmployeeStock.findOne({
        employee: transfer.employee,
        product: transfer.product,
        batchNumber: transfer.batchNumber || 'DEFAULT',
      }).session(session);

      if (!empStock) {
        empStock = await EmployeeStock.findOne({
          employee: transfer.employee,
          product: transfer.product,
        }).session(session);
      }

      if (empStock) {
        empStock.quantity_in_hand -= oldBaseQuantity;
        await empStock.save({ session });
      }
    } else {
      await Stock.findOneAndUpdate(
        { product: transfer.product, location: transfer.toLocation },
        { $inc: { quantity: -oldBaseQuantity } },
        { session }
      );
    }

    if (transfer.fromLocation === 'employee') {
      const destStock = await Stock.findOne({
        product: transfer.product,
        location: transfer.toLocation,
        isDeleted: false,
      }).session(session);

      const purchasePricePerBaseUnit = destStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = destStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee: transfer.employee, product: transfer.product, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: oldBaseQuantity },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, session }
      );
    } else {
      await Stock.findOneAndUpdate(
        { product: transfer.product, location: transfer.fromLocation },
        { $inc: { quantity: oldBaseQuantity } },
        { session }
      );
    }

    const updatedProduct = product || transfer.product;
    const updatedEmployee = employee || transfer.employee;
    const newQty = quantity || transfer.quantity;
    const newFrom = fromLocation || transfer.fromLocation;
    const newTo = toLocation || transfer.toLocation;

    if (newFrom === 'employee') {
      const empStock = await EmployeeStock.findOne({
        employee: updatedEmployee,
        product: updatedProduct,
      }).session(session);
      if (!empStock || empStock.quantity_in_hand < newQty) {
        throw new AppError('موجودی کافی در انبار کارمند برای بروزرسانی موجود نیست', 400);
      }
      empStock.quantity_in_hand -= newQty;
      await empStock.save({ session });
    } else {
      const srcStock = await Stock.findOne({
        product: updatedProduct,
        location: newFrom,
      }).session(session);
      if (!srcStock || srcStock.quantity < newQty) {
        throw new AppError('موجودی کافی در مکان مبدا موجود نیست', 400);
      }
      srcStock.quantity -= newQty;
      await srcStock.save({ session });
    }

    if (newTo === 'employee') {
      let sourceStock;
      if (newFrom === 'employee') {
        sourceStock = await Stock.findOne({
          product: updatedProduct,
          isDeleted: false,
        }).session(session);
      } else {
        sourceStock = await Stock.findOne({
          product: updatedProduct,
          location: newFrom,
          isDeleted: false,
        }).session(session);
      }

      const purchasePricePerBaseUnit = sourceStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = sourceStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee: updatedEmployee, product: updatedProduct, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: newQty },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, session }
      );
    } else {
      const existingToStock = await Stock.findOne({
        product: updatedProduct,
        location: newTo,
        isDeleted: false,
      }).session(session);

      if (existingToStock) {
        existingToStock.quantity += newQty;
        await existingToStock.save({ session });
      } else {
        let sourceStock;
        if (newFrom === 'employee') {
          sourceStock = await Stock.findOne({
            product: updatedProduct,
            isDeleted: false,
          }).session(session);
        } else {
          sourceStock = await Stock.findOne({
            product: updatedProduct,
            location: newFrom,
            isDeleted: false,
          }).session(session);
        }

        if (sourceStock) {
          await Stock.create(
            [
              {
                product: sourceStock.product,
                unit: sourceStock.unit,
                batchNumber: sourceStock.batchNumber,
                purchasePricePerBaseUnit: sourceStock.purchasePricePerBaseUnit,
                expiryDate: sourceStock.expiryDate,
                location: newTo,
                quantity: newQty,
              },
            ],
            { session }
          );
        } else {
          if (newFrom === 'employee') {
            const productDoc = await Product.findById(updatedProduct)
              .populate('unit')
              .session(session);
            if (!productDoc) throw new AppError('محصول یافت نشد', 404);
            sourceStock = {
              product: updatedProduct,
              unit: productDoc.unit._id,
              batchNumber: 'DEFAULT',
              purchasePricePerBaseUnit: 0,
              expiryDate: null,
            };
            await Stock.create(
              [
                {
                  product: sourceStock.product,
                  unit: sourceStock.unit,
                  batchNumber: sourceStock.batchNumber,
                  purchasePricePerBaseUnit:
                    sourceStock.purchasePricePerBaseUnit,
                  expiryDate: sourceStock.expiryDate,
                  location: newTo,
                  quantity: newQty,
                },
              ],
              { session }
            );
          } else {
            await Stock.findOneAndUpdate(
              { product: updatedProduct, location: newTo },
              { $inc: { quantity: newQty } },
              { upsert: true, session }
            );
          }
        }
      }
    }

    transfer.product = updatedProduct;
    transfer.employee = updatedEmployee;
    transfer.fromLocation = newFrom;
    transfer.toLocation = newTo;
    transfer.quantity = newQty;
    transfer.notes = notes || transfer.notes;
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'StockTransfer',
          recordId: transfer._id,
          operation: 'UPDATE',
          oldData,
          newData: transfer.toObject(),
          reason: reason || 'انتقال موجودی بروزرسانی شد',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'انتقال موجودی با موفقیت بروزرسانی شد',
      transfer,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'بروزرسانی انتقال موجودی ناموفق بود', 500);
  }
});

exports.softDeleteStockTransfer = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('unit', 'conversion_to_base')
      .session(session);
    if (!transfer || transfer.isDeleted)
      throw new AppError('انتقال موجودی یافت نشد', 404);

    const oldData = { ...transfer.toObject() };
    const baseQuantity = transfer.quantity * (transfer.unit?.conversion_to_base || 1);

    if (transfer.toLocation === 'employee') {
      let empStock = await EmployeeStock.findOne({
        employee: transfer.employee,
        product: transfer.product,
        batchNumber: transfer.batchNumber || 'DEFAULT',
      }).session(session);

      if (!empStock) {
        empStock = await EmployeeStock.findOne({
          employee: transfer.employee,
          product: transfer.product,
        }).session(session);
      }

      if (!empStock || empStock.quantity_in_hand < baseQuantity) {
        throw new AppError(
          'موجودی کافی در انبار کارمند برای حذف انتقال موجود نیست',
          400
        );
      }
      empStock.quantity_in_hand -= baseQuantity;
      await empStock.save({ session });
    } else {
      const destStock = await Stock.findOne({
        product: transfer.product,
        location: transfer.toLocation,
      }).session(session);

      if (!destStock || destStock.quantity < baseQuantity) {
        throw new AppError(
          'موجودی کافی در مقصد برای حذف انتقال موجود نیست',
          400
        );
      }
      destStock.quantity -= baseQuantity;
      await destStock.save({ session });
    }

    if (transfer.fromLocation === 'employee') {
      const destStock = await Stock.findOne({
        product: transfer.product,
        location: transfer.toLocation,
        isDeleted: false,
      }).session(session);

      const purchasePricePerBaseUnit = destStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = destStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee: transfer.employee, product: transfer.product, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: baseQuantity },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, session }
      );
    } else {
      await Stock.findOneAndUpdate(
        { product: transfer.product, location: transfer.fromLocation },
        { $inc: { quantity: baseQuantity } },
        { upsert: true, session }
      );
    }

    transfer.isDeleted = true;
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'StockTransfer',
          recordId: transfer._id,
          operation: 'DELETE',
          oldData,
          newData: null,
          reason: req.body.reason || 'انتقال موجودی حذف شد',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'انتقال موجودی با موفقیت حذف شد',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'حذف انتقال موجودی ناموفق بود', 500);
  }
});

exports.restoreStockTransfer = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('unit', 'conversion_to_base')
      .session(session);
    if (!transfer || !transfer.isDeleted)
      throw new AppError('انتقال موجودی یافت نشد یا حذف نشده است', 404);

    const oldData = { ...transfer.toObject() };
    const { product, fromLocation, toLocation, quantity, employee } = transfer;
    const baseQuantity = quantity * (transfer.unit?.conversion_to_base || 1);

    if (fromLocation === 'employee') {
      const empStock = await EmployeeStock.findOne({
        employee,
        product,
      }).session(session);

      if (!empStock || empStock.quantity_in_hand < baseQuantity) {
        throw new AppError(
          'موجودی کافی در انبار کارمند برای بازیابی انتقال موجود نیست',
          400
        );
      }

      empStock.quantity_in_hand -= baseQuantity;
      await empStock.save({ session });
    } else {
      const sourceStock = await Stock.findOne({
        product,
        location: fromLocation,
      }).session(session);

      if (!sourceStock || sourceStock.quantity < baseQuantity) {
        throw new AppError(
          'موجودی کافی در مبدا برای بازیابی انتقال موجود نیست',
          400
        );
      }

      sourceStock.quantity -= baseQuantity;
      await sourceStock.save({ session });
    }

    if (toLocation === 'employee') {
      const sourceStock = await Stock.findOne({
        product,
        location: fromLocation,
        isDeleted: false,
      }).session(session);

      const purchasePricePerBaseUnit = sourceStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = sourceStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee, product, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: baseQuantity },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, session }
      );
    } else {
      const existingToStock = await Stock.findOne({
        product,
        location: toLocation,
        isDeleted: false,
      }).session(session);

      if (existingToStock) {
        existingToStock.quantity += baseQuantity;
        await existingToStock.save({ session });
      } else {
        const sourceStock = await Stock.findOne({
          product,
          location: fromLocation,
          isDeleted: false,
        }).session(session);

        if (sourceStock) {
          await Stock.create(
            [
              {
                product: sourceStock.product,
                unit: sourceStock.unit,
                batchNumber: sourceStock.batchNumber,
                purchasePricePerBaseUnit: sourceStock.purchasePricePerBaseUnit,
                expiryDate: sourceStock.expiryDate,
                location: toLocation,
                quantity: baseQuantity,
              },
            ],
            { session }
          );
        } else {
          await Stock.findOneAndUpdate(
            { product, location: toLocation },
            { $inc: { quantity: baseQuantity } },
            { upsert: true, session }
          );
        }
      }
    }

    transfer.isDeleted = false;
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'StockTransfer',
          recordId: transfer._id,
          operation: 'UPDATE',
          oldData: null,
          newData: transfer.toObject(),
          reason: 'انتقال موجودی بازیابی شد',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'انتقال موجودی با موفقیت بازیابی شد',
      transfer,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'بازیابی انتقال موجودی ناموفق بود', 500);
  }
});

exports.rollbackStockTransfer = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('unit', 'conversion_to_base')
      .session(session);
    if (!transfer || transfer.isDeleted)
      throw new AppError('انتقال یافت نشد', 404);

    const { product, fromLocation, toLocation, quantity, employee } = transfer;
    const baseQuantity = quantity * (transfer.unit?.conversion_to_base || 1);

    if (toLocation === 'employee') {
      const empStock = await EmployeeStock.findOne({
        employee,
        product,
        isDeleted: false,
      }).session(session);

      if (!empStock || empStock.quantity_in_hand < baseQuantity) {
        throw new AppError(
          'امکان برگشت وجود ندارد - موجودی کافی در انبار کارمند موجود نیست',
          400
        );
      }

      empStock.quantity_in_hand -= baseQuantity;
      await empStock.save({ session });
    } else {
      const toStock = await Stock.findOne({
        product,
        location: toLocation,
        isDeleted: false,
      }).session(session);

      if (!toStock || toStock.quantity < baseQuantity) {
        throw new AppError(
          `امکان برگشت وجود ندارد - موجودی کافی در ${toLocation} موجود نیست`,
          400
        );
      }

      toStock.quantity -= baseQuantity;
      await toStock.save({ session });
    }

    if (fromLocation === 'employee') {
      const destStock = await Stock.findOne({
        product,
        location: toLocation,
        isDeleted: false,
      }).session(session);

      const purchasePricePerBaseUnit = destStock?.purchasePricePerBaseUnit || 0;
      const batchNumber = destStock?.batchNumber || 'DEFAULT';

      await EmployeeStock.findOneAndUpdate(
        { employee, product, batchNumber, isDeleted: false },
        { 
          $inc: { quantity_in_hand: baseQuantity },
          $set: { 
            purchasePricePerBaseUnit: purchasePricePerBaseUnit,
            batchNumber: batchNumber
          }
        },
        { upsert: true, session }
      );
    } else {
      const existingFromStock = await Stock.findOne({
        product,
        location: fromLocation,
        isDeleted: false,
      }).session(session);

      if (existingFromStock) {
        existingFromStock.quantity += baseQuantity;
        await existingFromStock.save({ session });
      } else {
        const destStock = await Stock.findOne({
          product,
          location: toLocation,
          isDeleted: false,
        }).session(session);

        if (destStock) {
          await Stock.create(
            [
              {
                product: destStock.product,
                unit: destStock.unit,
                batchNumber: destStock.batchNumber,
                purchasePricePerBaseUnit: destStock.purchasePricePerBaseUnit,
                expiryDate: destStock.expiryDate,
                location: fromLocation,
                quantity: baseQuantity,
              },
            ],
            { session }
          );
        } else {
          await Stock.findOneAndUpdate(
            { product, location: fromLocation, isDeleted: false },
            { $inc: { quantity: baseQuantity } },
            { upsert: true, session }
          );
        }
      }
    }

    transfer.isDeleted = true;
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'StockTransfer',
          recordId: transfer._id,
          operation: 'DELETE',
          oldData: transfer,
          newData: null,
          reason: 'انتقال موجودی برگشت داده شد',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'انتقال موجودی با موفقیت برگشت داده شد',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'برگشت انتقال ناموفق بود', 500);
  }
});
