import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiTrashAlt } from 'react-icons/bi';
import { CgClose } from 'react-icons/cg';
import {
  ShoppingCartIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
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
import { registerNumeric, bindNumericControlled } from '../utilies/numericInput';
import { resolveSaleFromQuery } from '../utilies/saleQuery';
import {
  formatUnitDisplay,
  formatPurchasePriceDisplay,
  getSaleUnitsForProduct,
  minSalePriceForUnit,
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
  isSaving: isSavingProp = false,
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
      { title: t('saleForm.table.actions') },
    ],
    [t],
  );
  const [items, setItems] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [currentItem, setCurrentItem] = useState({
    product: '',
    unit: '',
    batchNumber: '',
    quantity: null,
    unitPrice: null,
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

    if (editMode && saleToEdit?.items?.length) {
      saleToEdit.items.forEach((item) => {
        const id = item.product?._id || item.product;
        const name = item.product?.name;
        if (id && !productMap.has(id)) {
          productMap.set(id, {
            value: id,
            label: name || t('saleForm.unknownProduct'),
          });
        }
      });
    }

    const result = Array.from(productMap.values());
    return result;
  }, [stockData, employeeStockData, selectedEmployee, editMode, saleToEdit, t]);

  // Helper function to validate sale price against purchase price (same unit as price input)
  const validateSalePrice = React.useCallback(
    (productId, unitId, batchNumber, unitPrice) => {
      if (!productId || !unitId || unitPrice === '' || unitPrice == null) {
        return { isValid: true, purchasePrice: 0, minUnitPrice: 0 };
      }

      const selectedProduct = productsData?.data?.find(
        (p) => p._id === productId,
      );
      const selectedUnit = units?.data?.find((u) => u._id === unitId);

      if (!selectedProduct || !selectedUnit) {
        return { isValid: true, purchasePrice: 0, minUnitPrice: 0 };
      }

      const primaryUnitId =
        selectedProduct.baseUnit?._id || selectedProduct.baseUnit;
      const primaryUnit =
        typeof selectedProduct.baseUnit === 'object' &&
        selectedProduct.baseUnit?._id
          ? selectedProduct.baseUnit
          : units?.data?.find((u) => u._id === primaryUnitId);

      if (!primaryUnit) {
        return { isValid: true, purchasePrice: 0, minUnitPrice: 0 };
      }

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

      const purchasePricePerPrimary =
        stockItem?.purchasePricePerBaseUnit ||
        selectedProduct?.latestPurchasePrice ||
        0;

      const minUnitPrice = minSalePriceForUnit(
        purchasePricePerPrimary,
        selectedUnit,
        primaryUnit,
      );

      const salePrice = parseFloat(unitPrice);
      const isValid =
        minUnitPrice === 0 ||
        Number.isNaN(salePrice) ||
        salePrice + 0.009 >= minUnitPrice;

      return {
        isValid,
        purchasePrice: purchasePricePerPrimary,
        minUnitPrice,
        salePrice,
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

    return getSaleUnitsForProduct(selectedProduct, units.data);
  }, [currentItem?.product, units?.data, productsData?.data]);

  // Auto-select product unit when product changes (keep valid unit when editing a line)
  useEffect(() => {
    if (currentItem.product && availableUnits.length > 0) {
      if (
        currentItem.unit &&
        availableUnits.find((u) => u._id === currentItem.unit)
      ) {
        return;
      }

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

  const resolvedSaleToEdit = useMemo(
    () => (saleToEdit ? resolveSaleFromQuery(saleToEdit) : null),
    [saleToEdit],
  );

  const editPaidAmount = Number(resolvedSaleToEdit?.paidAmount) || 0;

  const editPartyDisplayName = useMemo(() => {
    if (!resolvedSaleToEdit) return '—';
    if (saleType === 'customer') {
      return (
        resolvedSaleToEdit.customerName ||
        resolvedSaleToEdit.customerAccount?.name ||
        '—'
      );
    }
    if (saleType === 'employee') {
      return resolvedSaleToEdit.employeeAccount?.name || '—';
    }
    return t('saleForm.typeWalkIn');
  }, [resolvedSaleToEdit, saleType, t]);

  // Populate form when editing
  useEffect(() => {
    if (editMode && resolvedSaleToEdit) {
      const sale = resolvedSaleToEdit;
      // Set sale type and customer/employee based on available data
      const customerRefId =
        sale.customerAccount?.refId ||
        sale.customer?._id ||
        sale.customer;
      const employeeRefId =
        sale.employeeAccount?.refId ||
        sale.employee?._id ||
        sale.employee;

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
      if (sale.items && sale.items.length > 0) {
        const formattedItems = sale.items.map((item) => ({
          product: item.product?._id || item.product || '',
          productName: item.product?.name || '',
          unit: item.unit?._id || item.unit || '',
          batchNumber: item.batchNumber || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          cartonCount: item.cartonCount || null,
        }));
        setItems(formattedItems);
      }

      // Set other fields
      if (sale.placedIn) {
        setValue('placedIn', sale.placedIn._id || sale.placedIn);
      }
      if (sale.invoiceType) {
        setValue('invoiceType', sale.invoiceType);
      }
      if (sale.paidAmount !== undefined) {
        setValue('paidAmount', sale.paidAmount);
      }
      setValue('discountAmount', sale.discountAmount || 0);
      if (sale.saleDate) {
        const dateValue =
          typeof sale.saleDate === 'string' && sale.saleDate.includes('T')
            ? sale.saleDate.split('T')[0]
            : sale.saleDate;
        setValue(
          'saleDate',
          normalizeDateToIso(dateValue) ||
            new Date().toISOString().slice(0, 10),
        );
      }
    }
  }, [editMode, resolvedSaleToEdit, setValue]);

  const emptyCurrentItem = () => ({
    product: '',
    unit: '',
    batchNumber: '',
    quantity: '',
    unitPrice: '',
    cartonCount: '',
  });

  const resolveProductLabel = (item) =>
    item.productName ||
    products.find((p) => p.value === item.product)?.label ||
    productsData?.data?.find((p) => p._id === item.product)?.name ||
    '—';

  const cancelLineEdit = () => {
    setCurrentItem(emptyCurrentItem());
    setEditingItemIndex(null);
    setValidationErrors({});
  };

  const loadItemForEdit = (index) => {
    const item = items[index];
    if (!item) return;

    setCurrentItem({
      product: item.product,
      unit: item.unit,
      batchNumber: item.batchNumber || '',
      quantity: item.quantity ?? '',
      unitPrice: item.unitPrice ?? '',
      cartonCount: item.cartonCount ?? '',
    });
    setEditingItemIndex(index);
    setValidationErrors({});
  };

  const removeItem = (index) => {
    if (editingItemIndex === index) {
      cancelLineEdit();
    } else if (editingItemIndex !== null && editingItemIndex > index) {
      setEditingItemIndex((prev) => prev - 1);
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
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
    const selectedProduct = productsData?.data?.find(
      (p) => p._id === currentItem.product,
    );
    const lineItem = {
      ...currentItem,
      productName:
        selectedProduct?.name || resolveProductLabel(currentItem),
    };

    if (editingItemIndex !== null) {
      setItems((prev) =>
        prev.map((item, index) =>
          index === editingItemIndex ? lineItem : item,
        ),
      );
      cancelLineEdit();
      return;
    }

    setItems((prev) => [...prev, lineItem]);
    setCurrentItem(emptyCurrentItem());
  };

  const handleRemove = (index) => {
    removeItem(index);
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const itemTotal =
        parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
      return total + itemTotal;
    }, 0);
  };

  const rawPaidAmount = watch('paidAmount');
  const rawDiscountAmount = watch('discountAmount');
  const paidAmountValue = editMode
    ? editPaidAmount
    : Number(rawPaidAmount) || 0;
  const subtotalAmountValue = calculateSubtotal();
  const discountAmountValue = Math.max(0, Number(rawDiscountAmount) || 0);
  const totalAmountValue = Math.max(subtotalAmountValue - discountAmountValue, 0);
  const remainingAmount = Math.max(totalAmountValue - paidAmountValue, 0);

  const handleFormSubmit = wrapSubmit(async (data) => {
    // Validate sale type and account selection
    if (!editMode && saleType === 'customer' && !data.customer) {
      toast.error(t('saleForm.validation.customerRequired'));
      return;
    }
    if (!editMode && saleType === 'employee' && !data.employee) {
      toast.error(t('saleForm.validation.employeeRequired'));
      return;
    }
    // Validate walk-in sales must be fully paid (create only)
    if (!editMode && saleType === 'walkin') {
      if (data.paidAmount < totalAmountValue) {
        toast.error(t('saleForm.validation.walkinMustBePaid'));
        return;
      }
    }

    if (discountAmountValue > subtotalAmountValue) {
      toast.error(t('saleForm.validation.discountExceedsSubtotal'));
      return;
    }

    // Validate paid amount before submission (create only)
    if (!editMode && data.paidAmount > totalAmountValue) {
      toast.error(
        t('saleForm.validation.paidExceedsTotal', {
          paid: data.paidAmount,
          total: totalAmountValue.toFixed(2),
        }),
      );
      return;
    }

    const paidAtCreate = editMode ? 0 : Number(data.paidAmount) || 0;
    const needsReceiptAccount =
      !editMode && (saleType === 'walkin' || paidAtCreate > 0);
    if (needsReceiptAccount && !data.placedIn) {
      toast.error(t('saleForm.selectAccount'));
      return;
    }

    setLoading(true);
    try {
      const editCustomerId =
        resolvedSaleToEdit?.customer?._id ||
        resolvedSaleToEdit?.customer ||
        null;
      const editEmployeeId =
        resolvedSaleToEdit?.employee?._id ||
        resolvedSaleToEdit?.employee ||
        null;

      const saleData = {
        customer: editMode
          ? saleType === 'customer'
            ? editCustomerId
            : null
          : saleType === 'customer'
            ? data.customer
            : null,
        employee: editMode
          ? saleType === 'employee'
            ? editEmployeeId
            : null
          : saleType === 'employee'
            ? data.employee
            : null,
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
            batchNumber: item.batchNumber || undefined,
            cartonCount: item.cartonCount || undefined,
          })),
        ...(editMode
          ? {}
          : { paidAmount: data.paidAmount || 0 }),
        discountAmount: discountAmountValue,
        ...(needsReceiptAccount && data.placedIn
          ? { placedIn: data.placedIn }
          : {}),
        invoiceType: data.invoiceType || 'small',
      };

      if (onSubmit) {
        await onSubmit(saleData);
        if (!editMode) {
          setValue('description', '');
          setValue('discountAmount', 0);
          setItems([]);
          setCurrentItem(emptyCurrentItem());
          setEditingItemIndex(null);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  });

  const isSaving = loading || isSubmitting || isSavingProp;

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
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
          <label className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
            {t('saleForm.saleType')}
          </label>
          <div className='flex gap-2'>
            {['customer', 'employee', 'walkin'].map((type) => (
              <button
                key={type}
                type='button'
                disabled={editMode}
                onClick={() => !editMode && setSaleType(type)}
                className={`px-4.5 py-1.5 rounded-sm text-sm font-semibold border transition-all ${
                  saleType === type
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                } ${editMode ? 'opacity-60 cursor-not-allowed hover:border-gray-200 hover:text-gray-600' : ''}`}
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
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5'>
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
              {editMode ? (
                <div className='w-full px-3 py-2 bg-gray-100 border border-slate-200 rounded-sm text-slate-700 text-sm'>
                  {editPartyDisplayName}
                </div>
              ) : (
                <>
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
                </>
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

            {/* Receipt account (required only when paying now) */}
            {!editMode && (
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
            )}

            {/* Paid Amount — create only; extra payments use sales payment modal */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('saleForm.paidAmount')}
              </label>
              {editMode ? (
                <div className='w-full text-slate-700 text-sm border border-slate-200 bg-gray-100 px-3 py-2 rounded-sm'>
                  {formatCurrency(editPaidAmount)}
                </div>
              ) : (
                <input
                  {...registerNumeric(
                    'paidAmount',
                    register,
                    {
                      validate: (value) => {
                        if (value > totalAmountValue) {
                          return t('saleForm.validation.paidExceedsTotalField', {
                            total: totalAmountValue.toFixed(2),
                          });
                        }
                        return true;
                      },
                    },
                    {
                      className:
                        'w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 pr-3 pl-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow-md rounded-sm',
                      placeholder: t('saleForm.paidPlaceholder'),
                    }
                  )}
                />
              )}
            </div>

            {/* Discount */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('saleForm.discountAmount')}
              </label>
              <input
                {...registerNumeric(
                  'discountAmount',
                  register,
                  {
                    validate: (value) => {
                      const discount = Math.max(0, Number(value) || 0);
                      if (discount > subtotalAmountValue) {
                        return t('saleForm.validation.discountExceedsSubtotalField', {
                          subtotal: subtotalAmountValue.toFixed(2),
                        });
                      }
                      return true;
                    },
                  },
                  {
                    className:
                      'w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 pr-3 pl-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow-md rounded-sm',
                    placeholder: t('saleForm.discountPlaceholder'),
                  }
                )}
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
            <div className='min-w-0'>
              <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
                {t('saleForm.itemsTitle')}
              </h3>
              {items.length > 0 && (
                <p className='text-xs text-gray-500 mt-0.5'>
                  {editingItemIndex !== null
                    ? t('saleForm.editingLineHint')
                    : t('saleForm.editLineHint')}
                </p>
              )}
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              {editingItemIndex !== null && (
                <button
                  type='button'
                  onClick={cancelLineEdit}
                  disabled={isSaving}
                  className='px-4 py-2 rounded-sm text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50'
                >
                  {t('saleForm.cancelEditLine')}
                </button>
              )}
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
                {isSaving
                  ? t('saleForm.addItemSaving')
                  : editingItemIndex !== null
                    ? t('saleForm.updateItem')
                    : t('saleForm.addItem')}
              </button>
            </div>
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
                  {...bindNumericControlled({
                    allowDecimal: true,
                    placeholder: t('saleForm.quantityPlaceholder'),
                    value: currentItem?.quantity,
                    onChange: (e) => {
                      setCurrentItem((s) => ({ ...s, quantity: e.target.value }));
                      setValidationErrors((prev) => ({
                        ...prev,
                        quantity: undefined,
                      }));
                    },
                    className: `w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${
                      validationErrors.quantity
                        ? 'border-red-500'
                        : 'border-slate-200'
                    }`,
                  })}
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
                  {...bindNumericControlled({
                    allowDecimal: true,
                    placeholder: t('saleForm.pricePlaceholder'),
                    value: currentItem?.unitPrice,
                    onChange: (e) => {
                      setCurrentItem((s) => ({
                        ...s,
                        unitPrice: e.target.value,
                      }));
                      setValidationErrors((prev) => ({
                        ...prev,
                        unitPrice: undefined,
                      }));
                    },
                    className: `w-full font-custom bg-transparent placeholder:text-slate-400 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${(() => {
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
                    })()}`,
                  })}
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
                  const selectedUnit = units?.data?.find(
                    (u) => u._id === currentItem?.unit,
                  );
                  if (
                    !validation.isValid &&
                    validation.minUnitPrice > 0 &&
                    currentItem?.unitPrice
                  ) {
                    return (
                      <p className='text-red-600 text-xs mt-0.5'>
                        {t('saleForm.belowPurchaseWarning', {
                          min: validation.minUnitPrice.toLocaleString(),
                          unit: selectedUnit?.name || '',
                        })}
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
            </div>
          </div>
          {items?.length > 0 && (
            <div className='overflow-auto px-6 py-4'>
              <Table className='w-full text-xs'>
                <TableHeader headerData={productHeader} />
                <TableBody>
                  {items?.map((item, index) => (
                    <TableRow
                      key={index}
                      className={
                        editingItemIndex === index
                          ? 'bg-amber-50 ring-1 ring-inset ring-amber-300'
                          : ''
                      }
                    >
                      <TableColumn>{resolveProductLabel(item)}</TableColumn>
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
                      <TableColumn>
                        <div className='flex items-center justify-end gap-1'>
                          <button
                            type='button'
                            onClick={() => loadItemForEdit(index)}
                            title={t('saleForm.actions.edit')}
                            className={`p-1 rounded-sm transition-colors ${
                              editingItemIndex === index
                                ? 'text-amber-700 bg-amber-100'
                                : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'
                            }`}
                          >
                            <PencilIcon className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleRemove(index)}
                            title={t('saleForm.actions.delete')}
                            className='p-1 rounded-sm text-red-600 hover:text-red-900 hover:bg-red-50 transition-colors'
                          >
                            <BiTrashAlt className='h-4 w-4' />
                          </button>
                        </div>
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
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-gray-200'>
              <div className='text-center py-3 px-2'>
                <span className='text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1'>
                  {t('saleForm.summarySubtotal')}
                </span>
                <span className='text-lg font-bold text-gray-800'>
                  {subtotalAmountValue.toFixed(2)}
                </span>
              </div>
              <div className='text-center py-3 px-2'>
                <span className='text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1'>
                  {t('saleForm.summaryDiscount')}
                </span>
                <span className='text-lg font-bold text-red-600'>
                  {discountAmountValue.toFixed(2)}
                </span>
              </div>
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
            ? editMode
              ? t('sales.edit.saving')
              : t('saleForm.submitting')
            : editMode
              ? t('sales.edit.save')
              : t('saleForm.submitNew')}
        </button>
      </div>
    </form>
  );
}

export default SaleForm;
