import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useUnits } from "../services/useApi";
import Button from "./Button";
import Spinner from "./Spinner";

/**
 * ProductForm Component
 * Props:
 * - register, handleSubmit, formState, control (from react-hook-form)
 * - onClose: optional close callback
 * - variant: "create" | "edit" (modal title)
 */
export const inputStyle =
  "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm  px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm";

function ProductForm({
  register,
  handleSubmit,
  formState,
  control,
  onClose,
  variant = "create",
}) {
  const { t } = useTranslation();
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
        {variant === "edit"
          ? t("inventory.product.form.titleEdit")
          : t("inventory.product.form.titleCreate")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Name */}
        <div className="md:col-span-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            {t("inventory.product.form.nameLabel")}
          </label>
          <input
            id="name"
            {...register("name", {
              required: t("inventory.product.form.nameRequired"),
            })}
            type="text"
            className={inputStyle}
            placeholder={t("inventory.product.form.namePlaceholder")}
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
            {t("inventory.product.table.baseUnit")}
          </label>
          <Controller
            control={control}
            name="baseUnit"
            rules={{
              required: t("inventory.product.form.baseUnitRequired"),
            }}
            render={({ field }) => (
              <select {...field} id="baseUnit" className={inputStyle}>
                <option value="">{t("inventory.product.form.selectUnit")}</option>
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
              {t("inventory.product.form.trackByBatch")}
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
            onClick={() => onClose?.()}
          >
            {t("inventory.product.form.cancel")}
          </Button>
          <Button
            type="submit"
            className="px-6 py-2 bg-[#A0522D] hover:bg-[#a0522d]/90 text-white rounded-md transition duration-200"
          >
            {t("inventory.product.form.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ProductForm;
