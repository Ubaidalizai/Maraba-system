import { useTranslation } from "react-i18next";
import GloableModal from "./GloableModal";
import Button from "./Button";
import { inputStyle } from "./ProductForm";
import { registerNumeric } from "../utilies/numericInput";

function StockTransferModal({
  open,
  setOpen,
  productName,
  batchNumber,
  transferTypeOptions,
  register,
  handleSubmit,
  onSubmit,
  needsEmployee,
  employees = [],
  stockRow,
  quantity,
  employee,
  isBusy,
}) {
  const { t } = useTranslation();

  return (
    <GloableModal open={open} setOpen={setOpen}>
      <form
        noValidate
        className="bg-white rounded-lg w-full max-w-md"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {t("inventory.transfer.modal.title")}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t("inventory.transfer.modal.product")}
            </p>
            <p className="font-semibold text-gray-900 mt-0.5">{productName || "—"}</p>
            {batchNumber ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {t("inventory.expiring.table.batch")}: {batchNumber}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("inventory.transfer.modal.transferType")}
              </span>
              <select className={inputStyle} {...register("transferType")}>
                {transferTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {needsEmployee ? (
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("inventory.transfer.modal.employee")}
                </span>
                <select className={inputStyle} {...register("employee")}>
                  <option value="">{t("inventory.transfer.modal.selectEmployee")}</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("inventory.transfer.modal.unit")}
              </span>
              <select className={inputStyle} {...register("unit")}>
                <option value={stockRow?.unit?._id}>
                  {stockRow?.unit?.name} ({t("inventory.transfer.modal.defaultUnit")})
                </option>
                {stockRow?.unit?.base_unit ? (
                  <option value={stockRow.unit.base_unit._id}>
                    {stockRow.unit.base_unit.name} ({t("inventory.transfer.modal.baseUnit")})
                  </option>
                ) : null}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("inventory.transfer.modal.quantity")}
              </span>
              <input
                {...registerNumeric("quantity", register, {
                  required: true,
                  min: 1,
                }, {
                  allowDecimal: false,
                  className: inputStyle,
                  placeholder: t("inventory.transfer.modal.quantityPlaceholder"),
                })}
              />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          >
            {t("inventory.transfer.modal.cancel")}
          </Button>
          <Button
            type="submit"
            className="bg-primary-brown-light text-white"
            disabled={
              !quantity ||
              Number(quantity) <= 0 ||
              (needsEmployee && !employee) ||
              isBusy
            }
            isLoading={isBusy}
          >
            {t("inventory.transfer.modal.submit")}
          </Button>
        </div>
      </form>
    </GloableModal>
  );
}

export default StockTransferModal;
