import { Controller } from "react-hook-form";
import { useUnits } from "../services/useApi";
import Button from "./Button";
import Spinner from "./Spinner";

/**
 * ProductForm Component
 * Props:
 * - register, handleSubmit, formState, control (from react-hook-form)
 * - onClose: optional close callback
 */
export const inputStyle =
  "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm  px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm";

function ProductForm({ register, handleSubmit, formState, control, onClose }) {
  const { errors } = formState || {};
  const { data: units, isLoading: isUnitLoading } = useUnits();

  if (isUnitLoading) return <Spinner />;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className=" bg-white p-8 rounded-lg shadow-lg w-[400px]  lg:w-[500px]"
    >
      <div className=" w-full py-2 border-b border-slate-300 my-4 text-md font-semibold">
        {" "}
        اضافه کردن محصول جدید
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Name */}
        <div className="md:col-span-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            نام محصول
          </label>
          <input
            id="name"
            {...register("name", { required: "نام محصول الزامی است" })}
            type="text"
            className={inputStyle}
            placeholder="نام محصول را وارد کنید"
          />
          {errors?.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Base Unit */}
        <div className="md:col-span-1">
          <label
            htmlFor="baseUnit"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            واحد پایه
          </label>
          <Controller
            control={control}
            name="baseUnit"
            rules={{ required: "واحد پایه الزامی است" }}
            render={({ field }) => (
              <select {...field} id="baseUnit" className={inputStyle}>
                <option value="">انتخاب واحد</option>
                {units?.data?.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors?.baseUnit && (
            <p className="text-red-600 text-sm mt-1">
              {errors.baseUnit.message}
            </p>
          )}
        </div>

        {/* Track by Batch */}
        <div className="md:col-span-1 flex items-center">
          <div className="flex items-center space-x-2">
            <input
              id="trackByBatch"
              type="checkbox"
              {...register("trackByBatch")}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="trackByBatch" className="text-sm text-slate-700">
              ردیابی بر اساس بچ
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-200">
        <div className=" w-[50%] flex gap-2">
          <Button
            type="button"
            className="px-6 py-2 bg-transparent   border border-slate-500 text-black rounded-md"
            onClick={() => onClose()}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            className="px-6 py-2 bg-[#A0522D] hover:bg-[#a0522d]/90 text-white rounded-md transition duration-200"
          >
            ذخیره
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ProductForm;
