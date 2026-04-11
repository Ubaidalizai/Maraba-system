const mongoose = require('mongoose');
const Sale = require('../models/sale.model');
const SaleItem = require('../models/saleItem.model');
const SaleReturn = require('../models/saleReturn.model');
const Stock = require('../models/stock.model');
const Product = require('../models/product.model');
const Unit = require('../models/unit.model');
const {
  convertToBaseUnit,
  convertFromBaseUnit,
} = require('../utils/unitConversion');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { createSaleSchema, updateSaleSchema } = require('../validations');
const Account = require('../models/account.model');
const AccountTransaction = require('../models/accountTransaction.model');
const AuditLog = require('../models/auditLog.model');
const EmployeeStock = require('../models/employeeStock.model');
const Customer = require('../models/customer.model');
const { getOrCreateAccount } = require('../utils/accountHelper');

// Helper function to validate account balance
const validateAccountBalance = async (accountId, requiredAmount, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new AppError('Account not found', 404);
  
  if (requiredAmount > 0) {
    // Only validate cashier and safe accounts - they cannot go negative
    if (account.type === 'cashier' || account.type === 'safe') {
      if (account.currentBalance < requiredAmount) {
        throw new AppError(
          `موجودی ناکافی! در حساب ${account.name} موجودی: ${account.currentBalance.toLocaleString()} افغانی، مبلغ مورد نیاز: ${requiredAmount.toLocaleString()} افغانی`,
          400
        );
      }
    }
    // Saraf account can go negative (credit account), so no validation needed
  }
  
  return account;
};

