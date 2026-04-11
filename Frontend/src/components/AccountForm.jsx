import React, { useState, useEffect } from "react";
import {
  fetchSuppliers,
  fetchCustomers,
  fetchEmployees,
} from "../services/apiUtiles";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

function AccountForm({ register, handleSubmit, watch, onClose }) {
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("supplier");
  const [currentBalance, setCurrentBalance] = useState("0");
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [suppliersData, customersData, employeesData] = await Promise.all(
          [fetchSuppliers(), fetchCustomers(), fetchEmployees()]
        );

        setSuppliers(
          suppliersData.map((s) => ({ value: s._id, label: s.name }))
        );
        setCustomers(
          customersData.map((c) => ({ value: c._id, label: c.name }))
        );
        setEmployees(
          employeesData.map((e) => ({ value: e._id, label: e.name }))
        );
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getReferenceOptions = () => {
    switch (accountType) {
      case "supplier":
        return suppliers;
      case "customer":
        return customers;
      case "employee":
        return employees;
      default:
        return [];
    }
  };

  const isSystemAccount = () => {
    return ['cashier', 'safe', 'saraf'].includes(accountType);
  };

  const handleFormSubmit = async (data) => {
    const accountData = {
      type: data.type,
      refId: isSystemAccount() ? null : data.refId,
      name: data.name,
      openingBalance: parseFloat(data.openingBalance) || 0,
      currentBalance: parseFloat(data.openingBalance) || 0, // Always set currentBalance = openingBalance for new accounts
      currency: data.currency || "AFN",
      isDeleted: false,
    };
    await Promise.resolve(handleSubmit(accountData));
  };

  // Watch openingBalance to auto-update currentBalance
  const openingBalance = watch("openingBalance");
  
  useEffect(() => {
    if (openingBalance !== undefined) {
      setCurrentBalance(openingBalance || "0");
    }
  }, [openingBalance]);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(wrapSubmit(handleFormSubmit))}
      className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
    >
      <div className='p-6 border-b border-gray-200 flex justify-between items-center'>
        <h2 className='text-2xl font-bold text-gray-900'>
          اضافه کردن حساب جدید
        </h2>
      </div>
      <div className='p-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              نوع حساب *
            </label>
            <select
              {...register("type")}
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              required
            >
              <option value='supplier'>تامین کننده</option>
              <option value='customer'>مشتری</option>
              <option value='employee'>کارمند</option>
              <option value='cashier'>صندوق</option>
              <option value='safe'>صندوق امانات</option>
              <option value='saraf'>صراف</option>
            </select>
          </div>

          {!isSystemAccount() && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                مرجع *
              </label>
              <select
                {...register("refId")}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                required
              >
                <option value=''>انتخاب مرجع</option>
                {getReferenceOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              نام حساب *
            </label>
            <input
              type='text'
              {...register("name")}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              placeholder='نام حساب را وارد کنید'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              ارز
            </label>
            <select
              {...register("currency")}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
            >
              <option value='AFN'>افغانی (AFN)</option>
              <option value='USD'>دالر (USD)</option>
              <option value='EUR'>یورو (EUR)</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              موجودی اولیه *
            </label>
            <input
              type='number'
              step='0.01'
              {...register("openingBalance")}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              placeholder='0.00'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              موجودی فعلی *
            </label>
            <input
              type='number'
              step='0.01'
              value={currentBalance}
              readOnly
              className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed'
              placeholder='0.00'
            />
            <p className='text-xs text-gray-500 mt-1'>
              (برابر با موجودی اولیه تنظیم می‌شود)
            </p>
          </div>
        </div>
      </div>
      <div className='p-6 border-t border-gray-200 flex justify-end gap-4'>
        <button
          type='button'
          onClick={onClose}
          className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
        >
          لغو
        </button>
        <button
          type='submit'
          className='px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed'
          disabled={loading || isSubmitting}
        >
          {loading || isSubmitting ? "در حال پردازش..." : "اضافه کردن حساب"}
        </button>
      </div>
    </form>
  );
}

export default AccountForm;

