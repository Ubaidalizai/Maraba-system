const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');

const userRoutes = require('./routes/user.routes');
const companyRoutes = require('./routes/company.routes');
const supplierRoutes = require('./routes/supplier.routes');
const employeeRoutes = require('./routes/employee.routes');
const customerRoutes = require('./routes/customer.routes');
const typeRoutes = require('./routes/type.routes');
const unitRoutes = require('./routes/unit.routes');
const productRoutes = require('./routes/product.routes');
const brandRoutes = require('./routes/brand.routes');
const stockRoutes = require('./routes/stock.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const stockTransferRoutes = require('./routes/stockTransfer.routes');
const saleRoutes = require('./routes/sale.routes');
const accountRoutes = require('./routes/account.routes');
const accountTransactionRoutes = require('./routes/accountTransaction.routes');
const employeeStockRoutes = require('./routes/employeeStock.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const categoryRoutes = require('./routes/category.routes');
const expenseRoutes = require('./routes/expense.routes');
const incomeRoutes = require('./routes/income.routes');
const profitRoutes = require('./routes/profit.routes');

const app = express();

// GLOBAL MIDDLEWARES
// Serving static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  message: 'Too many requests. Please slow down.',
});
app.use('/api', limiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Configure CORS middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/types', typeRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/stock-transfers', stockTransferRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/account-transactions', accountTransactionRoutes);
app.use('/api/v1/employee-stocks', employeeStockRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/income', incomeRoutes);
app.use('/api/v1/profit', profitRoutes);

app.all('*', (req, res) => {
  throw new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
});

app.use(globalErrorHandler);

module.exports = app;