// @desc Create a sale (transactional)
// @route POST /api/v1/sales
exports.createSale = asyncHandler(async (req, res, next) => {
  const { error } = createSaleSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customer,
      employee, // optional: riding man employee id
      saleDate,
      items,
      paidAmount = 0,
      placedIn,
      invoiceType = 'small',
    } = req.body;

    // validate placedIn account
    const account = await Account.findById(placedIn).session(session);
    if (!account)
      throw new AppError('Invalid account for money placement (placedIn)', 400);

    // Prepare customer account (if provided) before creating sale so it participates in the transaction
    let customerAccount = null;
    let customerNameSnapshot = '';
    if (customer) {
      const customerDoc = await Customer.findById(customer).session(session);
      if (!customerDoc) throw new AppError('Invalid customer ID', 400);
      customerNameSnapshot = customerDoc.name;
      customerAccount = await getOrCreateAccount({
        refId: customer,
        type: 'customer',
        name: customerDoc.name,
        session,
      });
    }

    // create skeleton sale first so SaleItem can reference sale._id
    const saleDocs = await Sale.create(
      [
        {
          customer: customer || null,
          customerAccount: customerAccount?._id,
          customerName: customerNameSnapshot || undefined,
          employee: employee || null,
          saleDate: saleDate || Date.now(),
          totalAmount: 0, // will update later
          paidAmount,
          dueAmount: 0, // will update later
          placedIn,
          invoiceType,
          soldBy: req.user?._id || null,
        },
      ],
      { session }
    );
    const saleDoc = saleDocs[0];

    let totalAmount = 0;
    let totalProfit = 0;

    // Process each sale item (deduct stock, compute cost & profit, create saleItem)
    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('baseUnit', 'name')
        .session(session);
      if (!product)
        throw new AppError(`Invalid product ID: ${item.product}`, 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('Invalid unit ID', 400);

      const baseQty = item.quantity * unit.conversion_to_base;
      let remainingQty = baseQty;
      let totalCost = 0;
      let batchesUsed = []; // ← new array to track batch details

      // 🟩 Employee sale
      if (employee) {
        // If user specified batchNumber, use it; otherwise use DEFAULT
        const targetBatch = item.batchNumber || 'DEFAULT';
        
        const empStock = await EmployeeStock.findOne({
          employee,
          product: product._id,
          batchNumber: targetBatch,
        }).session(session);

        if (!empStock || empStock.quantity_in_hand < baseQty) {
          throw new AppError(
            `Employee has insufficient stock for ${product.name} in batch ${targetBatch}`,
            400
          );
        }

        empStock.quantity_in_hand -= baseQty;
        await empStock.save({ session });

        // Use the employee stock's purchase price if available, otherwise fallback to product's latest purchase price
        const costPerUnit = empStock.purchasePricePerBaseUnit || product.latestPurchasePrice || 0;
        totalCost = costPerUnit * baseQty;
        
        batchesUsed.push({
          batchNumber: targetBatch,
          quantityUsed: baseQty,
          costPerUnit: costPerUnit,
        });
      }

      // 🟦 Store sale
      else {
        if (product.trackByBatch) {
          // Case 1: user selected a batch
          if (item.batchNumber) {
            const batchStock = await Stock.findOne({
              product: product._id,
              batchNumber: item.batchNumber,
              location: 'store',
            }).session(session);

            if (!batchStock || batchStock.quantity < remainingQty) {
              throw new AppError(
                `Insufficient stock in batch ${item.batchNumber} for ${product.name}`,
                400
              );
            }

            // Ensure required fields are present (for legacy stock records)
            if (!batchStock.unit) {
              batchStock.unit = product.baseUnit;
            }
            if (
              batchStock.purchasePricePerBaseUnit === undefined ||
              batchStock.purchasePricePerBaseUnit === null
            ) {
              batchStock.purchasePricePerBaseUnit =
                product.latestPurchasePrice || 0;
            }

            batchStock.quantity -= remainingQty;
            await batchStock.save({ session });

            const batchCost =
              batchStock.purchasePricePerBaseUnit * remainingQty;
            totalCost += batchCost;
            batchesUsed.push({
              batchNumber: batchStock.batchNumber,
              quantityUsed: remainingQty,
              costPerUnit: batchStock.purchasePricePerBaseUnit,
            });
            remainingQty = 0;
          } else {
            // Case 2: Auto FEFO/FIFO
            const availableBatches = await Stock.find({
              product: product._id,
              location: 'store',
              quantity: { $gt: 0 },
            })
              .sort({ expiryDate: 1, createdAt: 1 })
              .session(session);

            if (availableBatches.length === 0)
              throw new AppError(`No stock available for ${product.name}`, 400);

            for (const batch of availableBatches) {
              if (remainingQty <= 0) break;
              const deductQty = Math.min(remainingQty, batch.quantity);

              // Ensure required fields are present (for legacy stock records)
              if (!batch.unit) {
                batch.unit = product.baseUnit;
              }
              if (
                batch.purchasePricePerBaseUnit === undefined ||
                batch.purchasePricePerBaseUnit === null
              ) {
                batch.purchasePricePerBaseUnit =
                  product.latestPurchasePrice || 0;
              }

              batch.quantity -= deductQty;
              remainingQty -= deductQty;
              await batch.save({ session });

              totalCost += batch.purchasePricePerBaseUnit * deductQty;
              batchesUsed.push({
                batchNumber: batch.batchNumber,
                quantityUsed: deductQty,
                costPerUnit: batch.purchasePricePerBaseUnit,
              });
            }

            if (remainingQty > 0)
              throw new AppError(
                `Insufficient total stock for ${product.name}`,
                400
              );
          }
        } else {
          // Non-batch products → default batch
          const defaultBatch = await Stock.findOne({
            product: product._id,
            batchNumber: 'DEFAULT',
            location: 'store',
          }).session(session);

          if (!defaultBatch || defaultBatch.quantity < remainingQty)
            throw new AppError(`Insufficient stock for ${product.name}`, 400);

          // Ensure required fields are present (for legacy stock records)
          if (!defaultBatch.unit) {
            defaultBatch.unit = product.baseUnit;
          }
          if (
            defaultBatch.purchasePricePerBaseUnit === undefined ||
            defaultBatch.purchasePricePerBaseUnit === null
          ) {
            defaultBatch.purchasePricePerBaseUnit =
              product.latestPurchasePrice || 0;
          }

          defaultBatch.quantity -= remainingQty;
          await defaultBatch.save({ session });
          totalCost += defaultBatch.purchasePricePerBaseUnit * remainingQty;
          batchesUsed.push({
            batchNumber: 'DEFAULT',
            quantityUsed: remainingQty,
            costPerUnit: defaultBatch.purchasePricePerBaseUnit,
          });
          remainingQty = 0;
        }
      }

      const saleRevenue = item.unitPrice * item.quantity;
      const profit = saleRevenue - totalCost;

      totalAmount += saleRevenue;
      totalProfit += profit;

      await SaleItem.create(
        [
          {
            sale: saleDoc._id,
            product: product._id,
            unit: unit._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: saleRevenue,
            profit,
            costPricePerUnit: totalCost / baseQty,
            batchesUsed,
            batchNumber:
              batchesUsed.length === 1 ? batchesUsed[0].batchNumber : 'MULTI',
            cartonCount: item.cartonCount || undefined,
          },
        ],
        { session }
      );
    } // end for items

    // update sale totals & due
    saleDoc.totalAmount = totalAmount;
    saleDoc.paidAmount = paidAmount;
    saleDoc.dueAmount = totalAmount - paidAmount;
    await saleDoc.save({ session });

    // 3️⃣ ACCOUNT TRANSACTIONS
    // Prepare references for accounts to reuse in payment section
    // Customer debit (if customer provided) — customer owes totalAmount
    if (customer) {
      // we already ensured customerAccount via getOrCreateAccount earlier and stored it on saleDoc
      if (!customerAccount) {
        // As a fallback, try to find or create now
        const customerDoc = await Customer.findById(customer).session(session);
        const tmpName = customerDoc ? customerDoc.name : '';
        customerAccount = await getOrCreateAccount({ refId: customer, type: 'customer', name: tmpName, session });
      }

      await AccountTransaction.create(
        [
          {
            account: customerAccount._id,
            transactionType: 'Sale',
            amount: totalAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `فروش به مشتری ${customerAccount.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      customerAccount.currentBalance += totalAmount;
      await customerAccount.save({ session });
    }

    // Employee debit (if employee provided) — employee owes totalAmount
    let employeeAccountDoc = null;
    if (employee) {
      employeeAccountDoc = await Account.findOne({
        refId: employee,
        type: 'employee',
      }).session(session);
      if (!employeeAccountDoc)
        throw new AppError('Employee account not found', 404);

      await AccountTransaction.create(
        [
          {
            account: employeeAccountDoc._id,
            transactionType: 'Sale',
            amount: totalAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `فروش به کارمند ${employeeAccountDoc.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      employeeAccountDoc.currentBalance += totalAmount;
      await employeeAccountDoc.save({ session });
    }

    // Payment account credit (Dakhal / Tajri / Saraf) - Customer pays you
    if (paidAmount > 0) {
      // Payment increases cashier balance (you receive money)
      await AccountTransaction.create(
        [
          {
            account: account._id,
            transactionType: 'Payment',
            amount: paidAmount,
            referenceType: 'sale',
            referenceId: saleDoc._id,
            description: `پرداخت فروش در ${account.name} - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );

      account.currentBalance += paidAmount;
      await account.save({ session });

      // Payment reduces customer balance (their debt decreases)
      if (customer && customerAccount) {
        await AccountTransaction.create(
          [
            {
              account: customerAccount._id,
              transactionType: 'Payment',
              amount: -paidAmount,
              referenceType: 'sale',
              referenceId: saleDoc._id,
              description: `پرداخت برای فروش - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
              created_by: req.user?._id,
            },
          ],
          { session }
        );

        customerAccount.currentBalance -= paidAmount;
        await customerAccount.save({ session });
      }

      // Payment reduces employee balance (their debt decreases)
      if (employee && employeeAccountDoc) {
        await AccountTransaction.create(
          [
            {
              account: employeeAccountDoc._id,
              transactionType: 'Payment',
              amount: -paidAmount,
              referenceType: 'sale',
              referenceId: saleDoc._id,
              description: `پرداخت برای فروش (کارمند) - بل نمبر: ${saleDoc.billNumber || 'N/A'}`,
              created_by: req.user?._id,
            },
          ],
          { session }
        );

        employeeAccountDoc.currentBalance -= paidAmount;
        await employeeAccountDoc.save({ session });
      }
    }

    // 4️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: saleDoc._id,
          operation: 'INSERT',
          oldData: null,
          newData: { sale: saleDoc, totalProfit },
          reason: 'New sale created',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Respond with sale (populate if desired on client)
    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      sale: saleDoc,
      totalProfit,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    // prefer rethrowing known AppError messages
    throw new AppError(err.message || 'Failed to create sale', 500);
  }
});

/**
 * @desc    Get all sales (pagination + filtering)
 * @route   GET /api/v1/sales
 */
exports.getAllSales = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const {
    customer,
    employee,
    fromDate,
    toDate,
    invoiceType,
    minTotal,
    maxTotal,
    status,
  } = req.query;

  const query = { isDeleted: false };

  // 🧭 Dynamic filters
  if (customer) query.customer = customer;
  if (employee) query.employee = employee;
  if (invoiceType) query.invoiceType = invoiceType;
  if (minTotal || maxTotal) {
    query.totalAmount = {};
    if (minTotal) query.totalAmount.$gte = Number(minTotal);
    if (maxTotal) query.totalAmount.$lte = Number(maxTotal);
  }
  if (fromDate || toDate) {
    query.saleDate = {};
    if (fromDate) query.saleDate.$gte = new Date(fromDate);
    if (toDate) query.saleDate.$lte = new Date(toDate);
  }
  
  // Payment status filter
  if (status === 'paid') {
    query.dueAmount = { $eq: 0 };
  } else if (status === 'partial') {
    query.dueAmount = { $gt: 0 };
  }

  const [sales, total, profitAgg] = await Promise.all([
    Sale.find(query)
      .populate('customerAccount', 'name')
      .populate('employeeAccount', 'name')
      .populate('soldBy', 'name')
      .populate('placedIn', 'name type')
      .skip(skip)
      .limit(limit)
      .sort({ saleDate: -1, createdAt: -1 })
      .lean(),
    Sale.countDocuments(query),
    // 📊 Profit summary for visible page
    SaleItem.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      { $match: query },
      { $group: { _id: null, totalProfit: { $sum: '$profit' } } },
    ]),
  ]);

  const totalProfit = profitAgg[0]?.totalProfit || 0;

  res.status(200).json({
    status: 'success',
    results: sales.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    },
    summary: {
      totalProfit,
      totalSalesAmount: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    },
    data: sales,
  });
});

