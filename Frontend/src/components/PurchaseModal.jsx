import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import {
  useSuppliers,
  useProducts,
  useUnits,
  useSystemAccounts,
  useCreatePurchase,
  useAccounts,
} from "../services/useApi";
import { formatCurrency, normalizeDateToIso } from "../utilies/helper";
import GloableModal from "./GloableModal";
import { toast } from "react-toastify";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import JalaliDatePicker from "./JalaliDatePicker";
import Select from "./Select";
import { inputStyle } from "./ProductForm.jsx";

const PurchaseModal = ({ isOpen, onClose }) => {
  const { register, handleSubmit, watch, reset, setValue } = useForm();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const { data: units } = useUnits();
  const { data: systemAccounts } = useSystemAccounts();
  // Load supplier-type accounts so we can submit supplierAccount directly (Option B)
  const { data: supplierAccountsData } = useAccounts({ type: "supplier" });
  const supplierAccounts = supplierAccountsData?.accounts || [];
  const { mutate: createPurchase, isPending: isCreatingPurchase } =
    useCreatePurchase();
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  useEffect(() => {
    register("purchaseDate", { required: false });
    register("supplierAccount", { required: false });
  }, [register]);

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: "",
    unit: "",
    quantity: null,
    unitPrice: null,
    batchNumber: "",
    expiryDate: "",
  });

  const watchedValues = watch();

  // Filter units based on selected product
  const availableUnits = useMemo(() => {
    if (!currentItem.product || !units?.data || !products?.data) return [];

    const selectedProduct = products.data.find((p) => p._id === currentItem.product);
    if (!selectedProduct) return [];

    const productUnitId = selectedProduct.baseUnit?._id || selectedProduct.baseUnit;
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
  }, [currentItem.product, products?.data, units?.data]);

  // Auto-select product unit when product changes
  useEffect(() => {
    if (currentItem.product && availableUnits.length > 0) {
      const productUnit = products?.data?.find(p => p._id === currentItem.product);
      const productUnitId = productUnit?.baseUnit?._id || productUnit?.baseUnit;
      
      if (productUnitId && availableUnits.find(u => u._id === productUnitId)) {
        setCurrentItem(prev => ({ ...prev, unit: productUnitId }));
      } else if (!currentItem.unit || !availableUnits.find(u => u._id === currentItem.unit)) {
        setCurrentItem(prev => ({ ...prev, unit: availableUnits[0]._id }));
      }
    }
  }, [currentItem.product, availableUnits, products?.data]);

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const paidAmount = Number(watchedValues.paidAmount) || 0;
  const dueAmount = Math.max(subtotal - paidAmount, 0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      setItems([]);
      setCurrentItem({
        product: "",
        unit: "",
        quantity: null,
        unitPrice: null,
        batchNumber: "",
        expiryDate: "",
      });
    }
  }, [isOpen, reset]);

  const addItem = () => {
    if (
      !currentItem.product ||
      !currentItem.unit ||
      currentItem.quantity <= 0 ||
      currentItem.unitPrice <= 0
    ) {
      toast.error("لطفاً تمام فیلدهای مورد نیاز را پر کنید");
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now(), // temporary ID for frontend
    };

    setItems([...items, newItem]);
    setCurrentItem({
      product: "",
      unit: "",
      quantity: null,
      unitPrice: null,
      batchNumber: "",
      expiryDate: "",
    });
  };

  const removeItem = (itemId) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const runMutation = (mutateFn, payload, callbacks = {}) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: (...args) => {
          callbacks.onSuccess?.(...args);
          resolve(...args);
        },
        onError: (error) => {
          callbacks.onError?.(error);
          reject(error);
        },
      });
    });

  const onSubmit = wrapSubmit(async (data) => {
    if (items.length === 0) {
      toast.error("لطفاً حداقل یک جنس اضافه کنید");
      return;
    }

    // find selected account to get refId (supplier id) if needed
    const selectedAccount = supplierAccounts.find(
      (a) => a._id === data.supplierAccount
    );

    const purchaseData = {
      supplier: data.supplier || selectedAccount?.refId || undefined,
      supplierAccount: data.supplierAccount || undefined,
      purchaseDate:
        normalizeDateToIso(data.purchaseDate) ||
        new Date().toISOString().slice(0, 10),
      paidAmount: Number(data.paidAmount) || 0,
      paymentAccount: data.paymentAccount,
      items: items.map((item) => ({
        product: item.product,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        batchNumber: item.batchNumber || null,
        expiryDate:
          item.expiryDate && item.expiryDate !== ""
            ? normalizeDateToIso(item.expiryDate)
            : null,
      })),
    };

    await runMutation(createPurchase, purchaseData, {
      onSuccess: () => {
        console.log(purchaseData);
        onClose();
        reset();
        setItems([]);
      },
      onError: (error) => {
        toast.error(error.message || "خطا در ایجاد خرید");
      },
    });
  });

  if (!isOpen) return null;

  return (
    <GloableModal isClose={true} open={isOpen}>
      <div className="bg-white rounded-md shadow-xl w-md  md:w-3xl  lg:w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">خرید جدید</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Purchase Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
                      <Select
                        label="تهیه کننده (حساب) *"
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
                        value={watchedValues.supplierAccount}
                        onChange={(value) => {
                          // set selected account id
                          setValue("supplierAccount", value);
                          // also set supplier id if the account has refId
                          const acc = supplierAccounts.find((a) => a._id === value);
                          if (acc && acc.refId) setValue("supplier", acc.refId);
                        }}
                        register={register}
                        name="supplierAccount"
                        defaultSelected="انتخاب حساب تهیه کننده"
                      />
            </div>

            <div>
              <JalaliDatePicker
                label="تاریخ خرید"
                name="purchaseDate"
                value={watchedValues.purchaseDate || ""}
                onChange={(nextValue) =>
                  setValue("purchaseDate", nextValue, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <div>
              <Select
                label="حساب پرداخت *"
                options={
                  systemAccounts?.accounts?.map((account) => ({
                    value: account._id,
                    label: `${account.name} (${account.type})`,
                  })) || []
                }
                value={watchedValues.paymentAccount}
                onChange={(value) => setValue("paymentAccount", value)}
                register={register}
                name="paymentAccount"
                defaultSelected="انتخاب حساب"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مبلغ پرداخت شده
              </label>
              <input
                type="number"
                step="0.01"
                {...register("paidAmount")}
                className={inputStyle}
                placeholder="0"
              />
            </div>
          </div>

          {/* Add Item Form */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className=" flex  justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                اضافه کردن جنس
              </h3>
              <button
                type="button"
                onClick={addItem}
                className=" flex text-[12px] items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                اضافه کردن
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Select
                  label=" محصول *"
                  options={
                    products?.data?.map((product) => ({
                      value: product._id,
                      label: product.name,
                    })) || []
                  }
                  value={currentItem.product}
                  onChange={(value) => {
                    const selectedProduct = products?.data?.find(
                      (p) => p._id === value
                    );
                    setCurrentItem({
                      ...currentItem,
                      product: value,
                      unit: selectedProduct?.baseUnit?._id || "",
                    });
                  }}
                  defaultSelected="انتخاب محصول"
                />
              </div>

              <div>
                <label className="block mb-[7px] text-[12px] font-medium text-gray-700">
                  واحد *
                </label>
                <select
                  value={currentItem.unit}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, unit: e.target.value })
                  }
                  className={inputStyle}
                  disabled={!currentItem.product || availableUnits.length === 0}
                >
                  <option value="">
                    {!currentItem.product ? "ابتدا محصول را انتخاب کنید" : "انتخاب واحد"}
                  </option>
                  {availableUnits.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-[7px] text-[12px] font-medium text-gray-700 ">
                  تعداد *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.quantity || ""}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      quantity: Number(e.target.value),
                    })
                  }
                  className={inputStyle}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block mb-[7px] text-[12px] font-medium text-gray-700 ">
                  قیمت واحد *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.unitPrice || ""}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  className={inputStyle}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-[7px]">
                  شماره بچ
                </label>
                <input
                  type="text"
                  value={currentItem.batchNumber}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      batchNumber: e.target.value,
                    })
                  }
                  className={inputStyle}
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <JalaliDatePicker
                  label="تاریخ انقضا"
                  value={currentItem.expiryDate}
                  onChange={(date) =>
                    setCurrentItem({ ...currentItem, expiryDate: date })
                  }
                  placeholder="انتخاب تاریخ"
                  clearable={true}
                />
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                اجناس انتخاب شده
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        محصول
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        واحد
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        تعداد
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        قیمت واحد
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        تاریخ انقضا
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        مجموع
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => {
                      const product = products?.data?.find(
                        (p) => p._id === item.product
                      );
                      const unit = units?.data?.find(
                        (u) => u._id === item.unit
                      );
                      const total = item.quantity * item.unitPrice;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {product?.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {unit?.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.expiryDate || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                            {formatCurrency(total)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-900">
                مجموع کل: {formatCurrency(subtotal)}
              </div>
              <div className="text-sm text-gray-600">
                پرداخت شده: {formatCurrency(paidAmount)} | باقی مانده:{" "}
                {formatCurrency(dueAmount)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              لغو
            </button>
            <button
              type="submit"
              disabled={isCreatingPurchase || isSubmitting}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingPurchase || isSubmitting
                ? "در حال ایجاد..."
                : "ایجاد خرید"}
            </button>
          </div>
        </form>
      </div>
    </GloableModal>
  );
};

export default PurchaseModal;
