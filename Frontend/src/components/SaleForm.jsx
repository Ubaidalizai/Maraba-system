import React, { useEffect, useState } from "react";
import { BiTrashAlt } from "react-icons/bi";
import { CgClose } from "react-icons/cg";
import { ShoppingCartIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import {
  useAccounts,
  useBatchesByProduct,
  useEmployeeStocks,
  useProducts,
  useProductsFromStock,
  useSystemAccounts,
  useUnits,
} from "../services/useApi";
import { formatCurrency, normalizeDateToIso } from "../utilies/helper";
import { formatUnitDisplay, formatPurchasePriceDisplay } from "../utilies/unitHelper";
import JalaliDatePicker from "./JalaliDatePicker";
import Select from "./Select";
import Table from "./Table";
import TableBody from "./TableBody";
import TableColumn from "./TableColumn";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import { toast } from "react-toastify";

const productHeader = [
  { title: "محصول" },
  { title: "تعداد (واحد)" },
  { title: "نمبر بچ" },
  { title: "تاریخ انقضا" },
  { title: "تعداد کارتن" },
  { title: "قیمت واحد" },
  { title: "قیمت مجموعی" },
  { title: "عملیات" },
];

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
  // Default values for Select components
  const DEFAULT_CUSTOMER_SELECTED = "انتخاب مشتری (حساب)";
  const DEFAULT_EMPLOYEE_SELECTED = "انتخاب کارمند (حساب)";
  const DEFAULT_ACCOUNT_SELECTED = "انتخاب حساب";
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: "",
    unit: "",
    batchNumber: "",
    quantity: null,
    unitPrice: null,
    expiryDate: "",
    cartonCount: null,
  });
  const [saleType, setSaleType] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { isSubmitting, wrapSubmit } = useSubmitLock();
  const saleDateValue = watch("saleDate") || "";

  // Get selected employee from form
  const selectedEmployee = watch("employee");

  // Fetch employee stock if employee is selected
  const { data: employeeStockData } = useEmployeeStocks({
    employeeId: selectedEmployee || null,
  });

  // API hooks
  const { data: stockData, isLoading: productsLoading } = useProductsFromStock(
    "store",
    false
  ); // false = exclude products with zero quantity
  // People accounts (customers/employees) instead of raw people

  const { data: customerAccResp, isLoading: customersLoading } = useAccounts({
    type: "customer",
    page: 1,
    limit: 1000,
  });
  const { data: employeeAccResp, isLoading: employeesLoading } = useAccounts({
    type: "employee",
    page: 1,
    limit: 1000,
  });
  const { data: accountsData, isLoading: accountsLoading } =
    useSystemAccounts();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: productsData } = useProducts();

  // Extract accounts array from the response
  const accounts = accountsData?.accounts || accountsData || [];

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
  const validateSalePrice = React.useCallback((productId, unitId, batchNumber, unitPrice) => {
    if (!productId || !unitId || !unitPrice) return { isValid: true, purchasePrice: 0 };
    
    const selectedProduct = productsData?.data?.find((p) => p._id === productId);
    const selectedUnit = units?.data?.find((u) => u._id === unitId);
    
    if (!selectedProduct || !selectedUnit) return { isValid: true, purchasePrice: 0 };
    
    const dataSource = selectedEmployee && employeeStockData
      ? employeeStockData.data || employeeStockData
      : stockData;
    
    const stockItem = Array.isArray(dataSource)
      ? dataSource.find(
          (s) =>
            s.product?._id === productId &&
            (batchNumber ? s.batchNumber === batchNumber : true)
        )
      : null;
    
    const purchasePricePerBaseUnit =
      stockItem?.purchasePricePerBaseUnit ||
      selectedProduct?.latestPurchasePrice ||
      0;
    
    const salePricePerBaseUnit =
      parseFloat(unitPrice) / (selectedUnit.conversion_to_base || 1);
    
    const isValid = purchasePricePerBaseUnit === 0 || salePricePerBaseUnit >= purchasePricePerBaseUnit;
    
    return { isValid, purchasePrice: purchasePricePerBaseUnit, salePrice: salePricePerBaseUnit };
  }, [productsData, units, selectedEmployee, employeeStockData, stockData]);

  // Get batches for selected product - only fetch when product is selected
  // Use employee location if employee is selected
  const selectedProductId = currentItem?.product;
  const locationForBatches = selectedEmployee ? "employee" : "store";
  const { data: batchesData } = useBatchesByProduct(
    selectedProductId,
    locationForBatches
  );
  const batches = Array.isArray(batchesData) ? batchesData : [];

  // Filter units based on selected product
  const availableUnits = React.useMemo(() => {
    if (!currentItem?.product || !units?.data || !productsData?.data) return [];

    const selectedProduct = productsData.data.find((p) => p._id === currentItem.product);
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
  }, [currentItem?.product, units?.data, productsData?.data]);

  // Auto-select product unit when product changes
  useEffect(() => {
    if (currentItem.product && availableUnits.length > 0) {
      const productUnit = productsData?.data?.find((p) => p._id === currentItem.product);
      const productUnitId = productUnit?.baseUnit?._id || productUnit?.baseUnit;

      if (productUnitId && availableUnits.find((u) => u._id === productUnitId)) {
        setCurrentItem((prev) => ({ ...prev, unit: productUnitId }));
      } else if (!currentItem.unit || !availableUnits.find((u) => u._id === currentItem.unit)) {
        setCurrentItem((prev) => ({ ...prev, unit: availableUnits[0]._id }));
      }
    }
  }, [currentItem.product, availableUnits, productsData?.data]);

  // Populate form when editing
  useEffect(() => {
    if (editMode && saleToEdit) {
      // Set sale type and customer/employee based on available data
      const customerRefId = saleToEdit.customerAccount?.refId || saleToEdit.customer?._id || saleToEdit.customer;
      const employeeRefId = saleToEdit.employeeAccount?.refId || saleToEdit.employee?._id || saleToEdit.employee;
      
      if (customerRefId) {
        setSaleType("customer");
        setValue("customer", customerRefId);
      } else if (employeeRefId) {
        setSaleType("employee");
        setValue("employee", employeeRefId);
      } else {
        setSaleType("walkin");
      }

      // Set items from sale
      if (saleToEdit.items && saleToEdit.items.length > 0) {
        const formattedItems = saleToEdit.items.map((item) => ({
          product: item.product?._id || item.product || "",
          unit: item.unit?._id || item.unit || "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          cartonCount: item.cartonCount || null,
        }));
        setItems(formattedItems);
      }

      // Set other fields
      if (saleToEdit.placedIn) {
        setValue("placedIn", saleToEdit.placedIn._id || saleToEdit.placedIn);
      }
      if (saleToEdit.invoiceType) {
        setValue("invoiceType", saleToEdit.invoiceType);
      }
      if (saleToEdit.paidAmount !== undefined) {
        setValue("paidAmount", saleToEdit.paidAmount);
      }
      if (saleToEdit.saleDate) {
        const dateValue = typeof saleToEdit.saleDate === 'string' && saleToEdit.saleDate.includes('T')
          ? saleToEdit.saleDate.split('T')[0]
          : saleToEdit.saleDate;
        setValue(
          "saleDate",
          normalizeDateToIso(dateValue) ||
            new Date().toISOString().slice(0, 10)
        );
      }
    }
  }, [editMode, saleToEdit, setValue]);

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const errors = {};
    if (!currentItem.product) errors.product = "محصول الزامی است";
    if (!currentItem.unit) errors.unit = "واحد الزامی است";
    if (!currentItem.quantity || currentItem.quantity <= 0) errors.quantity = "تعداد الزامی است";
    if (!currentItem.unitPrice || currentItem.unitPrice <= 0) errors.unitPrice = "قیمت الزامی است";
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      product: "",
      unit: "",
      batchNumber: "",
      quantity: null,
      unitPrice: null,
      expiryDate: "",
      cartonCount: null,
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

  const rawPaidAmount = watch("paidAmount");
  const paidAmountValue = Number(rawPaidAmount) || 0;
  const totalAmountValue = calculateTotal();
  const remainingAmount = Math.max(totalAmountValue - paidAmountValue, 0);

  const handleFormSubmit = wrapSubmit(async (data) => {
    // Validate paid amount before submission
    const total = calculateTotal();
    if (data.paidAmount > total) {
      toast.error(`مبلغ پرداخت شده (${data.paidAmount}) نمیتواند بیشتر از مجموع (${total.toFixed(2)}) باشد`);
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer: saleType === "customer" ? data.customer : null,
        employee: saleType === "employee" ? data.employee : null,
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
        invoiceType: data.invoiceType || "small",
      };

      if (onSubmit) {
        await onSubmit(saleData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleFormSubmit)}
      className="bg-white w-full"
    >
      <div className="p-2 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 p-1.5 rounded-lg">
            <ShoppingCartIcon className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {editMode ? "ویرایش فروش" : "اضافه کردن فروش جدید"}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors">
          <CgClose className="text-lg text-gray-700" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* Sale Type Selection */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            نوع فروش
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="customer"
                checked={saleType === "customer"}
                onChange={(e) => setSaleType(e.target.value)}
                className="ml-1.5 w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
              />
              <span className="mr-1.5 text-xs font-medium">مشتری</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="employee"
                checked={saleType === "employee"}
                onChange={(e) => setSaleType(e.target.value)}
                className="ml-1.5 w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
              />
              <span className="mr-1.5 text-xs font-medium">کارمند</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="walkin"
                checked={saleType === "walkin"}
                onChange={(e) => setSaleType(e.target.value)}
                className="ml-1.5 w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
              />
              <span className="mr-1.5 text-xs font-medium">مشتری عابر</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Customer/Employee Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {saleType === "customer"
                ? "مشتری"
                : saleType === "employee"
                ? "کارمند"
                : "مشتری عابر"}
            </label>
            {saleType === "customer" && (
              <div>
                <Select
                  label=""
                  options={customerAccounts.map((acc) => ({
                    value: acc.refId,
                    label: acc.name,
                  }))}
                  value={watch("customer")}
                  onChange={(value) => setValue("customer", value)}
                  defaultSelected="انتخاب مشتری (حساب)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customerAccounts.length} حساب
                </p>
              </div>
            )}
            {saleType === "employee" && (
              <div>
                <Select
                  label=""
                  options={employeeAccounts.map((acc) => ({
                    value: acc.refId,
                    label: acc.name,
                  }))}
                  value={watch("employee")}
                  onChange={(value) => setValue("employee", value)}
                  defaultSelected="انتخاب کارمند (حساب)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {employeeAccounts.length} حساب
                </p>
              </div>
            )}
            {saleType === "walkin" && (
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-sm text-gray-500 text-center">
                مشتری عابر
              </div>
            )}
          </div>

          {/* Invoice Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              نوعیت فاکتور
            </label>
            <Select
              label=""
              options={[
                { value: "small", label: "کوچک" },
                { value: "large", label: "بزرگ" },
              ]}
              value={watch("invoiceType")}
              onChange={(value) => setValue("invoiceType", value)}
              register={register}
              name="invoiceType"
              defaultSelected="انتخاب نوع فاکتور"
            />
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              حساب دریافت
            </label>
            <Select
              label=""
              options={accounts.map((acc) => ({
                value: acc._id,
                label: acc.name,
              }))}
              value={watch("placedIn")}
              onChange={(value) => setValue("placedIn", value)}
              defaultSelected="انتخاب حساب"
            />
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              مبلغ پرداخت شده
            </label>
            <input
              type="number"
              step="0.01"
              {...register("paidAmount", { 
                valueAsNumber: true,
                validate: (value) => {
                  const total = calculateTotal();
                  if (value > total) {
                    return `مبلغ پرداخت شده نمی‌تواند بیشتر از مجموع (${total.toFixed(2)}) باشد`;
                  }
                  return true;
                }
              })}
              className="w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-xs border border-slate-200 pr-2 pl-2 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow rounded-sm"
              placeholder="0.00"
              min="0"
              max={calculateTotal()}
            />
          </div>
          
          {/* Sale Date */}
          <div>
            <JalaliDatePicker
              label="تاریخ فروش"
              value={saleDateValue}
              onChange={(nextValue) =>
                setValue(
                  "saleDate",
                  normalizeDateToIso(nextValue) ||
                    new Date().toISOString().slice(0, 10),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  }
                )
              }
              placeholder="انتخاب تاریخ"
              clearable={false}
            />
            <input
              type="hidden"
              value={saleDateValue}
              readOnly
              {...register("saleDate", {
                required: "تاریخ فروش الزامی است",
              })}
            />
          </div>
        </div>



        {/* Items Section */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="bg-amber-100 p-1 rounded">
                📦
              </span>
              اجناس فروش
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isSaving}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isSaving
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              }`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {isSaving ? "در حال اضافه..." : "اضافه کردن"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 w-full">
            <div className="flex-1 min-w-[200px]">
              <Select
                id={"product"}
                label={<span>اسم محصول <span className="text-red-500">*</span></span>}
                value={currentItem?.product}
                onChange={(value) => {
                  const selectedProduct = productsData?.data?.find(
                    (p) => p._id === value
                  );
                  setCurrentItem({
                    ...currentItem,
                    product: value,
                    unit: selectedProduct?.baseUnit?._id || "",
                    batchNumber: "",
                  });
                  setValidationErrors(prev => ({...prev, product: undefined}));
                }}
                options={products}
              />
              {validationErrors.product && (
                <p className="text-red-600 text-[10px] mt-0.5">{validationErrors.product}</p>
              )}
              {(() => {
                if (!currentItem?.product) return null;
                const selectedProduct = productsData?.data?.find(
                  (p) => p._id === currentItem.product
                );
                const dataSource = selectedEmployee && employeeStockData
                  ? employeeStockData.data || employeeStockData
                  : stockData;
                const stockItem = Array.isArray(dataSource)
                  ? dataSource.find(
                      (s) => s.product?._id === currentItem.product &&
                      (currentItem.batchNumber ? s.batchNumber === currentItem.batchNumber : true)
                    )
                  : null;
                const priceDisplay = formatPurchasePriceDisplay(stockItem, selectedProduct);
                if (priceDisplay) {
                  return (
                    <p className="text-blue-600 text-[10px] mt-0.5">
                      💰 {priceDisplay}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex-1 min-w-[80px]">
              <label className="block text-[11px] font-medium text-gray-700 mb-1.5">واحد <span className="text-red-500">*</span></label>
              <select
                value={currentItem?.unit}
                onChange={(e) => {
                  setCurrentItem((s) => ({ ...s, unit: e.target.value }));
                  setValidationErrors(prev => ({...prev, unit: undefined}));
                }}
                className={`w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-xs border rounded-sm pr-1 pl-1 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow ${
                  validationErrors.unit ? 'border-red-500' : 'border-slate-200'
                }`}
                disabled={!currentItem?.product || availableUnits.length === 0}
              >
                <option value="">
                  {!currentItem?.product ? "محصول" : "واحد"}
                </option>
                {availableUnits.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {validationErrors.unit && (
                <p className="text-red-600 text-[10px] mt-0.5">{validationErrors.unit}</p>
              )}
            </div>
            <div className="flex-1 min-w-[80px]">
              <Select
                label="نمبر بچ"
                id="batch"
                value={currentItem?.batchNumber || ""}
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
                placeholder="بچ"
              />
            </div>
            <div className="flex-1 min-w-[70px]">
              <label className="block text-[11px] font-medium text-gray-700 mb-1.5">تعداد <span className="text-red-500">*</span></label>
              <input
                type="number"
                placeholder="تعداد"
                value={currentItem?.quantity}
                min="0"
                onChange={(e) => {
                  setCurrentItem((s) => ({ ...s, quantity: e.target.value }));
                  setValidationErrors(prev => ({...prev, quantity: undefined}));
                }}
                className={`w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-xs border rounded-sm pr-1 pl-1 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow ${
                  validationErrors.quantity ? 'border-red-500' : 'border-slate-200'
                }`}
              />
              {validationErrors.quantity && (
                <p className="text-red-600 text-[10px] mt-0.5">{validationErrors.quantity}</p>
              )}
            </div>
            <div className="flex-1 min-w-[70px]">
              <label className="block text-[11px] font-medium text-gray-700 mb-1.5">کارتن</label>
              <input
                type="number"
                placeholder="کارتن"
                value={currentItem?.cartonCount || ""}
                min="0"
                onChange={(e) =>
                  setCurrentItem((s) => ({ ...s, cartonCount: e.target.value }))
                }
                className="w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-xs border border-slate-200 rounded-sm pr-1 pl-1 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow"
              />
            </div>
            <div className="flex-1 min-w-[90px]">
              <label className="block text-[11px] font-medium text-gray-700 mb-1.5">قیمت <span className="text-red-500">*</span></label>
              <input
                placeholder="قیمت"
                type="number"
                step="0.01"
                min="0"
                value={currentItem?.unitPrice}
                onChange={(e) => {
                  setCurrentItem((s) => ({ ...s, unitPrice: e.target.value }));
                  setValidationErrors(prev => ({...prev, unitPrice: undefined}));
                }}
                className={`w-full font-custom bg-transparent placeholder:text-slate-400 text-xs border rounded-sm pr-1 pl-1 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow ${
                  (() => {
                    if (validationErrors.unitPrice) return 'border-red-500 text-red-600';
                    const validation = validateSalePrice(
                      currentItem?.product,
                      currentItem?.unit,
                      currentItem?.batchNumber,
                      currentItem?.unitPrice
                    );
                    return validation.isValid ? 'border-slate-200 text-slate-700' : 'border-red-500 focus:border-red-600 text-red-600';
                  })()
                }`}
              />
              {validationErrors.unitPrice && (
                <p className="text-red-600 text-[10px] mt-0.5">{validationErrors.unitPrice}</p>
              )}
              {(() => {
                const validation = validateSalePrice(
                  currentItem?.product,
                  currentItem?.unit,
                  currentItem?.batchNumber,
                  currentItem?.unitPrice
                );
                if (!validation.isValid && validation.purchasePrice > 0) {
                  return (
                    <p className="text-red-600 text-[10px] mt-0.5">
                      ⚠️ کمتر از خرید
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex-1 min-w-[140px]">
              <JalaliDatePicker
                label="تاریخ انقضا"
                value={currentItem?.expiryDate}
                onChange={(date) =>
                  setCurrentItem((s) => ({ ...s, expiryDate: date }))
                }
                placeholder="انتخاب تاریخ"
                clearable={true}
              />
            </div>
          </div>
          {items?.length > 0 && (
            <div className="overflow-auto mt-2">
              <Table className="w-full text-xs">
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
                          units?.data?.find((u) => u._id === item.unit)
                        )}
                      </TableColumn>
                      <TableColumn>{item.batchNumber}</TableColumn>
                      <TableColumn>{item.expiryDate}</TableColumn>
                      <TableColumn>{item.cartonCount || "-"}</TableColumn>
                      <TableColumn>
                        {formatCurrency(item.unitPrice)}
                      </TableColumn>
                      <TableColumn>
                        {formatCurrency(
                          (item.quantity || 0) * (item.unitPrice || 0)
                        )}
                      </TableColumn>
                      <TableColumn>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className=" p-1 "
                        >
                          <BiTrashAlt className=" text-warning-orange" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 bg-gray-50 rounded p-2">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <span className="text-[10px] text-gray-600 block">مجموع نهایی</span>
                <span className="text-lg font-bold text-amber-600">
                  {totalAmountValue.toFixed(2)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-gray-600 block">پرداخت شده</span>
                <span className="text-lg font-bold text-blue-600">
                  {paidAmountValue.toFixed(2)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-gray-600 block">باقی مانده</span>
                <span className={`text-lg font-bold ${
                  remainingAmount > 0 ? "text-orange-600" : "text-green-600"
                }`}>
                  {remainingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              توضیحات (اختیاری)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-xs border border-slate-200 pr-2 pl-2 py-2 transition duration-300 ease focus:outline-none focus:border-amber-500 hover:border-slate-300 shadow-sm focus:shadow rounded-sm resize-none"
              placeholder="توضیحات فروش را وارد کنید..."
            />
          </div>
        </div>
      </div>
      <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 text-xs transition-colors"
        >
          لغو
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-xs shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          {isSaving
            ? "در حال بارگذاری..."
            : editMode
            ? "ویرایش فروش"
            : "ثبت فروش"}
        </button>
      </div>
    </form>
  );
}

export default SaleForm;