/**
 * Get single sale and its items
 */
exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('customerAccount', 'name')
    .populate('employeeAccount', 'name')
    .populate('soldBy', 'name email')
    .populate('placedIn', 'name type');
  
  if (!sale) throw new AppError('Sale not found', 404);

  const items = await SaleItem.find({
    sale: sale._id,
    isDeleted: false,
  })
    .populate('product', 'name brand base_unit')
    .populate('unit', 'name conversion_to_base');
  
  // Attach items to sale object for convenience
  const saleObj = sale.toObject();
  saleObj.items = items;
  
  res.status(200).json({
    status: 'success',
    data: saleObj,
  });
});

// @desc Update sale (rollback-safe transaction)
// @route Patch /api/v1/sales/:id
exports.updateSale = asyncHandler(async (req, res, next) => {
  const { error } = updateSaleSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || sale.isDeleted) throw new AppError('Sale not found', 404);

    const oldItems = await SaleItem.find({ sale: sale._id }).session(session);
    const oldSaleSnapshot = {
      sale: { ...sale.toObject() },
      items: oldItems.map((i) => i.toObject()),
    };

    const {
      customer,
      employee,
      saleDate,
      items,
      paidAmount,
      placedIn,
      invoiceType,
      reason,
    } = req.body;

    // 1️⃣ Validate placedIn account (Dakhal/Tajri/Saraf)
    if (placedIn) {
      const acc = await Account.findById(placedIn).session(session);
      if (!acc) throw new AppError('Invalid account for money placement', 400);
      sale.placedIn = placedIn;
    }

    // 2️⃣ Update basic sale fields
    if (saleDate) sale.saleDate = saleDate;
    if (invoiceType) sale.invoiceType = invoiceType;
    if (paidAmount !== undefined) sale.paidAmount = paidAmount;
    if (customer) {
      const customerExists = await Customer.findById(customer).session(session);
      if (!customerExists) throw new AppError('Invalid customer ID', 400);
      sale.customer = customer;

      // Ensure account exists for this customer and store reference
      const newCustomerAcc = await getOrCreateAccount({
        refId: customer,
        type: 'customer',
        name: customerExists.name,
        session,
      });
      sale.customerAccount = newCustomerAcc._id;
      sale.customerName = customerExists.name;
    }
    if (employee) sale.employee = employee;

    // 3️⃣ Reverse stock from old sale items
    for (const oldItem of oldItems) {
      const unit = await Unit.findById(oldItem.unit).session(session);
      const baseQty = oldItem.quantity * unit.conversion_to_base;
      const stockLoc = sale.employee ? 'employee' : 'store';

      await Stock.findOneAndUpdate(
        { product: oldItem.product, location: stockLoc, isDeleted: false },
        { $inc: { quantity: baseQty } },
        { session }
      );
    }

    // 4️⃣ Remove old sale items
    await SaleItem.deleteMany({ sale: sale._id }).session(session);

    // 5️⃣ Recreate new sale items and adjust stock
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new AppError('Invalid product ID', 400);

      const unit = await Unit.findById(item.unit).session(session);
      if (!unit) throw new AppError('Invalid unit ID', 400);

      const baseQty = item.quantity * unit.conversion_to_base;
      const stockLoc = sale.employee ? 'employee' : 'store';
      const stock = await Stock.findOne({
        product: product._id,
        location: stockLoc,
      }).session(session);

      if (!stock || stock.quantity < baseQty) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
      }

      // Deduct new stock
      stock.quantity -= baseQty;
      await stock.save({ session });

      const saleRevenue = item.unitPrice * item.quantity;
      const cost = product.latestPurchasePrice * baseQty;
      const profit = saleRevenue - cost;

      totalAmount += saleRevenue;
      totalProfit += profit;

      await SaleItem.create(
        [
          {
            sale: sale._id,
            product: product._id,
            unit: unit._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: saleRevenue,
            profit,
          },
        ],
        { session }
      );
    }

    sale.totalAmount = totalAmount;
    sale.dueAmount = totalAmount - sale.paidAmount;

    await sale.save({ session });

    // 6️⃣ Update accounts
    // Customer account (if exists)
    if (sale.customer) {
      const customerAcc = sale.customerAccount
        ? await Account.findById(sale.customerAccount).session(session)
        : await getOrCreateAccount({ refId: sale.customer, type: 'customer', name: sale.customerName || '', session });
      if (!customerAcc) throw new AppError('Customer account not found', 404);

      const saleTxn = await AccountTransaction.findOne({
        referenceType: 'sale',
        referenceId: sale._id,
        account: customerAcc._id,
      }).session(session);

      if (saleTxn) {
        const diff = totalAmount - saleTxn.amount;
        saleTxn.amount = totalAmount;
        await saleTxn.save({ session });
        customerAcc.currentBalance += diff;
        await customerAcc.save({ session });
      }
    }

    // Money placement account
    if (sale.placedIn && paidAmount !== undefined) {
      const payTxn = await AccountTransaction.findOne({
        referenceType: 'sale',
        referenceId: sale._id,
        transactionType: 'Payment',
      }).session(session);

      if (payTxn) {
        const payAcc = await Account.findById(payTxn.account).session(session);
        const diff = paidAmount - payTxn.amount;
        payTxn.amount = paidAmount;
        await payTxn.save({ session });
        payAcc.currentBalance += diff;
        await payAcc.save({ session });
      }
    }

    // 7️⃣ Audit log
    const newItems = await SaleItem.find({ sale: sale._id }).session(session);
    const newSaleSnapshot = {
      sale: { ...sale.toObject() },
      items: newItems.map((i) => i.toObject()),
    };

    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'UPDATE',
          oldData: oldSaleSnapshot,
          newData: newSaleSnapshot,
          reason: reason || 'Sale updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Sale updated successfully (rollback-safe)',
      sale,
      totalProfit,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to update sale', 500);
  }
});

