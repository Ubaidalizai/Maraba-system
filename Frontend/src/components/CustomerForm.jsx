import React from "react";
import { useForm } from "react-hook-form";
import { inputStyle } from "./ProductForm";
import Button from "./Button";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

function CustomerForm({ onClose = () => {}, onSave, close }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  const onSubmit = wrapSubmit(async (data) => {
    try {
      if (onSave) {
        await onSave(data);
      } else {
        console.log(data);
      }
      // close after successful save
      onClose();
      close && close();
    } catch (err) {
      // You may want to show an error toast here
      console.error("Failed to save customer", err);
    }
  });
  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] mx-auto p-6 overflow-y-auto">
      <div className="p-6 border-b  border-slate-300 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">مشتری جدید</h2>
      </div>

      <form
        id="customerForm"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم *
          </label>
          <input
            type="text"
            placeholder="Amire Ali"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name", {
              required: "نام الزامی است",
              minLength: { value: 2, message: "نام بسیار کوتاه است" },
            })}
            className={inputStyle}
          />
          {errors.name && (
            <p role="alert" className="text-sm text-red-500 mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Contact info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            شماره موبایل
          </label>
          <input
            type="text"
            placeholder="+973212312"
            aria-invalid={errors.contact_info?.phone ? "true" : "false"}
            {...register("contact_info.phone", {
              pattern: {
                value: /^\+?[0-9\s-]{6,20}$/,
                message: "شماره موبایل معتبر نیست",
              },
            })}
            className={inputStyle}
          />
          {errors.contact_info?.phone && (
            <p role="alert" className="text-sm text-red-500 mt-1">
              {errors.contact_info.phone.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ایمیل
          </label>
          <input
            type="email"
            dir="ltr"
            placeholder="example.12@gmail.com"
            aria-invalid={errors.contact_info?.email ? "true" : "false"}
            {...register("contact_info.email", {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "ایمیل معتبر نیست",
              },
            })}
            className={inputStyle}
          />
          {errors.contact_info?.email && (
            <p role="alert" className="text-sm text-red-500 mt-1">
              {errors.contact_info.email.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            آدرس
          </label>
          <input
            placeholder="address"
            type="text"
            {...register("contact_info.address")}
            className={inputStyle}
          />
        </div>
      </form>

      <div className="p-6 border-t border-slate-200  flex justify-end gap-4">
        <Button
          type="button"
          className=" bg-warning-orange"
          onClick={() => {
            onClose();
            close && close();
          }}
        >
          لغو کردن
        </Button>

        <Button
          type="submit"
          form="customerForm"
          disabled={isSubmitting}
          className={` bg-success-green ${
            isSubmitting ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "در حال ذخیره..." : "ذخیره کردن"}
        </Button>
      </div>
    </div>
  );
}

export default CustomerForm;
