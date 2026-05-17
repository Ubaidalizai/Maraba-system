import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  useSuppliers,
  useProducts,
  useUnits,
  useSystemAccounts,
  useAccounts,
} from '../services/useApi';
import { formatCurrency, normalizeDateToIso } from '../utilies/helper';
import { toast } from 'react-toastify';
import { useSubmitLock } from '../hooks/useSubmitLock.js';
import JalaliDatePicker from './JalaliDatePicker';
import Select from './Select';

function PurchaseForm({ onClose, onSubmit }) {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = useForm();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const { data: units } = useUnits();
  const { data: systemAccounts } = useSystemAccounts();
  const { data: supplierAccountsData } = useAccounts({ type: 'supplier' });
  const supplierAccounts = supplierAccountsData?.accounts || [];
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  const [items, setItems] = useState([]);
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

  // Set default purchase date to today
  useEffect(() => {
    if (!watch('purchaseDate')) {
      setValue('purchaseDate', new Date().toISOString().slice(0, 10));
    }
  }, [setValue, watch]);

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

    const productUnitId =
      selectedProduct.baseUnit?._id || selectedProduct.baseUnit;
    const productUnit = units.data.find((u) => u._id === productUnitId);
    if (!productUnit) return [];

    if (productUnit.base_unit) {
      const baseUnitId = productUnit.base_unit._id || productUnit.base_unit;
      const baseUnit = units.data.find((u) => u._id === baseUnitId);
      return baseUnit ? [baseUnit, productUnit] : [productUnit];
    }

    return [productUnit];
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
    setItems([...items, { ...currentItem, id: Date.now() }]);
    setCurrentItem({
      product: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      batchNumber: '',
      expiryDate: '',
    });
  };

  const handleRemove = (itemId) => {
    setItems(items.filter((item) => item.id !== itemId));
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
        paidAmount: Number(data.paidAmount) || 0,
        paymentAccount: data.paymentAccount,
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

  const isSaving = loading || isSubmitting;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleFormSubmit)}
      className='w-full'
    >
      <div className='space-y-6'>
        <div className='border-t border-gray-200 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5'>
            {/* Supplier Account */}
            <div className='col-span-2'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchaseModal.supplierAccountLabel')}
                <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
              </label>
              <Select
                label=''
                options={
                  supplierAccounts?.map((acc) => {
                    const supName = suppliers?.data?.find(
                      (s) => s._id === acc.refId
                    )?.name;
                    return {
                      value: acc._id,
                      label: supName ? `${acc.name} — ${supName}` : acc.name,
                    };
                  }) || []
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

            {/* Payment Account */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('purchaseModal.paymentAccountLabel')}
              </label>
              <Select
                label=''
                options={
                  accounts.map((account) => ({
                    value: account._id,
                    label: `${account.name} (${account.type})`,
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
                type='number'
                step='1'
                {...register('paidAmount', {
                  valueAsNumber: true,
                })}
                onWheel={(e) => e.target.blur()}
                className='w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow rounded-sm'
                placeholder={t('purchaseModal.placeholderZero')}
                min='0'
              />
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
            <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
              {t('purchaseModal.addItemTitle')}
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
              {isSaving ? t('saleForm.addItemSaving') : t('purchaseModal.addButton')}
            </button>
          </div>
          <div className='p-6 bg-amber-50/40 border-b border-gray-200'>
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 w-full'>
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
                  type='number'
                  step='0.01'
                  value={currentItem.quantity}
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
                  placeholder={t('purchaseModal.placeholderZero')}
                />
                {validationErrors.quantity && (
                  <p className='text-red-600 text-xs mt-0.5'>
                    {validationErrors.quantity}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {t('purchaseModal.unitPriceLabel')}
                  <span className='text-red-500 ml-1'>{t('saleForm.requiredStar')}</span>
                </label>
                <input
                  type='number'
                  step='1'
                  value={currentItem.unitPrice}
                  min='0'
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setCurrentItem((s) => ({ ...s, unitPrice: e.target.value }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      unitPrice: undefined,
                    }));
                  }}
                  className={`w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 focus:shadow ${
                    validationErrors.unitPrice
                      ? 'border-red-500'
                      : 'border-slate-200'
                  }`}
                  placeholder={t('purchaseModal.placeholderMoney')}
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

                    return (
                      <tr key={item.id} className='border-b border-gray-100'>
                        <td className='py-2 px-3'>{product?.name || '-'}</td>
                        <td className='py-2 px-3'>{unit?.name || '-'}</td>
                        <td className='py-2 px-3'>{item.quantity}</td>
                        <td className='py-2 px-3'>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className='py-2 px-3 font-semibold text-purple-600'>
                          {formatCurrency(total)}
                        </td>
                        <td className='py-2 px-3'>
                          <button
                            type='button'
                            onClick={() => handleRemove(item.id)}
                            className='p-1'
                          >
                            <TrashIcon className='text-warning-orange h-4 w-4' />
                          </button>
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
          {isSaving ? t('purchaseModal.submitting') : t('purchaseModal.submit')}
        </button>
      </div>
    </form>
  );
}

export default PurchaseForm;