// @desc    Soft delete sale (with rollback to stock & accounts)
// @route   DELETE /api/v1/sales/:id
exports.deleteSale = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || sale.isDeleted) throw new AppError('Sale not found', 404);

    const saleItems = await SaleItem.find({ sale: sale._id }).session(session);

    // 1️⃣ Restore stock quantities
    for (const item of saleItems) {
      const unit = await Unit.findById(item.unit).session(session);
      const baseQty = item.quantity * unit.conversion_to_base;
      const stockLoc = sale.employee ? 'employee' : 'store';

      await Stock.findOneAndUpdate(
        { product: item.product, location: stockLoc, isDeleted: false },
        { $inc: { quantity: baseQty } },
        { session }
      );
    }

    // 2️⃣ Reverse account transactions
    const saleTxns = await AccountTransaction.find({
      referenceType: 'sale',
      referenceId: sale._id,
    }).session(session);

    for (const txn of saleTxns) {
      const acc = await Account.findById(txn.account).session(session);
      if (txn.transactionType === 'Payment') {
        acc.currentBalance -= txn.amount; // remove credited payment
      } else if (txn.transactionType === 'Sale') {
        acc.currentBalance -= txn.amount; // remove debit to customer
      }
      await acc.save({ session });
      txn.isDeleted = true;
      await txn.save({ session });
    }

    // 3️⃣ Mark sale + items as deleted
    sale.isDeleted = true;
    await sale.save({ session });

    await SaleItem.updateMany(
      { sale: sale._id },
      { $set: { isDeleted: true } },
      { session }
    );

    // 4️⃣ Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'DELETE',
          oldData: {
            sale: sale.toObject(),
            items: saleItems.map((i) => i.toObject()),
          },
          reason: req.body.reason || 'Sale soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message:
        'Sale soft-deleted successfully. Stock and accounts rolled back.',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to delete sale', 500);
  }
});

