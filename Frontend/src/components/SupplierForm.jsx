import React, { useState } from "react";
import { inputStyle } from "./ProductForm";
import { toast } from "react-toastify";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

function SupplierForm({ handleSubmit, register, onSubmit, close }) {
  const [contactInfo, setContactInfo] = useState({
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  const generateId = () => Math.random().toString(36).substr(2, 4);

  const generateSupplierId = () => {
    const existingIds = [
      "sup_001",
      "sup_002",
      "sup_003",
      "sup_004",
      "sup_005",
      "sup_006",
      "sup_007",
      "sup_008",
    ];
    let nextNum = 9;
    while (existingIds.includes(`sup_${String(nextNum).padStart(3, "0")}`)) {
      nextNum++;
    }
    return `sup_${String(nextNum).padStart(3, "0")}`;
  };

  const handleOnSubmit = async (data) => {
    if (!data.name || !contactInfo.phone) {
      toast.error("لطفا نام تماس و تلفن را وارد کنید");
      return;
    }
    const supplierData = {
      _id: generateSupplierId(),
      name: data.name,
      contact_info: contactInfo,
      id: generateId(),
    };
    await Promise.resolve(onSubmit(supplierData));
    close && close();
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(wrapSubmit(handleOnSubmit))}
      className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          اضافه کردن تهیه کننده جدید
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نام تماس *
            </label>
            <input
              type="text"
              {...register("name", { required: "نام تماس را وارد کنید" })}
              className={inputStyle}
              placeholder="احمد حسن"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ایمیل
            </label>
            <input
              type="email"
              value={contactInfo?.email}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, email: e.target.value })
              }
              className={inputStyle}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تلفن *
            </label>
            <input
              type="tel"
              value={contactInfo?.phone}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, phone: e.target.value })
              }
              className={inputStyle}
              placeholder="+93 700 123 456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              آدرس
            </label>
            <input
              type="text"
              value={contactInfo?.address}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, address: e.target.value })
              }
              className={inputStyle}
              placeholder="آدرس"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شهر
            </label>
            <input
              type="text"
              value={contactInfo?.city}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, city: e.target.value })
              }
              className={inputStyle}
              placeholder="شهر"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ایالت
            </label>
            <input
              type="text"
              value={contactInfo?.state}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, state: e.target.value })
              }
              className={inputStyle}
              placeholder="ایالت"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              کد پستی
            </label>
            <input
              type="text"
              value={contactInfo?.zip_code}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, zip_code: e.target.value })
              }
              className={inputStyle}
              placeholder="کد پستی"
            />
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
        <button
          type="button"
          onClick={() => close && close()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          لغو کردن
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 ${
            isSubmitting ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "در حال ذخیره..." : "اضافه کردن تهیه کننده"}
        </button>
      </div>
    </form>
  );
}

export default SupplierForm;
