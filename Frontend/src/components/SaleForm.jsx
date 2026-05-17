import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiTrashAlt } from 'react-icons/bi';
import { CgClose } from 'react-icons/cg';
import { ShoppingCartIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useSubmitLock } from '../hooks/useSubmitLock.js';
import {
  useAccounts,
  useBatchesByProduct,
  useEmployeeStocks,
  useProducts,
  useProductsFromStock,
  useSystemAccounts,
  useUnits,
} from '../services/useApi';
import { formatCurrency, normalizeDateToIso } from '../utilies/helper';
import {
  formatUnitDisplay,
  formatPurchasePriceDisplay,
} from '../utilies/unitHelper';
import JalaliDatePicker from './JalaliDatePicker';
import Select from './Select';
import Table from './Table';
import TableBody from './TableBody';
import TableColumn from './TableColumn';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import { toast } from 'react-toastify';

function SaleForm({
  register,
  handleSubmit,
  watch,
  setValue,
  onClose,
  onSubmit,
  editMode = false,
  saleToEdit = null,
}) {
  const { t } = useTranslation();
  const productHeader = useMemo(
    () => [
      { title: t('saleForm.table.product') },
      { title: t('saleForm.table.qtyWithUnit') },
      // { title: t('saleForm.table.carton') },
      { title: t('saleForm.table.unitPrice') },
      { title: t('saleForm.table.lineTotal') },
      { title: t('saleForm.table.batchNo') },
      { title: t('saleForm.table.expiry') },
      { title: t('saleForm.table.actions') },
    ],
    [t],
  );
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: '',
    unit: '',
    batchNumber: '',
    quantity: null,
    unitPrice: null,
    expiryDate: '',
    cartonCount: null,
  });
  const [saleType, setSaleType] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { isSubmitting, wrapSubmit } = useSubmitLock();
  const saleDateValue = watch('saleDate') || '';

  // Get selected employee from form
  const selectedEmployee = watch('employee');

  // Fetch employee stock if employee is selected
  const { data: employeeStockData } = useEmployeeStocks({
    employeeId: selectedEmployee || null,
  });

  // API hooks
  const { data: stockData, isLoading: productsLoading } = useProductsFromStock(
    'store',
    false,
  ); // false = exclude products with zero quantity
  // People accounts (customers/employees) instead of raw people

  const { data: customerAccResp, isLoading: customersLoading } = useAccounts({
    type: 'customer',
    page: 1,
    limit: 1000,
  });
  const { data: employeeAccResp, isLoading: employeesLoading } = useAccounts({
    type: 'employee',
    page: 1,
    limit: 1000,
  });
  const { data: accountsData, isLoading: accountsLoading } =
    useSystemAccounts();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: productsData } = useProducts();

  // Extract accounts array from the response
  const accounts = accountsData?.accounts || accountsData || [];

  // Find cashier account and set as default
  const cashierAccount = accounts.find(acc => acc.type === 'cashier');
  
  // Set default cashier account when accounts are loaded
  useEffect(() => {
    if (cashierAccount && !watch('placedIn')) {
      setValue('placedIn', cashierAccount._id);
    }
  }, [cashierAccount, setValue, watch]);

  // Extract customer/employee accounts arrays
  const customerAccounts =
    customerAccResp?.accounts || customerAccResp?.data || customerAccResp || [];
  const employeeAccounts =
    employeeAccResp?.accounts || employeeAccResp?.data || employeeAccResp || [];

  // Get unique products from stock data or employee stock data
  const products = React.useMemo(() => {
    // Use employee stock if employee is selected
    const dataSource =
      selectedEmployee && employeeStockData
        ? employeeStockData.data || employeeStockData
        : stockData;

    if (!dataSource || !Array.isArray(dataSource)) return [];

    // Group by product ID to get unique products
    const productMap = new Map();
    dataSource.forEach((stock) => {
      if (stock.product && !productMap.has(stock.product._id)) {
        productMap.set(stock.product._id, {
          value: stock.product._id,
          label: stock.product.name,
        });
      }
    });

    const result = Array.from(productMap.values());
    return result;
  }, [stockData, employeeStockData, selectedEmployee]);

  // Helper function to validate sale price against purchase price
  const validateSalePrice = React.useCallback(
    (productId, unitId, batchNumber, unitPrice) => {
      if (!productId || !unitId || !unitPrice)
        return { isValid: true, purchasePrice: 0 };

      const selectedProduct = productsData?.data?.find(
        (p) => p._id === productId,
      );
      const selectedUnit = units?.data?.find((u) => u._id === unitId);

      if (!selectedProduct || !selectedUnit)
        return { isValid: true, purchasePrice: 0 };

      const dataSource =
        selectedEmployee && employeeStockData
          ? employeeStockData.data || employeeStockData
          : stockData;

      const stockItem = Array.isArray(dataSource)
        ? dataSource.find(
            (s) =>
              s.product?._id === productId &&
              (batchNumber ? s.batchNumber === batchNumber : true),
          )
        : null;

      const purchasePricePerBaseUnit =
        stockItem?.purchasePricePerBaseUnit ||
        selectedProduct?.latestPurchasePrice ||
        0;

      const salePricePerBaseUnit =
        parseFloat(unitPrice) / (selectedUnit.conversion_to_base || 1);

      const isValid =
        purchasePricePerBaseUnit === 0 ||
        salePricePerBaseUnit >= purchasePricePerBaseUnit;

      return {
        isValid,
        purchasePrice: purchasePricePerBaseUnit,
        salePrice: salePricePerBaseUnit,
      };
    },
    [productsData, units, selectedEmployee, employeeStockData, stockData],
  );

  // Get batches for selected product - only fetch when product is selected
  // Use employee location if employee is selected
  const selectedProductId = currentItem?.product;
  const locationForBatches = selectedEmployee ? 'employee' : 'store';
  const { data: batchesData } = useBatchesByProduct(
    selectedProductId,
    locationForBatches,
  );
  const batches = Array.isArray(batchesData) ? batchesData : [];

  // Filter units based on selected product
  const availableUnits = React.useMemo(() => {
    if (!currentItem?.product || !units?.data || !productsData?.data) return [];

    const selectedProduct = productsData.data.find(
      (p) => p._id === currentItem.product,
    );
    if (!selectedProduct) return [];

    const productUnitId =
      selectedProduct.baseUnit?._id || selectedProduct.baseUnit;
    const productUnit = units.data.find((u) => u._id === productUnitId);
    if (!productUnit) return [];

    // If product unit is a derived unit (has base_unit), include its base unit too
    if (productUnit.base_unit) {
      const baseUnitId = productUnit.base_unit._id || productUnit.base_unit;
      const baseUnit = units.data.find((u) => u._id === baseUnitId);
      return baseUnit ? [baseUnit, productUnit] : [productUnit];
    }

    // If product unit is a base unit, return only it
    return [productUnit];
  }, [currentItem?.product, units?.data, productsData?.data]);

  // Auto-select product unit when product changes
  useEffect(() => {
    if (currentItem.product && availableUnits.length > 0) {
      const productUnit = productsData?.data?.find(
        (p) => p._id === currentItem.product,
      );
      const productUnitId = productUnit?.baseUnit?._id || productUnit?.baseUnit;

      if (
        productUnitId &&
        availableUnits.find((u) => u._id === productUnitId)
      ) {
        setCurrentItem((prev) => ({ ...prev, unit: productUnitId }));
      } else if (
        !currentItem.unit ||
        !availableUnits.find((u) => u._id === currentItem.unit)
      ) {
        setCurrentItem((prev) => ({ ...prev, unit: availableUnits[0]._id }));
      }
    }
  }, [currentItem.product, availableUnits, productsData?.data]);

  // Populate form when editing
  useEffect(() => {
    if (editMode && saleToEdit) {
      // Set sale type and customer/employee based on available data
      const customerRefId =
        saleToEdit.customerAccount?.refId ||
        saleToEdit.customer?._id ||
        saleToEdit.customer;
      const employeeRefId =
        saleToEdit.employeeAccount?.refId ||
        saleToEdit.employee?._id ||
        saleToEdit.employee;

      if (customerRefId) {
        setSaleType('customer');
        setValue('customer', customerRefId);
      } else if (employeeRefId) {
        setSaleType('employee');
        setValue('employee', employeeRefId);
      } else {
        setSaleType('walkin');
      }

      // Set items from sale
      if (saleToEdit.items && saleToEdit.items.length > 0) {
        const formattedItems = saleToEdit.items.map((item) => ({
          product: item.product?._id || item.product || '',
          unit: item.unit?._id || item.unit || '',
          batchNumber: item.batchNumber || '',
          expiryDate: item.expiryDate || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          cartonCount: item.cartonCount || null,
        }));
        setItems(formattedItems);
      }

      // Set other fields
      if (saleToEdit.placedIn) {
        setValue('placedIn', saleToEdit.placedIn._id || saleToEdit.placedIn);
      }
      if (saleToEdit.invoiceType) {
        setValue('invoiceType', saleToEdit.invoiceType);
      }
      if (saleToEdit.paidAmount !== undefined) {
        setValue('paidAmount', saleToEdit.paidAmount);
      }
      if (saleToEdit.saleDate) {
        const dateValue =
          typeof saleToEdit.saleDate === 'string' &&
          saleToEdit.saleDate.includes('T')
            ? saleToEdit.saleDate.split('T')[0]
            : saleToEdit.saleDate;
        setValue(
          'saleDate',
          normalizeDateToIso(dateValue) ||
            new Date().toISOString().slice(0, 10),
        );
      }
    }
  }, [editMode, saleToEdit, setValue]);

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const errors = {};
    if (!currentItem.product)
      errors.product = t('saleForm.errors.productRequired');
    if (!currentItem.unit) errors.unit = t('saleForm.errors.unitRequired');
    if (!currentItem.quantity || currentItem.quantity <= 0)
      errors.quantity = t('saleForm.errors.quantityRequired');
    if (!currentItem.unitPrice || currentItem.unitPrice <= 0)
      errors.unitPrice = t('saleForm.errors.priceRequired');

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      product: '',
      unit: '',
      batchNumber: '',
      quantity: '',
      unitPrice: '',
      expiryDate: '',
      cartonCount: '',
    });
  };

  const handleRemove = (index) => {
    removeItem(index);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const itemTotal =
        parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
      return total + itemTotal;
    }, 0);
  };

  const rawPaidAmount = watch('paidAmount');
  const paidAmountValue = Number(rawPaidAmount) || 0;
  const totalAmountValue = calculateTotal();
  const remainingAmount = Math.max(totalAmountValue - paidAmountValue, 0);

  const handleFormSubmit = wrapSubmit(async (data) => {
    // Validate sale type and account selection
    if (saleType === 'customer' && !data.customer) {
      toast.error(t('saleForm.validation.customerRequired'));
      return;
    }
    if (saleType === 'employee' && !data.employee) {
      toast.error(t('saleForm.validation.employeeRequired'));
      return;
    }
    // Validate walk-in sales must be fully paid
    if (saleType === 'walkin') {
      const total = calculateTotal();
      if (data.paidAmount < total) {
        toast.error(t('saleForm.validation.walkinMustBePaid'));
        return;
      }
    }

    // Validate paid amount before submission
    const total = calculateTotal();
    if (data.paidAmount > total) {
      toast.error(
        t('saleForm.validation.paidExceedsTotal', {
          paid: data.paidAmount,
          total: total.toFixed(2),
        }),
      );
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer: saleType === 'customer' ? data.customer : null,
        employee: saleType === 'employee' ? data.employee : null,
        saleDate:
          normalizeDateToIso(data.saleDate) ||
          new Date().toISOString().slice(0, 10),
        description: data.description || undefined,
        items: items
          .filter((item) => item.product && item.quantity > 0)
          .map((item) => ({
            product: item.product,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            cartonCount: item.cartonCount || undefined,
          })),
        paidAmount: data.paidAmount || 0,
        placedIn: data.placedIn || accounts?.[0]?._id,
        invoiceType: data.invoiceType || 'small',
      };

      if (onSubmit) {
        await onSubmit(saleData);
        // Reset form after successful submission (only in create mode)
        if (!editMode) {
          setValue('description', '');
          setItems([]);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  });

  const isSaving = loading || isSubmitting;

  // Show loading state if data is being fetched
  if (
    productsLoading ||
    customersLoading ||
    employeesLoading ||
    accountsLoading ||
    unitsLoading
  ) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>{t('saleForm.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleFormSubmit)}
      className='w-full'
    >
      <div className='space-y-6'>
        {/* Sale Type Selection */}
        <div className='flex items-center gap-4'>
            <label className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
              {t('saleForm.saleType')}
            </label>
          <div className='flex gap-2'>
            {['customer', 'employee', 'walkin'].map((type) => (
              <button
                key={type}
                type='button'
                onClick={() => setSaleType(type)}
                className={`px-4.5 py-1.5 rounded-sm text-sm font-semibold border transition-all ${
                  saleType === type
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                }`}
              >
                {type === 'customer'
                  ? t('saleForm.typeCustomer')
                  : type === 'employee'
                    ? t('saleForm.typeEmployee')
                    : t('saleForm.typeWalkIn')}
              </button>
            ))}
          </div>
        </div>

        <div className='border-t border-gray-200 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5'>
            {/* Customer/Employee Selection */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {saleType === 'customer'
                  ? t('saleForm.typeCustomer')
                  : saleType === 'employee'
                    ? t('saleForm.typeEmployee')
                    : t('saleForm.typeWalkIn')}
                {(saleType === 'customer' || saleType === 'employee') && (
                  <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
                )}
              </label>
              {saleType === 'customer' && (
                <div>
                  <Select
                    label=''
                    options={customerAccounts.map((acc) => ({
                      value: acc.refId,
                      label: acc.name,
                    }))}
                    value={watch('customer')}
                    onChange={(value) => setValue('customer', value)}
                    defaultSelected={t('saleForm.selectCustomerAccount')}
                  />
                </div>
              )}
              {saleType === 'employee' && (
                <div>
                  <Select
                    label=''
                    options={employeeAccounts.map((acc) => ({
                      value: acc.refId,
                      label: acc.name,
                    }))}
                    value={watch('employee')}
                    onChange={(value) => setValue('employee', value)}
                    defaultSelected={t('saleForm.selectEmployeeAccount')}
                  />
                  <p className='text-sm text-gray-500 mt-2'>
                    {t('saleForm.accountCount', {
                      count: employeeAccounts.length,
                    })}
                  </p>
                </div>
              )}
              {saleType === 'walkin' && (
                <div className='w-full px-2 py-1 bg-gray-100 border border-gray-200 rounded-sm text-gray-500 text-center font-medium'>
                  {t('saleForm.walkInHint')}
                </div>
              )}
            </div>

            {/* Invoice Type */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('saleForm.invoiceType')}
              </label>
              <Select
                label=''
                options={[
                  { value: 'small', label: t('saleForm.invoiceSmall') },
                  { value: 'large', label: t('saleForm.invoiceLarge') },
                ]}
                value={watch('invoiceType')}
                onChange={(value) => setValue('invoiceType', value)}
                register={register}
                name='invoiceType'
                defaultSelected={t('saleForm.selectInvoiceType')}
              />
            </div>

            {/* Account Selection */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('saleForm.receiptAccount')}
              </label>
              <Select
                label=''
                options={accounts.map((acc) => ({
                  value: acc._id,
                  label: acc.name,
                }))}
                value={watch('placedIn')}
                onChange={(value) => setValue('placedIn', value)}
                defaultSelected={t('saleForm.selectAccount')}
              />
            </div>

            {/* Paid Amount */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('saleForm.paidAmount')}
              </label>
              <input
                type='number'
                step='1'
                {...register('paidAmount', {
                  valueAsNumber: true,
                  validate: (value) => {
                    const total = calculateTotal();
                    if (value > total) {
                      return t('saleForm.validation.paidExceedsTotalField', {
                        total: total.toFixed(2),
                      });
                    }
                    return true;
                  },
                })}
                onWheel={(e) => e.target.blur()}
                className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 pr-3 pl-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow-md rounded-sm'
                placeholder={t('saleForm.paidPlaceholder')}
                min='0'
                max={calculateTotal()}
              />
            </div>

            {/* Sale Date */}
            <div>
              <JalaliDatePicker
                label={t('saleForm.saleDate')}
                value={saleDateValue}
                onChange={(nextValue) =>
                  setValue(
                    'saleDate',
                    normalizeDateToIso(nextValue) ||
                      new Date().toISOString().slice(0, 10),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  )
                }
                placeholder={t('saleForm.datePlaceholder')}
                clearable={false}
              />
              <input
                type='hidden'
                value={saleDateValue}
                readOnly
                {...register('saleDate', {
                  required: t('saleForm.saleDateRequired'),
                })}
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className='border border-gray-200 rounded-sm'>
          <div className='flex justify-between items-center px-6 py-3 bg-gray-50 border-b border-gray-200'>
            <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
              {t('saleForm.itemsTitle')}
            </h3>
            <button
              type='button'
              onClick={handleAddItem}
              disabled={isSaving}
              className={`px-4 py-2 rounded-sm text-sm font-semibold flex items-center gap-2 transition-all ${
                isSaving
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              <PlusIcon className='h-4 w-4' />
              {isSaving ? t('saleForm.addItemSaving') : t('saleForm.addItem')}
            </button>
          </div>
          <div className='p-6 bg-amber-50/40 border-b border-gray-200'>
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 w-full'>
              <div>
                <Select
                  label={t('saleForm.batchNumber')}
                  id='batch'
                  value={currentItem?.batchNumber || ''}
                  onChange={(value) =>
                    setCurrentItem((s) => ({
                      ...s,
                      batchNumber: value,
                    }))
                  }
                  options={batches.map((batch) => ({
                    value: batch.batchNumber,
                    label: batch.batchNumber,
                  }))}
                  placeholder={t('saleForm.batchPlaceholder')}
                />
              </div>
              <div className='col-span-2'>
                <Select
                  id={'product'}
                  label={
                    <span>
                      {t('saleForm.productName')}{' '}
                      <span className='text-red-500'>
                        {t('saleForm.requiredStar')}
                      </span>
                    </span>
                  }
                  value={currentItem?.product}
                  onChange={(value) => {
                    const selectedProduct = productsData?.data?.find(
                      (p) => p._id === value,
                    );
                    setCurrentItem({
                      ...currentItem,
                      product: value,
                      unit: selectedProduct?.baseUnit?._id || '',
                      batchNumber: '',
                    });
                    setValidationErrors((prev) => ({
                      ...prev,
                      product: undefined,
                    }));
                  }}
                  options={products}
                />
                {validationErrors.product && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.product}
                  </p>
                )}
                {(() => {
                  if (!currentItem?.product) return null;
                  const selectedProduct = productsData?.data?.find(
                    (p) => p._id === currentItem.product,
                  );
                  const dataSource =
                    selectedEmployee && employeeStockData
                      ? employeeStockData.data || employeeStockData
                      : stockData;
                  const stockItem = Array.isArray(dataSource)
                    ? dataSource.find(
                        (s) =>
                          s.product?._id === currentItem.product &&
                          (currentItem.batchNumber
                            ? s.batchNumber === currentItem.batchNumber
                            : true),
                      )
                    : null;
                  const priceDisplay = formatPurchasePriceDisplay(
                    stockItem,
                    selectedProduct,
                  );
                  if (priceDisplay) {
                    return (
                      <p className='text-blue-600 text-xs mt-0.5'>
                        {t('saleForm.purchaseHintPrefix')}
                        {priceDisplay}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('saleForm.unitLabel')}{' '}
                  <span className='text-red-500'>
                    {t('saleForm.requiredStar')}
                  </span>
                </label>
                <select
                  value={currentItem?.unit}
                  onChange={(e) => {
                    setCurrentItem((s) => ({ ...s, unit: e.target.value }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      unit: undefined,
                    }));
                  }}
                  className={`w-full font-custom dark:text-slate-500 bg-transparent text-slate-700 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${
                    validationErrors.unit
                      ? 'border-red-500'
                      : 'border-slate-200'
                  }`}
                  disabled={
                    !currentItem?.product || availableUnits.length === 0
                  }
                >
                  <option value=''>
                    {!currentItem?.product
                      ? t('saleForm.unitPlaceholderNoProduct')
                      : t('saleForm.unitPlaceholderSelect')}
                  </option>
                  {availableUnits.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {validationErrors.unit && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.unit}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('saleForm.quantityLabel')}{' '}
                  <span className='text-red-500'>
                    {t('saleForm.requiredStar')}
                  </span>
                </label>
                <input
                  type='number'
                  placeholder={t('saleForm.quantityPlaceholder')}
                  value={currentItem?.quantity}
                  min='0'
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setCurrentItem((s) => ({ ...s, quantity: e.target.value }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      quantity: undefined,
                    }));
                  }}
                  className={`w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${
                    validationErrors.quantity
                      ? 'border-red-500'
                      : 'border-slate-200'
                  }`}
                />
                {validationErrors.quantity && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.quantity}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('saleForm.priceLabel')}{' '}
                  <span className='text-red-500'>
                    {t('saleForm.requiredStar')}
                  </span>
                </label>
                <input
                  placeholder={t('saleForm.pricePlaceholder')}
                  type='number'
                  step='0.01'
                  min='0'
                  value={currentItem?.unitPrice}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setCurrentItem((s) => ({
                      ...s,
                      unitPrice: e.target.value,
                    }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      unitPrice: undefined,
                    }));
                  }}
                  className={`w-full font-custom bg-transparent placeholder:text-slate-400 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${(() => {
                    if (validationErrors.unitPrice)
                      return 'border-red-500 text-red-600';
                    const validation = validateSalePrice(
                      currentItem?.product,
                      currentItem?.unit,
                      currentItem?.batchNumber,
                      currentItem?.unitPrice,
                    );
                    return validation.isValid
                      ? 'border-slate-200 text-slate-700'
                      : 'border-red-500 focus:border-red-600 text-red-600';
                  })()}`}
                />
                {validationErrors.unitPrice && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.unitPrice}
                  </p>
                )}
                {(() => {
                  const validation = validateSalePrice(
                    currentItem?.product,
                    currentItem?.unit,
                    currentItem?.batchNumber,
                    currentItem?.unitPrice,
                  );
                  if (!validation.isValid && validation.purchasePrice > 0) {
                    return (
                      <p className='text-red-600 text-xs mt-0.5'>
                        {t('saleForm.belowPurchaseWarning')}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              {/* <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('saleForm.carton')}
                </label>
                <input
                  type='number'
                  placeholder={t('saleForm.cartonPlaceholder')}
                  value={currentItem?.cartonCount || ''}
                  min='0'
                  onChange={(e) =>
                    setCurrentItem((s) => ({
                      ...s,
                      cartonCount: e.target.value,
                    }))
                  }
                  className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow'
                />
              </div> */}
              <div>
                <JalaliDatePicker
                  label={t('saleForm.expiryDate')}
                  value={currentItem?.expiryDate}
                  onChange={(date) =>
                    setCurrentItem((s) => ({ ...s, expiryDate: date }))
                  }
                  placeholder={t('saleForm.datePlaceholder')}
                  clearable={true}
                />
              </div>
            </div>
          </div>
          {items?.length > 0 && (
            <div className='overflow-auto px-6 py-4'>
              <Table className='w-full text-xs'>
                <TableHeader headerData={productHeader} />
                <TableBody>
                  {items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableColumn>
                        {products.find((p) => p.value === item.product)
                          ?.label || item.product}
                      </TableColumn>
                      <TableColumn>
                        {formatUnitDisplay(
                          item.quantity,
                          units?.data?.find((u) => u._id === item.unit),
                        )}
                      </TableColumn>
                      {/* <TableColumn>{item.cartonCount || '-'}</TableColumn> */}
                      <TableColumn>
                        {formatCurrency(item.unitPrice)}
                      </TableColumn>
                      <TableColumn>
                        {formatCurrency(
                          (item.quantity || 0) * (item.unitPrice || 0),
                        )}
                      </TableColumn>
                      <TableColumn>{item.batchNumber}</TableColumn>
                      <TableColumn>{item.expiryDate}</TableColumn>
                      <TableColumn>
                        <button
                          type='button'
                          onClick={() => handleRemove(index)}
                          className=' p-1 '
                        >
                          <BiTrashAlt className=' text-warning-orange' />
                        </button>
                      </TableColumn>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Sale Summary and Description */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-1.5'>
              {t('saleForm.notesLabel')}
            </label>
            <textarea
              {...register('description')}
              rows={1}
              className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow rounded-sm resize-none'
              placeholder={t('saleForm.notesPlaceholder')}
            />
          </div>
          <div className='border border-gray-200 rounded-sm overflow-hidden'>
            <div className='grid grid-cols-3 divide-x divide-gray-200'>
              <div className='text-center py-3 px-2'>
                <span className='text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1'>
                  {t('saleForm.summaryFinal')}
                </span>
                <span className='text-xl font-bold text-amber-600'>
                  {totalAmountValue.toFixed(2)}
                </span>
              </div>
              <div className='text-center py-3 px-2'>
                <span className='text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1'>
                  {t('saleForm.summaryPaid')}
                </span>
                <span className='text-xl font-bold text-green-600'>
                  {paidAmountValue.toFixed(2)}
                </span>
              </div>
              <div className='text-center py-3 px-2'>
                <span className='text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1'>
                  {t('saleForm.summaryDue')}
                </span>
                <span
                  className={`text-xl font-bold ${
                    remainingAmount > 0 ? 'text-orange-500' : 'text-green-600'
                  }`}
                >
                  {remainingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='px-6 py-4 border-t border-gray-200 flex justify-end gap-3'>
        <button
          type='button'
          onClick={onClose}
          className='px-5 py-2.5 border border-gray-300 rounded-sm hover:bg-gray-100 font-medium text-gray-700 text-sm transition-colors'
        >
          {t('saleForm.cancel')}
        </button>
        <button
          type='submit'
          className='px-5 py-2.5 bg-amber-600 text-white rounded-sm hover:bg-amber-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={isSaving}
        >
          {isSaving
            ? t('saleForm.submitting')
            : editMode
              ? t('saleForm.submitEdit')
              : t('saleForm.submitNew')}
        </button>
      </div>
    </form>
  );
}

export default SaleForm;