// @desc    Restore soft-deleted sale
// @route   PATCH /api/v1/sales/:id/restore
exports.restoreSale = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || !sale.isDeleted)
      throw new AppError('Sale not found or not deleted', 404);

    const saleItems = await SaleItem.find({ sale: sale._id }).session(session);

    // 1️⃣ Deduct stock again
    for (const item of saleItems) {
      const unit = await Unit.findById(item.unit).session(session);
      const baseQty = item.quantity * unit.conversion_to_base;
      
      if (sale.employee) {
        // For employee sales, deduct from employee stock (with batch tracking)
        const targetBatch = item.batchNumber || 'DEFAULT';
        const empStock = await EmployeeStock.findOne({
          employee: sale.employee,
          product: item.product,
          batchNumber: targetBatch,
        }).session(session);
        
        if (!empStock || empStock.quantity_in_hand < baseQty) {
          throw new AppError(
            `Insufficient employee stock to restore sale for product ${item.product} in batch ${targetBatch}`,
            400
          );
        }

        empStock.quantity_in_hand -= baseQty;
        await empStock.save({ session });
      } else {
        // For store sales, deduct from store stock
        const stock = await Stock.findOne({
          product: item.product,
          location: 'store',
          batchNumber: item.batchNumber || 'DEFAULT',
        }).session(session);
        
        if (!stock || stock.quantity < baseQty) {
          throw new AppError(
            `Insufficient stock to restore sale for ${item.product}`,
            400
          );
        }

        stock.quantity -= baseQty;
        await stock.save({ session });
      }
    }

    // 2️⃣ Recreate account transactions
    const saleAcc = sale.customerAccount
      ? await Account.findById(sale.customerAccount).session(session)
      : sale.customer
      ? await Account.findOne({ refId: sale.customer, type: 'customer' }).session(session)
      : null;

    if (saleAcc) {
      await AccountTransaction.create(
        [
          {
            account: saleAcc._id,
            referenceType: 'sale',
            referenceId: sale._id,
            amount: sale.totalAmount,
            transactionType: 'Sale',
            description: 'Customer sale debit restored',
            created_by: req.user?._id,
          },
        ],
        { session }
      );
      saleAcc.currentBalance += sale.totalAmount;
      await saleAcc.save({ session });
    }

    if (sale.placedIn && sale.paidAmount > 0) {
      const acc = await Account.findById(sale.placedIn).session(session);
      await AccountTransaction.create(
        [
          {
            account: acc._id,
            referenceType: 'sale',
            referenceId: sale._id,
            amount: sale.paidAmount,
            transactionType: 'Payment',
            description: `Sale payment restored to ${acc.name}`,
            created_by: req.user?._id,
          },
        ],
        { session }
      );
      acc.currentBalance += sale.paidAmount;
      await acc.save({ session });
    }

    // 3️⃣ Mark sale and items active again
    sale.isDeleted = false;
    await sale.save({ session });

    await SaleItem.updateMany(
      { sale: sale._id },
      { $set: { isDeleted: false } },
      { session }
    );

    // 4️⃣ Audit log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'RESTORE',
          newData: {
            sale: sale.toObject(),
            items: saleItems.map((i) => i.toObject()),
          },
          reason: req.body.reason || 'Sale restored',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Sale restored successfully and transactions reapplied.',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to restore sale', 500);
  }
});

// @desc    Return a sold item (with stock & account adjustments)
// @route   POST /api/v1/sale-returns
exports.returnSaleItem = asyncHandler(async (req, res, next) => {
  const {
    saleId,
    productId,
    unitId,
    quantity,
    refundAmount,
    reason,
    batchNumber,
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale || sale.isDeleted) throw new AppError('Sale not found', 404);

    const unit = await Unit.findById(unitId).session(session);
    if (!unit) throw new AppError('Invalid unit ID', 400);
    const baseQty = quantity * unit.conversion_to_base;

    const item = await SaleItem.findOne({
      sale: saleId,
      product: productId,
    }).session(session);
    if (!item || item.quantity < quantity)
      throw new AppError('Invalid return quantity', 400);

    const oldItemSnapshot = { ...item.toObject() };
    const oldSaleSnapshot = { ...sale.toObject() };

    // 🧮 Update sold item
    // Calculate the cost for the returned quantity
    const returnedCost = (item.costPricePerUnit || 0) * quantity;

    // Update quantity, totalPrice, and profit
    item.quantity -= quantity;
    item.totalPrice -= refundAmount;
    item.profit -= refundAmount - returnedCost; // Reduce profit by (revenue - cost)

    // If quantity becomes 0 or less, soft delete the item
    if (item.quantity <= 0) {
      item.isDeleted = true;
      item.quantity = 0; // Set to 0 to avoid validation error
      item.totalPrice = 0;
      item.profit = 0;
    }

    await item.save({ session });

    // ♻️ Restore stock depending on sale type
    if (sale.employee) {
      // Riding man sale → return to his employee stock
      // Get the product to fetch latest purchase price
      const product = await Product.findById(productId).session(session);
      if (!product) throw new AppError('Product not found', 404);
      
      // Determine target batch (use item's batchNumber or DEFAULT)
      const targetBatch = item.batchNumber || 'DEFAULT';
      
      await EmployeeStock.findOneAndUpdate(
        { employee: sale.employee, product: productId, batchNumber: targetBatch },
        { 
          $inc: { quantity_in_hand: baseQty },
          $setOnInsert: {
            purchasePricePerBaseUnit: item.costPricePerUnit || product.latestPurchasePrice || 0,
            batchNumber: targetBatch,
          }
        },
        { upsert: true, session }
      );
    } else {
      // Decide the target batch to restore to:
      // 1) Prefer explicit batchNumber from request
      // 2) Else use original item's batchNumber (unless MULTI → require explicit)
      let targetBatch = batchNumber;
      if (!targetBatch) {
        const originalBatch = item.batchNumber || 'DEFAULT';
        if (originalBatch === 'MULTI') {
          throw new AppError(
            'Batch number is required to return items sold from multiple batches',
            400
          );
        }
        targetBatch = originalBatch;
      }

      // Normalize DEFAULT spelling
      if (!targetBatch) targetBatch = 'DEFAULT';

      // Return strictly to the chosen batch (no FEFO fallback)
      const existingStock = await Stock.findOne({
        product: productId,
        batchNumber: targetBatch,
        location: 'store',
      }).session(session);

      if (existingStock) {
        existingStock.quantity += baseQty;
        await existingStock.save({ session });
      } else {
        // Need to create new stock with all required fields
        const product = await Product.findById(productId).session(session);
        if (!product) throw new AppError('Product not found', 404);

        await Stock.create(
          [
            {
              product: productId,
              unit: product.baseUnit,
              batchNumber: targetBatch,
              location: 'store',
              quantity: baseQty,
              purchasePricePerBaseUnit: product.latestPurchasePrice || 0,
            },
          ],
          { session }
        );
      }

      // Ensure the SaleReturn we record carries the actual targetBatch
      if (!batchNumber) {
        req.body.batchNumber = targetBatch;
      }
    }

    // 🧾 Record return
    const saleReturn = await SaleReturn.create(
      [
        {
          sale: saleId,
          product: productId,
          unit: unitId,
          batchNumber: (req.body.batchNumber ?? batchNumber) || null,
          quantity,
          refundAmount,
          reason,
          handledBy: req.user._id,
        },
      ],
      { session }
    );

    // 💰 Adjust sale totals
    sale.totalAmount -= refundAmount;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    const newItemSnapshot = { ...item.toObject() };
    const newSaleSnapshot = { ...sale.toObject() };

    // 🧠 Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn[0]._id,
          operation: 'INSERT',
          oldData: {
            sale: oldSaleSnapshot,
            item: oldItemSnapshot,
          },
          newData: {
            sale: newSaleSnapshot,
            returnedItem: saleReturn[0],
          },
          reason: reason || 'Product returned by customer',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Product returned successfully',
      saleReturn: saleReturn[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to process sale return', 500);
  }
});

