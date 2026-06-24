import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TrashIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import {
  useProducts,
  useUnits,
  useSystemAccounts,
  useAccounts,
} from '../services/useApi';
import { formatCurrency, normalizeDateToIso, formatJalaliDate } from '../utilies/helper';
import { registerNumeric, bindNumericControlled } from '../utilies/numericInput';
import { getPurchaseUnitsForProduct } from '../utilies/unitHelper';
import { toast } from 'react-toastify';
import { useSubmitLock } from '../hooks/useSubmitLock.js';
import JalaliDatePicker from './JalaliDatePicker';
import Select from './Select';
import {
  findLineConstraint,
  getMinQuantityWarning,
  validateAllItemsAgainstConstraints,
} from '../utilies/purchaseEditStock';

function PurchaseForm({
  onClose,
  onSubmit,
  mode = 'create',
  initialPurchase = null,
  stockConstraints = null,
  isSaving: isSavingProp = false,
}) {
  const { t, i18n } = useTranslation();
  const isEdit = mode === 'edit';
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      stockLocation: 'warehouse',
      reason: '',
    },
  });
  const { data: products } = useProducts();
  const { data: units } = useUnits();
  const { data: systemAccounts } = useSystemAccounts();
  const { data: supplierAccountsData } = useAccounts({ type: 'supplier' });
  const supplierAccounts = supplierAccountsData?.accounts || [];
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const itemEditorRef = useRef(null);
  const [currentItem, setCurrentItem] = useState({
    product: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    batchNumber: '',
    expiryDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const purchaseDateValue = watch('purchaseDate') || '';
  const accounts = systemAccounts?.accounts || systemAccounts || [];

  const formatExpiryCell = (iso) => {
    if (!iso) return '—';
    const normalized = normalizeDateToIso(iso);
    if (!normalized) return '—';
    return formatJalaliDate(normalized);
  };

  // Set default purchase date to today (create only)
  useEffect(() => {
    if (isEdit) return;
    if (!watch('purchaseDate')) {
      setValue('purchaseDate', new Date().toISOString().slice(0, 10));
    }
  }, [setValue, watch, isEdit]);

  // Hydrate form when editing
  useEffect(() => {
    if (!isEdit || !initialPurchase) return;

    const p = initialPurchase;
    setValue(
      'purchaseDate',
      normalizeDateToIso(p.purchaseDate) ||
        new Date().toISOString().slice(0, 10)
    );
    setValue('paidAmount', p.paidAmount ?? 0);
    setValue('description', p.description || '');
    const supplierAccountId =
      p.supplierAccount?._id || p.supplierAccount || '';
    if (supplierAccountId) {
      setValue('supplierAccount', supplierAccountId);
    }
    const supplierId = p.supplier?._id || p.supplier || '';
    if (supplierId) {
      setValue('supplier', supplierId);
    }
    setValue('stockLocation', p.stockLocation || 'warehouse');

    const mappedItems = (p.items || []).map((item, idx) => ({
      id: item._id || `edit-${idx}-${Date.now()}`,
      product: item.product?._id || item.product,
      unit: item.unit?._id || item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate
        ? normalizeDateToIso(item.expiryDate)
        : '',
    }));
    setItems(mappedItems);
  }, [isEdit, initialPurchase, setValue]);

  // Find cashier account and set as default
  const cashierAccount = accounts.find(acc => acc.type === 'cashier');
  
  useEffect(() => {
    if (cashierAccount && !watch('paymentAccount')) {
      setValue('paymentAccount', cashierAccount._id);
    }
  }, [cashierAccount, setValue, watch]);

  const availableUnits = useMemo(() => {
    if (!currentItem.product || !units?.data || !products?.data) return [];

    const selectedProduct = products.data.find(
      (p) => p._id === currentItem.product
    );
    if (!selectedProduct) return [];

    return getPurchaseUnitsForProduct(selectedProduct, units.data);
  }, [currentItem.product, products?.data, units?.data]);

  useEffect(() => {
    if (currentItem.product && availableUnits.length > 0) {
      const productUnit = products?.data?.find(
        (p) => p._id === currentItem.product
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
  }, [currentItem.product, availableUnits, products?.data]);

  const emptyCurrentItem = () => ({
    product: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    batchNumber: '',
    expiryDate: '',
  });

  const resetItemEditor = () => {
    setEditingItemId(null);
    setCurrentItem(emptyCurrentItem());
    setValidationErrors({});
  };

  const handleStartEditItem = (item) => {
    setEditingItemId(item.id);
    setCurrentItem({
      product: item.product,
      unit: item.unit,
      quantity: item.quantity != null ? String(item.quantity) : '',
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
    });
    setValidationErrors({});
    requestAnimationFrame(() => {
      itemEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const activeLineConstraint = isEdit
    ? findLineConstraint(stockConstraints, currentItem)
    : null;

  const handleSaveItem = () => {
    const errors = {};
    if (!currentItem.product)
      errors.product = t('saleForm.errors.productRequired');
    if (!currentItem.unit) errors.unit = t('saleForm.errors.unitRequired');
    if (!currentItem.quantity || currentItem.quantity <= 0)
      errors.quantity = t('saleForm.errors.quantityRequired');
    if (!currentItem.unitPrice || currentItem.unitPrice <= 0)
      errors.unitPrice = t('saleForm.errors.priceRequired');

    const stockMsg = getMinQuantityWarning(
      stockConstraints,
      currentItem,
      t
    );
    if (stockMsg) {
      errors.quantity = stockMsg;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (stockMsg) toast.error(stockMsg);
      return;
    }

    setValidationErrors({});
    const payload = {
      ...currentItem,
      id: editingItemId ?? Date.now(),
    };

    if (editingItemId) {
      setItems((prev) =>
        prev.map((row) => (row.id === editingItemId ? payload : row))
      );
    } else {
      setItems((prev) => [...prev, payload]);
    }
    resetItemEditor();
  };

  const handleRemove = (itemId) => {
    setItems(items.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) {
      resetItemEditor();
    }
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
    // Validate supplier account selection
    if (!data.supplierAccount) {
      toast.error(t('purchaseForm.validation.supplierRequired'));
      return;
    }

    // Validate items
    if (items.length === 0) {
      toast.error(t('purchaseModal.toast.addOneItem'));
      return;
    }

    if (isEdit && stockConstraints) {
      const stockWarnings = validateAllItemsAgainstConstraints(
        items,
        stockConstraints,
        t
      );
      if (stockWarnings.length > 0) {
        toast.error(stockWarnings[0]);
        return;
      }
    }

    // Validate paid amount
    const total = calculateTotal();
    if (data.paidAmount > total) {
      toast.error(
        t('purchaseForm.validation.paidExceedsTotal', {
          paid: data.paidAmount,
          total: total.toFixed(2),
        })
      );
      return;
    }

    const paidNow = Number(data.paidAmount) || 0;
    if (!isEdit && paidNow > 0 && !data.paymentAccount) {
      toast.error(t('purchaseModal.selectPaymentAccount'));
      return;
    }

    setLoading(true);
    try {
      const selectedAccount = supplierAccounts.find(
        (a) => a._id === data.supplierAccount
      );

      const purchaseData = {
        supplier: data.supplier || selectedAccount?.refId || undefined,
        supplierAccount: data.supplierAccount || undefined,
        purchaseDate:
          normalizeDateToIso(data.purchaseDate) ||
          new Date().toISOString().slice(0, 10),
        description: data.description || undefined,
        paidAmount: paidNow,
        ...(paidNow > 0 && data.paymentAccount
          ? { paymentAccount: data.paymentAccount }
          : {}),
        // Edit: keep original receipt location (warehouse vs store) — do not relocate stock
        stockLocation: isEdit
          ? initialPurchase?.stockLocation || 'warehouse'
          : data.stockLocation || 'warehouse',
        ...(isEdit && {
          reason: data.reason || '',
        }),
        items: items.map((item) => ({
          product: item.product,
          unit: item.unit,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          batchNumber: item.batchNumber || null,
          expiryDate:
            item.expiryDate && item.expiryDate !== ''
              ? normalizeDateToIso(item.expiryDate)
              : null,
        })),
      };

      if (onSubmit) {
        await onSubmit(purchaseData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  });

  const isSaving = loading || isSubmitting || isSavingProp;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleFormSubmit)}
      className='w-full'
    >
      <div className='space-y-6'>
        <div className='border-t border-gray-200 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5'>
            {/* Supplier Account */}
            <div className='col-span-2'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchaseModal.supplierAccountLabel')}
                <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
              </label>
              <Select
                label=''
                options={
                  supplierAccounts?.map((acc) => ({
                    value: acc._id,
                    label: acc.name,
                  })) || []
                }
                value={watch('supplierAccount')}
                onChange={(value) => {
                  setValue('supplierAccount', value);
                  const acc = supplierAccounts.find((a) => a._id === value);
                  if (acc && acc.refId) setValue('supplier', acc.refId);
                }}
                defaultSelected={t('purchaseModal.selectSupplierAccount')}
              />
            </div>

            {/* Payment Account (required only when paid amount > 0) */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchaseModal.paymentAccountLabel')}
              </label>
              <Select
                label=''
                options={
                  accounts.map((account) => ({
                    value: account._id,
                    label: account.name,
                  })) || []
                }
                value={watch('paymentAccount')}
                onChange={(value) => setValue('paymentAccount', value)}
                defaultSelected={t('purchaseModal.selectPaymentAccount')}
              />
            </div>

            {/* Paid Amount */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchaseModal.paidAmount')}
              </label>
              <input
                {...registerNumeric('paidAmount', register, {}, {
                  className:
                    'w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow rounded-sm',
                  placeholder: t('purchaseModal.placeholderZero'),
                })}
              />
            </div>

            {/* Stock location — editable on create, read-only on edit */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchases.edit.stockLocation')}
              </label>
              <select
                disabled={isEdit}
                className={`w-full font-custom dark:text-slate-500 text-slate-700 text-sm border border-slate-200 px-3 py-2 transition duration-300 ease rounded-sm ${
                  isEdit
                    ? 'bg-gray-100 cursor-not-allowed opacity-90'
                    : 'bg-transparent focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow'
                }`}
                {...register('stockLocation')}
              >
                <option value='warehouse'>
                  {t('purchases.edit.warehouse')}
                </option>
                <option value='store'>{t('purchases.edit.store')}</option>
              </select>
              {isEdit && (
                <p className='text-xs text-amber-800 mt-1.5'>
                  {t('purchases.edit.stockLocationReadOnlyHint')}
                </p>
              )}
            </div>

            {/* Purchase Date */}
            <div>
              <JalaliDatePicker
                label={t('purchaseModal.purchaseDate')}
                value={purchaseDateValue}
                onChange={(nextValue) =>
                  setValue(
                    'purchaseDate',
                    normalizeDateToIso(nextValue) ||
                      new Date().toISOString().slice(0, 10),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    }
                  )
                }
                placeholder={t('saleForm.datePlaceholder')}
                clearable={false}
              />
              <input
                type='hidden'
                value={purchaseDateValue}
                readOnly
                {...register('purchaseDate')}
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className='border border-gray-200 rounded-sm'>
          <div className='flex justify-between items-center px-6 py-3 bg-gray-50 border-b border-gray-200'>
            <div>
              <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
                {editingItemId
                  ? t('purchaseModal.editItemTitle')
                  : t('purchaseModal.addItemTitle')}
              </h3>
              {isEdit && items.length > 0 && !editingItemId && (
                <p className='text-xs text-gray-600 mt-1'>
                  {t('purchaseModal.selectItemToEditHint')}
                </p>
              )}
              {editingItemId && (
                <p className='text-xs text-amber-800 mt-1'>
                  {t('purchaseModal.editItemHint')}
                </p>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {editingItemId && (
                <button
                  type='button'
                  onClick={resetItemEditor}
                  disabled={isSaving}
                  className='px-4 py-2 rounded-sm text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100'
                >
                  {t('purchaseModal.cancelEditItem')}
                </button>
              )}
              <button
                type='button'
                onClick={handleSaveItem}
                disabled={isSaving}
                className={`px-4 py-2 rounded-sm text-sm font-semibold flex items-center gap-2 transition-all ${
                  isSaving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {editingItemId ? (
                  <PencilIcon className='h-4 w-4' />
                ) : (
                  <PlusIcon className='h-4 w-4' />
                )}
                {isSaving
                  ? t('saleForm.addItemSaving')
                  : editingItemId
                    ? t('purchaseModal.updateItemButton')
                    : t('purchaseModal.addButton')}
              </button>
            </div>
          </div>
          <div
            ref={itemEditorRef}
            className={`p-6 border-b border-gray-200 ${
              editingItemId ? 'bg-amber-100/50' : 'bg-amber-50/40'
            }`}
          >
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 w-full'>
              <div className='col-span-2'>
                <Select
                  label={t('purchaseModal.productLabel')}
                  value={currentItem.product}
                  onChange={(value) => {
                    const selectedProduct = products?.data?.find(
                      (p) => p._id === value
                    );
                    setCurrentItem({
                      ...currentItem,
                      product: value,
                      unit: selectedProduct?.baseUnit?._id || '',
                    });
                    setValidationErrors((prev) => ({
                      ...prev,
                      product: undefined,
                    }));
                  }}
                  options={
                    products?.data?.map((product) => ({
                      value: product._id,
                      label: product.name,
                    })) || []
                  }
                  defaultSelected={t('purchaseModal.selectProduct')}
                />
                {validationErrors.product && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.product}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('purchaseModal.unitLabel')}
                  <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
                </label>
                <select
                  value={currentItem.unit}
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
                  disabled={!currentItem.product || availableUnits.length === 0}
                >
                  <option value=''>
                    {!currentItem.product
                      ? t('purchaseModal.selectProductFirst')
                      : t('purchaseModal.selectUnit')}
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
                  {t('purchaseModal.quantityLabel')}
                  <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
                </label>
                <input
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: currentItem.quantity,
                    placeholder: t('purchaseModal.placeholderZero'),
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
                {activeLineConstraint?.canReduce && (
                  <p className='text-amber-800 text-xs mt-1'>
                    {t('purchaseModal.minQuantityHint', {
                      min: activeLineConstraint.minQuantity,
                      unit: activeLineConstraint.unitName,
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('purchaseModal.unitPriceLabel')}
                  <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
                </label>
                <input
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: currentItem.unitPrice,
                    onChange: (e) => {
                      setCurrentItem((s) => ({ ...s, unitPrice: e.target.value }));
                      setValidationErrors((prev) => ({
                        ...prev,
                        unitPrice: undefined,
                      }));
                    },
                    className: `w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${
                      validationErrors.unitPrice
                        ? 'border-red-500'
                        : 'border-slate-200'
                    }`,
                    placeholder: t('purchaseModal.placeholderMoney'),
                  })}
                />
                {validationErrors.unitPrice && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.unitPrice}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('purchaseModal.batchNumber')}
                </label>
                <input
                  type='text'
                  value={currentItem.batchNumber}
                  onChange={(e) =>
                    setCurrentItem((s) => ({
                      ...s,
                      batchNumber: e.target.value,
                    }))
                  }
                  className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow'
                  placeholder={t('purchaseModal.optional')}
                />
              </div>

              <div>
                <JalaliDatePicker
                  label={t('purchaseModal.expiryDate')}
                  value={currentItem.expiryDate}
                  onChange={(date) =>
                    setCurrentItem((s) => ({
                      ...s,
                      expiryDate: normalizeDateToIso(date) || '',
                    }))
                  }
                  placeholder={t('purchaseModal.datePlaceholder')}
                  clearable
                />
              </div>
            </div>
          </div>
          {items.length > 0 && (
            <div className='overflow-auto px-6 py-4'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.product')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.unit')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.quantity')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.unitPrice')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.expiry')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.total')}
                    </th>
                    <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase'>
                      {t('purchaseModal.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const product = products?.data?.find(
                      (p) => p._id === item.product
                    );
                    const unit = units?.data?.find((u) => u._id === item.unit);
                    const total =
                      parseFloat(item.quantity || 0) *
                      parseFloat(item.unitPrice || 0);

                    const isRowEditing = editingItemId === item.id;
                    const rowConstraint = isEdit
                      ? findLineConstraint(stockConstraints, item)
                      : null;
                    const belowMin =
                      rowConstraint?.canReduce &&
                      Number(item.quantity) + 0.0001 <
                        rowConstraint.minQuantity;

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 ${
                          isRowEditing ? 'bg-amber-50' : ''
                        } ${belowMin ? 'bg-red-50' : ''}`}
                      >
                        <td className='py-2 px-3'>{product?.name || '-'}</td>
                        <td className='py-2 px-3'>{unit?.name || '-'}</td>
                        <td className='py-2 px-3'>
                          <span>{item.quantity}</span>
                          {rowConstraint?.canReduce && (
                            <span className='block text-[10px] text-amber-800'>
                              {t('purchaseModal.minQtyShort', {
                                min: rowConstraint.minQuantity,
                              })}
                            </span>
                          )}
                        </td>
                        <td className='py-2 px-3'>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className='py-2 px-3'>
                          {formatExpiryCell(item.expiryDate)}
                        </td>
                        <td className='py-2 px-3 font-semibold text-purple-600'>
                          {formatCurrency(total)}
                        </td>
                        <td className='py-2 px-3'>
                          <div className='flex items-center gap-1'>
                            <button
                              type='button'
                              onClick={() => handleStartEditItem(item)}
                              className='p-1 text-amber-700 hover:text-amber-900'
                              title={t('purchaseModal.editItemAction')}
                            >
                              <PencilIcon className='h-4 w-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => handleRemove(item.id)}
                              className='p-1'
                              title={t('purchaseModal.removeItemAction')}
                            >
                              <TrashIcon className='text-warning-orange h-4 w-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary and Description */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-semibold text-gray-700'>
                {t('saleForm.notesLabel')}
              </label>
              <textarea
                {...register('description')}
                rows={2}
                className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 pr-3 pl-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow-md rounded-sm resize-none'
                placeholder={t('saleForm.notesPlaceholder')}
              />
            </div>
            {isEdit && (
              <div>
                <label className='block text-sm font-semibold text-gray-700'>
                  {t('purchases.edit.reason')}
                </label>
                <input
                  type='text'
                  {...register('reason')}
                  className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 px-3 py-2 rounded-sm focus:outline-none focus:border-amber-500'
                  placeholder={t('purchases.edit.reasonPlaceholder')}
                />
              </div>
            )}
          </div>
          <div className='border border-gray-200 rounded-sm overflow-hidden md:col-span-2'>
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
          {t('purchaseModal.cancel')}
        </button>
        <button
          type='submit'
          className='px-5 py-2.5 bg-amber-600 text-white rounded-sm hover:bg-amber-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={isSaving}
        >
          {isSaving
            ? isEdit
              ? t('purchases.edit.saving')
              : t('purchaseModal.submitting')
            : isEdit
              ? t('purchases.edit.save')
              : t('purchaseModal.submit')}
        </button>
      </div>
    </form>
  );
}

export default PurchaseForm;
