import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  useEmployeeStocks,
  useEmployees,
  useCreateStockTransfer,
} from "../services/useApi";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableRow from "../components/TableRow";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import GloableModal from "../components/GloableModal";
import Button from "../components/Button";
import { formatJalaliDate, formatJalaliDateTime } from "../utilies/helper";
import { useForm } from "react-hook-form";
import { inputStyle } from "./ProductForm";
import { BiTransferAlt } from "react-icons/bi";
import { CgEye } from "react-icons/cg";
import Select from "../components/Select";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import { registerNumeric } from "../utilies/numericInput";

// Headers in Dari
const tableHeader = [
  { title: "محصول" },
  { title: "تعداد" },
  { title: "تاریخ تحویل" },
  { title: "عملیات" },
];

const Employee = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDestination, setTransferDestination] = useState("warehouse");
  const { register, handleSubmit, watch, setValue } = useForm();

  const { data: employees } = useEmployees();
  const {
    data: stocks,
    isLoading,
    error,
  } = useEmployeeStocks({
    search,
    employeeId: selectedEmployee,
  });
  const { mutate: createStockTransfer, isPending: isCreatingTransfer } =
    useCreateStockTransfer();
  const { isSubmitting: isTransferSubmitting, wrapSubmit } = useSubmitLock();
  const quantityValue = watch("quantity");
  const quantityNumber = Number(quantityValue || 0);

  useEffect(() => {
    if (employees?.data?.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees.data[0]._id);
    }
  }, [employees, selectedEmployee]);

  const filteredStocks = stocks?.data || [];

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleShowDetails = (item) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  const handleTransfer = (item) => {
    setSelectedItem(item);
    setShowTransfer(true);
  setValue("quantity", "");
  };

  const runMutation = (mutateFn, payload) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: resolve,
        onError: reject,
      });
    });

  const onSubmitTransfer = wrapSubmit(async (data) => {
    if (
      !data.quantity ||
      data.quantity <= 0 ||
      data.quantity > selectedItem.quantity_in_hand
    )
      return;
    await runMutation(createStockTransfer, {
      product: selectedItem.product._id,
      fromLocation: "employee",
      toLocation: transferDestination,
      employee: selectedItem.employee._id,
      quantity: Number(data.quantity),
    });
    setShowTransfer(false);
    setValue("quantity", "");
  });
  const isTransferBusy = isTransferSubmitting || isCreatingTransfer;

  // Keep the search and employee select mounted while loading/error so focus is preserved.

  return (
    <section>
      <div className="w-full flex gap-4 bg-white py-3 border border-slate-200 my-1.5 rounded-md  items-center px-1.5">
        <div className=" w-[350px]">
          <SearchInput
            placeholder="جستجو کنید"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="w-[350px]">
          <Select
            label=""
            options={
              employees?.data?.map((emp) => ({
                value: emp._id,
                label: emp.name,
              })) || []
            }
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            defaultSelected={employees?.data?.[0]?._id || ""}
          />
        </div>
      </div>
      <Table>
        <TableHeader headerData={tableHeader} />
        <TableBody>
          {isLoading ? (
            <TableRow key="loading">
              <TableColumn colSpan={4} className="text-center">
                <div className=" w-full h-[120px] flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              </TableColumn>
            </TableRow>
          ) : error ? (
            <TableRow key="error">
              <TableColumn colSpan={4} className="text-center text-red-500">
                Error loading employee stocks: {error?.message || "خطا در بارگذاری"}
              </TableColumn>
            </TableRow>
          ) : (
            filteredStocks?.map((item) => (
              <TableRow key={item._id}>
                <TableColumn>{item.product?.name || "N/A"}</TableColumn>
                <TableColumn className="font-semibold">
                  {item.quantity_in_hand}
                </TableColumn>
                <TableColumn>
                  {formatJalaliDate(item.createdAt)}
                </TableColumn>
                <TableColumn>
                  <div className={`flex items-center gap-x-3`}>
                    <CgEye
                      className=" text-[18px] hover:bg-slate-200 text-yellow-400 rounded-full"
                      onClick={() => handleShowDetails(item)}
                    />
                    <BiTransferAlt
                      className=" text-[18px] hover:bg-slate-200 text-red-400 rounded-full"
                      onClick={() => handleTransfer(item)}
                    />
                  </div>
                </TableColumn>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Edit */}

      {/* Details Modal */}
      <GloableModal open={showDetails} setOpen={setShowDetails}>
        {selectedItem && (
          <div className="bg-white rounded-sm max-w-2xl w-[600px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                جزئیات موجودی کارمند
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    کارمند
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedItem.employee?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    محصول
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedItem.product?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    تعداد در دست
                  </h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedItem.quantity_in_hand} عدد
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    تاریخ ایجاد
                  </h3>
                  <p className="text-sm text-gray-700">
                    {formatJalaliDateTime(selectedItem.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <div className=" w-[120px]">
                <Button onClick={() => setShowDetails(false)}>بستن</Button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>

      <GloableModal open={showTransfer} setOpen={setShowTransfer}>
        <form
          noValidate
          className="bg-white rounded-lg w-full max-w-md"
          onSubmit={handleSubmit(onSubmitTransfer)}
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
              <p className="font-semibold text-gray-900 mt-0.5">
                {selectedItem?.product?.name || "—"}
              </p>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("inventory.transfer.modal.destination")}
              </span>
              <select
                className={inputStyle}
                value={transferDestination}
                onChange={(e) => setTransferDestination(e.target.value)}
              >
                <option value="warehouse">
                  {t("inventory.locations.warehouse")}
                </option>
                <option value="store">{t("inventory.locations.store")}</option>
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
                  max: selectedItem?.quantity_in_hand,
                }, {
                  allowDecimal: false,
                  className: inputStyle,
                  placeholder: t("inventory.transfer.modal.quantityPlaceholder"),
                })}
              />
            </label>
          </div>
          <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
            <Button
              onClick={() => setShowTransfer(false)}
              type="button"
              className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              {t("inventory.transfer.modal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary-brown-light text-white"
              disabled={
                isTransferBusy ||
                !quantityValue ||
                quantityNumber <= 0 ||
                quantityNumber > (selectedItem?.quantity_in_hand || 0)
              }
              isLoading={isTransferBusy}
            >
              {t("inventory.transfer.modal.submit")}
            </Button>
          </div>
        </form>
      </GloableModal>

      {/* Delete Confirmation */}
    </section>
  );
};

export default Employee;