// @desc    Get all sale returns (paginated)
// @route   GET /api/v1/sale-returns
exports.getAllSaleReturns = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };

  const [returns, total] = await Promise.all([
    SaleReturn.find(query)
      .populate('sale', 'saleDate totalAmount paidAmount dueAmount')
      .populate('product', 'name')
      .populate('unit', 'name')
      .populate('handledBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    SaleReturn.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    results: returns.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    },
    data: returns,
  });
});

// @desc    Get single sale return details
// @route   GET /api/v1/sale-returns/:id
exports.getSaleReturn = asyncHandler(async (req, res, next) => {
  const saleReturn = await SaleReturn.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('sale', 'saleDate totalAmount paidAmount dueAmount')
    .populate('product', 'name')
    .populate('unit', 'name conversion_to_base')
    .populate('handledBy', 'name email');

  if (!saleReturn) throw new AppError('Sale return not found', 404);

  res.status(200).json({
    success: true,
    data: saleReturn,
  });
});

// @desc    Update a sale return (rollback-safe)
// @route   PATCH /api/v1/sale-returns/:id
exports.updateSaleReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const returnId = req.params.id;
    const { quantity, refundAmount, reason, batchNumber, unitId } = req.body;

    const saleReturn = await SaleReturn.findById(returnId).session(session);
    if (!saleReturn || saleReturn.isDeleted)
      throw new AppError('Sale return not found', 404);

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted)
      throw new AppError('Parent sale not found', 404);

    const oldReturnSnapshot = { ...saleReturn.toObject() };

    // 🔄 First, restore the sale item to its state before the old return
    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);

    if (saleItem) {
      // Calculate the cost and profit for the old return
      const oldReturnedCost =
        (saleItem.costPricePerUnit || 0) * saleReturn.quantity;
      const oldReturnedProfit = saleReturn.refundAmount - oldReturnedCost;

      // Restore to state before old return
      saleItem.quantity += saleReturn.quantity;
      saleItem.totalPrice += saleReturn.refundAmount;
      saleItem.profit += oldReturnedProfit;
    }

    // 🔁 Revert previous stock adjustment
    const prevUnit = await Unit.findById(saleReturn.unit).session(session);
    const prevBaseQty = saleReturn.quantity * prevUnit.conversion_to_base;

    if (sale.employee) {
      await EmployeeStock.findOneAndUpdate(
        { employee: sale.employee, product: saleReturn.product },
        { $inc: { quantity_in_hand: -prevBaseQty } },
        { session }
      );
    } else {
      const prevBatchQuery = saleReturn.batchNumber
        ? {
            product: saleReturn.product,
            batchNumber: saleReturn.batchNumber,
            location: 'store',
          }
        : { product: saleReturn.product, location: 'store' };

      const prevStock = await Stock.findOne(prevBatchQuery).session(session);
      if (prevStock) {
        prevStock.quantity -= prevBaseQty;
        if (prevStock.quantity < 0) prevStock.quantity = 0;
        await prevStock.save({ session });
      }
    }

    // 🔁 Reverse sale totals
    sale.totalAmount += saleReturn.refundAmount;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    // 🆕 Apply new return values
    const newQuantity = quantity ?? saleReturn.quantity;
    const newRefund = refundAmount ?? saleReturn.refundAmount;
    const newBatch = batchNumber ?? saleReturn.batchNumber;
    const newUnit = unitId ?? saleReturn.unit;

    const unitDoc = await Unit.findById(newUnit).session(session);
    if (!unitDoc) throw new AppError('Invalid unit ID', 400);
    const newBaseQty = newQuantity * unitDoc.conversion_to_base;

    // ➕ Restore stock for new values
    if (sale.employee) {
      await EmployeeStock.findOneAndUpdate(
        { employee: sale.employee, product: saleReturn.product },
        { $inc: { quantity_in_hand: newBaseQty } },
        { upsert: true, session }
      );
    } else {
      const stockQuery = newBatch
        ? {
            product: saleReturn.product,
            batchNumber: newBatch,
            location: 'store',
          }
        : { product: saleReturn.product, location: 'store' };

      const stock = await Stock.findOne(stockQuery).session(session);
      if (stock) {
        stock.quantity += newBaseQty;
        await stock.save({ session });
      } else {
        // Fetch product to get baseUnit and latestPurchasePrice
        const product = await Product.findById(saleReturn.product).session(
          session
        );
        if (!product) throw new AppError('Product not found', 404);

        await Stock.create(
          [
            {
              product: saleReturn.product,
              unit: product.baseUnit,
              batchNumber: newBatch || 'DEFAULT',
              location: 'store',
              quantity: newBaseQty,
              purchasePricePerBaseUnit: product.latestPurchasePrice || 0,
            },
          ],
          { session }
        );
      }
    }

    // 🔢 Update sale totals again
    sale.totalAmount -= newRefund;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    // 🔄 Apply new return to the sale item
    if (saleItem) {
      // Calculate the cost and profit for the new return
      const newReturnedCost = (saleItem.costPricePerUnit || 0) * newQuantity;
      const newReturnedProfit = newRefund - newReturnedCost;

      // Apply new return values
      saleItem.quantity -= newQuantity;
      saleItem.totalPrice -= newRefund;
      saleItem.profit -= newReturnedProfit;

      // If quantity becomes 0 or less, soft delete the item
      if (saleItem.quantity <= 0) {
        saleItem.isDeleted = true;
        saleItem.quantity = 0;
        saleItem.totalPrice = 0;
        saleItem.profit = 0;
      }

      await saleItem.save({ session });
    }

    // 📝 Update return record
    Object.assign(saleReturn, {
      quantity: newQuantity,
      refundAmount: newRefund,
      reason: reason ?? saleReturn.reason,
      batchNumber: newBatch,
      unit: newUnit,
    });
    await saleReturn.save({ session });

    // 🧾 Audit log
    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'UPDATE',
          oldData: oldReturnSnapshot,
          newData: saleReturn.toObject(),
          reason: reason || 'Sale return updated',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Sale return updated successfully',
      saleReturn,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to update sale return', 500);
  }
});

