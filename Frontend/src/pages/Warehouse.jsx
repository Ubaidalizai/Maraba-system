import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { BiLoaderAlt, BiTransferAlt } from "react-icons/bi";
import { CgEye } from "react-icons/cg";
import { PencilIcon } from "@heroicons/react/24/outline";
import { IoMdClose } from "react-icons/io";
import Button from "../components/Button";
import GloableModal from "../components/GloableModal";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import Pagination from "../components/Pagination";
import {
  useCreateStockTransfer,
  useEmployees,
  useUpdateInventory,
  useWarehouseStocks,
} from "../services/useApi";
import { formatNumber, normalizeDateToIso } from "../utilies/helper";
import { getStockStatus } from "../utilies/stockStatus";
import { inputStyle } from "./../components/ProductForm";
import { formatCurrency } from "../utilies/helper";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import JalaliDatePicker from "../components/JalaliDatePicker";

// Headers aligned with Backend stock.model.js
const tableHeader = [
  { title: "محصول" },
  { title: "نمبر بچ" },
  { title: "واحد" },
  { title: "موقعیت" },
  { title: "تاریخ انقضا" },
  { title: "قیمت خرید" },
  { title: "تعداد" },
  { title: "حداقل موجودی" },
  { title: "حالت" },
  { title: "عملیات" },
];
function Warehouse() {
  const {
    register: editRegister,
    handleSubmit,
    reset,
    formState: { errors },
    setValue: editSetValue,
    watch: editWatch,
  } = useForm();
  const { mutate: updateInventory, isPending: isUpdatingInventory } =
    useUpdateInventory();
  const [showTransfer, setShowTransfer] = useState(false);
  const {
    register: transferRegister,
    handleSubmit: transferHandleSubmit,
    watch: transferWatch,
    reset: transferReset,
  } = useForm();
  const [show, setShow] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { mutate: createStockTransfer, isPending: isCreatingTransfer } =
    useCreateStockTransfer();
  const transferSubmitLock = useSubmitLock();
  const editSubmitLock = useSubmitLock();
  const { data: warehouseData, isLoading } = useWarehouseStocks({
    search,
    page,
    limit,
  });
  const warehouses = warehouseData?.data || warehouseData || [];

  const transferType = transferWatch("transferType") || "warehouse-store";
  const quantity = transferWatch("quantity");
  const employee = transferWatch("employee");
  const selectedUnit = transferWatch("unit");

  const { data: employees } = useEmployees();
  // Example fromLocation/toLocation logic
  let fromLocation = selectedPro?.location;
  let toLocation =
    transferType === "warehouse-store"
      ? fromLocation === "store"
        ? "warehouse"
        : "store"
      : transferType === "warehouse-employee"
      ? "employee"
      : transferType === "employee-store"
      ? "store"
      : transferType === "warehouse-employee"
      ? "employee"
      : transferType === "employee-warehouse"
      ? "warehouse"
      : "unknown";

  const needsEmployee = [
    "warehouse-employee",
    "employee-warehouse",
    "employee-store",
    "store-employee",
  ].includes(transferType);
  const runMutation = (mutateFn, payload) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: resolve,
        onError: reject,
      });
    });

  const onSubmit = transferSubmitLock.wrapSubmit(async (data) => {
    if (!data.quantity || data.quantity <= 0) return;
    const stockTransfer = {
      product: selectedPro.product?._id || selectedPro.product,
      fromLocation: fromLocation,
      toLocation: toLocation,
      employee: needsEmployee ? employee : undefined,
      quantity: Number(quantity),
      unit: selectedUnit || selectedPro.unit?._id,
      notes: "", // optional notes
    };
    await runMutation(createStockTransfer, stockTransfer);
    transferReset({ transferType: "warehouse-store", quantity: "", employee: "", unit: "" });
    setShowTransfer(false);
  });
  const isTransferBusy =
    isCreatingTransfer || transferSubmitLock.isSubmitting;
  const isEditBusy = isUpdatingInventory || editSubmitLock.isSubmitting;

  useEffect(
    function () {
      reset({
        purchasePricePerBaseUnit: selectedPro?.purchasePricePerBaseUnit,
        minLevel: selectedPro?.minLevel,
        expiry_date: normalizeDateToIso(selectedPro?.expiryDate || selectedPro?.expiry_date),
      });
    },
    [selectedPro, reset]
  );
  const editExpiryValue = editWatch("expiry_date") || "";
  const onSubmitEdit = editSubmitLock.wrapSubmit(async (data) => {
    // Convert empty expiry_date to null (backend expects null, not empty string)
    const stockData = {
      ...data,
      expiry_date: normalizeDateToIso(data.expiry_date) || null,
    };
    await runMutation(updateInventory, { id: selectedPro._id, stockData });
    setShowEdit(false);
  });
  // keep the page mounted while loading so inputs don't lose focus
  // show an inline loader in the table area instead of unmounting whole page
  return (
    <section>
      <div className="w-full flex bg-white border border-slate-200 rounded-md py-3  my-1.5 ">
          <div className=" flex-1  flex justify-start items-end pr-3">
          <SearchInput
            placeholder="جستجو بر اساس نام محصول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Table>
        <TableHeader headerData={tableHeader} />
        <TableBody>
          {isLoading ? (
            <TableRow key="loading">
              <TableColumn colSpan={tableHeader.length} className="text-center">
                <div className=" w-full h-[120px] flex justify-center items-center">
                  <BiLoaderAlt className=" text-2xl animate-spin" />
                </div>
              </TableColumn>
            </TableRow>
          ) : (
            warehouses?.map((row) => (
              <TableRow key={row?._id}>
                <TableColumn>{row?.product?.name || row?.product}</TableColumn>
                <TableColumn>{row?.batchNumber || "DEFAULT"}</TableColumn>
                <TableColumn>{row?.unit?.name || row?.unit}</TableColumn>
                <TableColumn>
                  {row?.location === "warehouse" ? "گدام" : row?.location}
                </TableColumn>
                <TableColumn>
                  {row?.expiryDate
                    ? new Date(row.expiryDate).toLocaleDateString("fa-IR")
                    : "—"}
                </TableColumn>
                <TableColumn>
                  {formatNumber(row?.purchasePricePerBaseUnit ?? 0)}
                </TableColumn>
                <TableColumn className="font-semibold">
                  <div className="flex flex-col">
                    {row?.derivedQuantity ? (
                      <div>
                        {formatNumber(row.derivedQuantity.derivedUnit)} {formatNumber(row?.quantity)}/{row?.derivedQuantity?.baseUnitName}
                      </div>
                    ) : (
                      <div>{formatNumber(row?.quantity)} {row?.unit?.name}</div>
                    )}
                  </div>
                </TableColumn>
                <TableColumn>{row.minLevel || "_"}</TableColumn>
                <TableColumn>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStockStatus(row?.quantity, row?.minLevel || 0).color
                    }`}
                  >
                    {getStockStatus(row?.quantity, row?.minLevel || 0).label}
                  </span>
                </TableColumn>
                <TableColumn>
                  <div className=" flex items-center gap-2">
                    <CgEye
                      className=" text-[18px] hover:bg-slate-200 text-yellow-400 rounded-full"
                      onClick={() => {
                        setSelectedPro(row);
                        setShow(true);
                      }}
                    />
                    <BiTransferAlt
                      className=" text-[18px] hover:bg-slate-200 text-red-400 rounded-full"
                      onClick={() => {
                        setSelectedPro(row);
                        setShowTransfer(true);
                      }}
                    />
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => {
                        setSelectedPro(row);
                        setShowEdit(true);
                      }}
                      title="ویرایش"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </TableColumn>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <GloableModal open={show} setOpen={setShow}>
        {selectedPro && (
          <div className="bg-white rounded-sm max-w-2xl w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">جزئیات گدام </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    محصول
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.product?.name || selectedPro?.product}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    نمبر بچ
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.batchNumber || "DEFAULT"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    واحد
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.unit?.name || selectedPro?.unit}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    قیمت خرید/واحد
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedPro?.purchasePricePerBaseUnit)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    موجودی در انبار
                  </h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedPro?.location === "warehouse"
                      ? selectedPro?.quantity
                      : 0}{" "}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    حداقل سطح موجودی
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.product?.minLevel ?? 0} عدد
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    تاریخ انقضا
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.expiryDate
                      ? new Date(selectedPro.expiryDate).toLocaleDateString(
                          "fa-IR"
                        )
                      : "در دسترس نیست"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end w-[120px]">
              <Button onClick={() => setShow(false)}>بستن</Button>
            </div>
          </div>
        )}
      </GloableModal>
      <GloableModal open={showEdit} setOpen={setShowEdit} isClose={true}>
        <div className="w-[500px] bg-white p-3 rounded-md ">
          <div className=" border-b border-slate-300 pb-3 relative">
            <IoMdClose
              className=" absolute top-2/4 left-2 -translate-y-2/4 text-[24px]"
              onClick={() => setShowEdit(false)}
            />
            <p className=" text-xl font-semibold">بروزرسانی گدام</p>
          </div>
          <form onSubmit={handleSubmit(onSubmitEdit)} noValidate>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    قیمت هر واحد
                  </label>
                  <input
                    type="number"
                    className={inputStyle}
                    {...editRegister("purchasePricePerBaseUnit")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کمترین موجودی
                  </label>
                  <input
                    type="number"
                    className={inputStyle}
                    {...editRegister("minLevel")}
                  />
                </div>

                <div>
                  <JalaliDatePicker
                    label="تاریخ انقضا"
                    name="expiry_date"
                    value={editExpiryValue}
                    onChange={(nextValue) =>
                      editSetValue(
                        "expiry_date",
                        normalizeDateToIso(nextValue),
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        }
                      )
                    }
                    placeholder="انتخاب تاریخ"
                    clearable
                    error={errors?.expiry_date?.message}
                  />
                  <input
                    type="hidden"
                    value={editExpiryValue}
                    readOnly
                    {...editRegister("expiry_date", {
                      validate: (value) => {
                        if (!value) return true;
                        const normalized = normalizeDateToIso(value);
                        if (!normalized) return "تاریخ معتبر نیست";

                        const today = new Date();
                        const selected = new Date(normalized);
                        today.setHours(0, 0, 0, 0);
                        selected.setHours(0, 0, 0, 0);

                        const diffInDays = Math.ceil(
                          (selected - today) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          diffInDays >= 10 ||
                          "تاریخ انقضا باید حداقل ۱۰ روز بعد از امروز باشد"
                        );
                      },
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t w-full mx-auto border-gray-200 flex justify-end gap-4">
              {/* <Button className=" bg-deepdate-400">لغو کردن</Button> */}
              <Button
                type="submit"
                className={" bg-primary-brown-light text-white"}
                isLoading={isEditBusy}
                disabled={isEditBusy}
              >
                تغییر دادن گدام
              </Button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className={
                  " cursor-pointer group w-full   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200 bg-transparent border  border-slate-700 text-black"
                }
              >
                لغو کردن{" "}
              </button>
            </div>
          </form>
        </div>
      </GloableModal>
      <GloableModal open={showTransfer} setOpen={setShowTransfer}>
        <form
          noValidate
          className="bg-white rounded-lg  w-[480px] p-2 h-[500px]"
          onSubmit={transferHandleSubmit(onSubmit)}
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">انتقال موجودی</h2>
          </div>
          <div className="p-6 space-y-2">
            <div>
              <span>محصول: </span>
              <span className="font-bold text-amber-700 underline">
                {selectedPro?.product?.name || selectedPro?.product}
              </span>
            </div>
            <div className="flex flex-col  items-center  gap-1 md:flex-row ga-2">
              <label className="flex-1">
                <span className="block text-[12px] font-medium text-gray-600 mb-1">
                  نوع انتقال
                </span>
                <select
                  className={inputStyle}
                  {...transferRegister("transferType")}
                >
                  <option value="warehouse-store">گدام ↔ فروشگاه</option>
                  <option value="warehouse-employee">گدام → کارمند</option>
                </select>
              </label>
              {needsEmployee && (
                <label className="flex-1">
                  <span className="block text-[12px] font-medium text-gray-600 mb-1">
                    کارمند
                  </span>
                  <select
                    className={inputStyle}
                    {...transferRegister("employee")}
                  >
                    <option value="">کارمند را انتخاب کنید</option>
                    {employees?.data?.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex-1">
                <span className="block pb-1 text-sm font-medium text-gray-700 mb-2">
                  از:{" "}
                </span>
                <span className={inputStyle}>
                  {fromLocation === "warehouse"
                    ? "گدام"
                    : fromLocation === "store"
                    ? "فروشگاه"
                    : "کارمند"}
                </span>
              </label>
              <label className="flex-1">
                <span className="block text-sm pb-1 font-medium text-gray-700 mb-2">
                  به:{" "}
                </span>
                <span className={inputStyle}>
                  {toLocation === "warehouse"
                    ? "گدام"
                    : toLocation === "store"
                    ? "فروشگاه"
                    : "کارمند"}
                </span>
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex-1">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  واحد انتقال
                </span>
                <select
                  className={inputStyle}
                  {...transferRegister("unit")}
                >
                  <option value={selectedPro?.unit?._id}>
                    {selectedPro?.unit?.name} (پیش‌فرض)
                  </option>
                  {selectedPro?.unit?.base_unit && (
                    <option value={selectedPro.unit.base_unit._id}>
                      {selectedPro.unit.base_unit.name} (واحد پایه)
                    </option>
                  )}
                </select>
              </label>
              <label className="flex-1">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  تعداد
                </span>
                <input
                  className={inputStyle}
                  type="number"
                  placeholder="تعداد مورد نظر"
                  min="1"
                  {...transferRegister("quantity", { required: true, min: 1 })}
                />
              </label>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
            <Button
              onClick={() => setShowTransfer(false)}
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded-md"
            >
              بستن
            </Button>
            <Button
              type="submit"
              className=" bg-primary-brown-light text-white px-4 py-2 rounded-md"
              disabled={
                !quantity ||
                quantity <= 0 ||
                (needsEmployee && !employee) ||
                isTransferBusy
              }
              isLoading={isTransferBusy}
            >
              انتقال موجودی
            </Button>
          </div>
        </form>
      </GloableModal>
      <Pagination
        currentPage={page}
        totalPages={warehouseData?.totalPages || 1}
        onPageChange={setPage}
        onLimitChange={setLimit}
        limit={limit}
      />
    </section>
  );
}

export default Warehouse;