// @desc    Soft delete a sale return (rollback-safe)
// @route   DELETE /api/v1/sale-returns/:id
exports.deleteSaleReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await SaleReturn.findById(req.params.id).session(
      session
    );
    if (!saleReturn || saleReturn.isDeleted)
      throw new AppError('Sale return not found', 404);

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted)
      throw new AppError('Parent sale not found', 404);

    const oldReturnSnapshot = { ...saleReturn.toObject() };

    const unit = await Unit.findById(saleReturn.unit).session(session);
    const baseQty = saleReturn.quantity * unit.conversion_to_base;

    // 🔄 Restore the sale item (quantity, totalPrice, profit)
    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);

    if (saleItem) {
      // Calculate the cost for the returned quantity
      const returnedCost =
        (saleItem.costPricePerUnit || 0) * saleReturn.quantity;
      const returnedProfit = saleReturn.refundAmount - returnedCost;

      // Restore the item to its original state before the return
      saleItem.quantity += saleReturn.quantity;
      saleItem.totalPrice += saleReturn.refundAmount;
      saleItem.profit += returnedProfit;

      // If item was soft-deleted (quantity was 0), restore it
      if (saleItem.isDeleted && saleItem.quantity > 0) {
        saleItem.isDeleted = false;
      }

      await saleItem.save({ session });
    }

    // 🔁 Reverse stock added on return creation
    if (sale.employee) {
      await EmployeeStock.findOneAndUpdate(
        { employee: sale.employee, product: saleReturn.product },
        { $inc: { quantity_in_hand: -baseQty } },
        { session }
      );
    } else {
      const stockQuery = saleReturn.batchNumber
        ? {
            product: saleReturn.product,
            batchNumber: saleReturn.batchNumber,
            location: 'store',
          }
        : { product: saleReturn.product, location: 'store' };

      const stock = await Stock.findOne(stockQuery).session(session);
      if (stock) {
        stock.quantity -= baseQty;
        if (stock.quantity < 0) stock.quantity = 0;
        await stock.save({ session });
      }
    }

    // 🔁 Reverse sale totals
    sale.totalAmount += saleReturn.refundAmount;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    // 🗑️ Soft delete return
    saleReturn.isDeleted = true;
    await saleReturn.save({ session });

    // 🧾 Audit
    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'DELETE',
          oldData: oldReturnSnapshot,
          reason: req.body.reason || 'Sale return soft deleted',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Sale return soft deleted successfully',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to delete sale return', 500);
  }
});

// @desc Restore soft-deleted sale return (rollback-safe)
exports.restoreSaleReturn = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const saleReturn = await SaleReturn.findById(req.params.id).session(
      session
    );
    if (!saleReturn || !saleReturn.isDeleted)
      throw new AppError('Sale return not found or not deleted', 404);

    const sale = await Sale.findById(saleReturn.sale).session(session);
    if (!sale || sale.isDeleted)
      throw new AppError('Parent sale not found', 404);

    const unit = await Unit.findById(saleReturn.unit).session(session);
    const baseQty = saleReturn.quantity * unit.conversion_to_base;

    // 🔄 Re-apply the return to the sale item (reduce quantity, totalPrice, profit)
    const saleItem = await SaleItem.findOne({
      sale: saleReturn.sale,
      product: saleReturn.product,
    }).session(session);

    if (saleItem) {
      // Calculate the cost and profit for the return
      const returnedCost = saleItem.costPricePerUnit * saleReturn.quantity;
      const returnedProfit = saleReturn.refundAmount - returnedCost;

      // Re-apply the return
      saleItem.quantity -= saleReturn.quantity;
      saleItem.totalPrice -= saleReturn.refundAmount;
      saleItem.profit -= returnedProfit;
      await saleItem.save({ session });
    }

    // Re-apply stock restore
    if (sale.employee) {
      await EmployeeStock.findOneAndUpdate(
        { employee: sale.employee, product: saleReturn.product },
        { $inc: { quantity_in_hand: baseQty } },
        { upsert: true, session }
      );
    } else {
      const existingStock = await Stock.findOne({
        product: saleReturn.product,
        batchNumber: saleReturn.batchNumber,
        location: 'store',
      }).session(session);

      if (existingStock) {
        existingStock.quantity += baseQty;
        await existingStock.save({ session });
      } else {
        // Need to create new stock with all required fields
        const product = await Product.findById(saleReturn.product).session(
          session
        );
        if (!product) throw new AppError('Product not found', 404);

        await Stock.create(
          [
            {
              product: saleReturn.product,
              unit: product.baseUnit,
              batchNumber: saleReturn.batchNumber || 'DEFAULT',
              location: 'store',
              quantity: baseQty,
              purchasePricePerBaseUnit: product.latestPurchasePrice || 0,
            },
          ],
          { session }
        );
      }
    }

    sale.totalAmount -= saleReturn.refundAmount;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    saleReturn.isDeleted = false;
    await saleReturn.save({ session });

    await AuditLog.create(
      [
        {
          tableName: 'SaleReturn',
          recordId: saleReturn._id,
          operation: 'RESTORE',
          oldData: null,
          newData: saleReturn.toObject(),
          reason: 'Sale return restored',
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Sale return restored successfully',
      saleReturn,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to restore sale return', 500);
  }
});

// @desc Record additional payment against a sale
// @route POST /api/v1/sales/:id/payment
exports.recordSalePayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentAccount, description } = req.body;
  const saleId = req.params.id;

  if (!amount || amount <= 0) {
    throw new AppError('Payment amount must be greater than 0', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find the sale
    const sale = await Sale.findById(saleId).session(session);
    if (!sale || sale.isDeleted) {
      throw new AppError('Sale not found', 404);
    }

    // 2️⃣ Calculate remaining due
    const remainingDue = sale.totalAmount - sale.paidAmount;
    
    if (amount > remainingDue) {
      throw new AppError(
        `Payment amount (${amount}) exceeds remaining due (${remainingDue})`,
        400
      );
    }

    // 3️⃣ Find customer account (if sale has customer) - prefer explicit `customerAccount` on sale
    let customerAccount = null;
    if (sale.customer) {
      customerAccount = sale.customerAccount
        ? await Account.findById(sale.customerAccount).session(session)
        : await Account.findOne({ refId: sale.customer, type: 'customer', isDeleted: false }).session(session);

      if (!customerAccount) {
        throw new AppError('Customer account not found', 404);
      }
    }

    // 4️⃣ Validate payment account
    const payAccount = await Account.findById(paymentAccount).session(session);
    if (!payAccount || payAccount.isDeleted) {
      throw new AppError('Payment account not found', 404);
    }

    // 5️⃣ Create payment transactions
    // Increase cashier balance (you receive money)
    await AccountTransaction.create(
      [
        {
          account: payAccount._id,
          transactionType: 'Payment',
          amount: amount,
          referenceType: 'sale',
          referenceId: sale._id,
          created_by: req.user._id,
          description: description || `پرداخت اضافی برای فروش - بل نمبر: ${sale.billNumber || 'N/A'}`,
        },
      ],
      { session }
    );

    payAccount.currentBalance += amount;
    await payAccount.save({ session });

    // Reduce customer balance (their debt decreases)
    if (customerAccount) {
      await AccountTransaction.create(
        [
          {
            account: customerAccount._id,
            transactionType: 'Payment',
            amount: -amount,
            referenceType: 'sale',
            referenceId: sale._id,
            created_by: req.user._id,
            description: description || `پرداخت اضافی برای فروش - بل نمبر: ${sale.billNumber || 'N/A'}`,
          },
        ],
        { session }
      );

      customerAccount.currentBalance -= amount;
      await customerAccount.save({ session });
    }

    // 6️⃣ Update sale paid amount
    sale.paidAmount += amount;
    sale.dueAmount = sale.totalAmount - sale.paidAmount;
    await sale.save({ session });

    // 7️⃣ Audit Log
    await AuditLog.create(
      [
        {
          tableName: 'Sale',
          recordId: sale._id,
          operation: 'UPDATE',
          oldData: { paidAmount: sale.paidAmount - amount },
          newData: { paidAmount: sale.paidAmount },
          reason: description || `Additional payment recorded`,
          changedBy: req.user?.name || 'System',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      sale: {
        _id: sale._id,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        dueAmount: sale.dueAmount,
      },
      paymentAmount: amount,
      apiResponse: {
        customerBalance: customerAccount?.currentBalance,
        cashierBalance: payAccount.currentBalance,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message || 'Failed to record payment', 500);
  }
});

/**
 * @desc    Get sales summary by date range (daily/weekly/monthly)
 * @route   GET /api/v1/sales/reports
 */
exports.getSalesReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day', includeProfit = 'false' } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }

  const matchStage = {
    isDeleted: false,
    saleDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  let groupStage;
  let dateFormat;
  
  switch (groupBy) {
    case 'day':
      groupStage = {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' },
        },
      };
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      groupStage = {
        _id: {
          year: { $year: '$saleDate' },
          week: { $week: '$saleDate' },
        },
      };
      dateFormat = '%Y-W%U';
      break;
    case 'month':
      groupStage = {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
        },
      };
      dateFormat = '%Y-%m';
      break;
    default:
      throw new AppError(
        'Invalid groupBy parameter. Must be day, week, or month',
        400
      );
  }

  // Get sales summary (lightweight)
  const salesSummary = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        ...groupStage,
        totalSales: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalDue: { $sum: '$dueAmount' },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);
  let combinedSummary = salesSummary;

  // Optionally include profit (heavier join) only when requested
  if (includeProfit === 'true') {
    const profitSummary = await SaleItem.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          totalProfit: { $sum: '$profit' },
          totalCost: { $sum: '$cost' },
          totalRevenue: { $sum: '$revenue' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
    ]);

    combinedSummary = salesSummary.map(saleItem => {
      const profitItem = profitSummary.find(
        p => JSON.stringify(p._id) === JSON.stringify(saleItem._id)
      );
      return {
        ...saleItem,
        totalProfit: profitItem?.totalProfit || 0,
        totalCost: profitItem?.totalCost || 0,
        totalRevenue: profitItem?.totalRevenue || 0,
      };
    });
  }

  // Format dates for frontend
  const formattedSummary = combinedSummary.map(item => {
    let dateLabel;
    if (groupBy === 'day') {
      dateLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      dateLabel = `Week ${item._id.week}, ${item._id.year}`;
    } else if (groupBy === 'month') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      dateLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`;
    }
    
    const base = {
      date: dateLabel,
      sales: item.totalSales,
      paid: item.totalPaid,
      due: item.totalDue,
      count: item.salesCount,
    };
    if (includeProfit === 'true') {
      return {
        ...base,
        purchases: item.totalCost || 0,
        profit: item.totalProfit || 0,
      };
    }
    return base;
  });

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      groupBy,
      summary: formattedSummary,
      totals: {
        totalSales: formattedSummary.reduce((sum, item) => sum + item.sales, 0),
        totalProfit: includeProfit === 'true' ? formattedSummary.reduce((sum, item) => sum + (item.profit || 0), 0) : undefined,
        totalPaid: formattedSummary.reduce((sum, item) => sum + item.paid, 0),
        totalDue: formattedSummary.reduce((sum, item) => sum + item.due, 0),
        totalCount: formattedSummary.reduce((sum, item) => sum + item.count, 0),
      },
    },
  });
});
