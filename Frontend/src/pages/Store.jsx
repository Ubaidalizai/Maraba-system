import { MdOutlineDescription } from "react-icons/md";
import { useEffect, useState } from "react";
import { BiTransferAlt } from "react-icons/bi";
import { ImPriceTag } from "react-icons/im";
import { PencilIcon } from "@heroicons/react/24/outline";
import GloableModal from "../components/GloableModal";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import { getStockStatus } from "../utilies/stockStatus";

import { CalendarDays, ClipboardList, Info, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { CgEye } from "react-icons/cg";
import { IoMdClose } from "react-icons/io";
import Button from "../components/Button";
import { inputStyle } from "../components/ProductForm";
import Pagination from "../components/Pagination";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import JalaliDatePicker from "../components/JalaliDatePicker";

import {
  useCreateStockTransfer,
  useEmployees,
  useStoreStocks,
  useUpdateInventory,
} from "../services/useApi";
import { formatNumber, normalizeDateToIso } from "../utilies/helper";
// Headers aligned with Backend stock.model.js for store location
const storeHeader = [
  { title: "نمبر بچ" },
  { title: "موقعیت" },
  { title: "محصول" },
  { title: "تاریخ انقضا" },
  { title: "قیمت خرید" },
  { title: "واحد" },
  { title: "تعداد" },
  { title: "حداقل موجودی" },
  { title: "حالت" },
  { title: "عملیات" },
];

function Store() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const { data: stocks } = useStoreStocks({
    search,
    includeZeroQuantity: true,
    page,
    limit,
  });
  const { data: employees } = useEmployees();
  const { mutate: createUpdateStock, isPending: isUpdatingStock } =
    useUpdateInventory();
  const {
    register,
    handleSubmit,
    watch,
    reset: transferReset,
  } = useForm();
  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    formState: { errors },
    watch: editWatch,
    setValue: editSetValue,
  } = useForm();
  const { mutate: createStockTransfer, isPending: isCreatingTransfer } =
    useCreateStockTransfer();
  const transferSubmitLock = useSubmitLock();
  const editSubmitLock = useSubmitLock();
  const transferType = watch("transferType") || "store-warehouse";
  const quantity = watch("quantity");
  const employee = watch("employee");
  const selectedUnit = watch("unit");

  // Example fromLocation/toLocation logic
  const [selectedData, setSelectedData] = useState(null);
  const [show, setShow] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  useEffect(
    function () {
      editReset({
        purchasePricePerBaseUnit: selectedData?.purchasePricePerBaseUnit,
        minLevel: selectedData?.minLevel,
        expiry_date: normalizeDateToIso(selectedData?.expiryDate),
      });
    },
    [selectedData, editReset]
  );
  const editExpiryValue = editWatch("expiry_date") || "";
  let fromLocation = selectedData?.location;
  let toLocation =
    transferType === "store-warehouse"
      ? fromLocation === "store"
        ? "warehouse"
        : "store"
      : transferType === "store-employee"
      ? "employee"
      : "unknown";

  const needsEmployee = [
    "store-employee",
    "employee-store",
    "warehouse-employee",
    "employee-warehouse",
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
      product: selectedData.product?._id || selectedData.product,
      fromLocation: fromLocation,
      toLocation: toLocation,
      employee: needsEmployee ? employee : undefined,
      quantity: Number(quantity),
      unit: selectedUnit || selectedData.unit?._id,
      transferDate: new Date(),
      transferredBy: "currentUserId", // replace if you have user context
    };
    await runMutation(createStockTransfer, stockTransfer);
    setShowTransfer(false);
    transferReset({
      transferType: "store-warehouse",
      quantity: "",
      employee: "",
      unit: "",
    });
  });
  const handleEdit = editSubmitLock.wrapSubmit(async (data) => {
    // Convert empty expiry_date to null (backend expects null, not empty string)
    const stockData = {
      ...data,
      expiry_date: normalizeDateToIso(data.expiry_date) || null,
    };
    await runMutation(createUpdateStock, { id: selectedData._id, stockData });
    setShowEdit(false);
  });
  return (
    <section>
      <div className=" w-full flex  py-3 my-1.5 border border-slate-200 bg-white rounded-md justify-between ">
        <div className=" w-[200px] md:w-[330px] pr-3">
          <SearchInput
            placeholder="جستجو بر اساس نام محصول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Table>
        <TableHeader headerData={storeHeader} />
        <TableBody>
          {stocks?.data?.map((el) => (
            <TableRow key={el?._id}>
              <TableColumn>{el?.batchNumber || "DEFAULT"}</TableColumn>
              <TableColumn>
                {el?.location === "store" ? "فروشگاه" : el?.location}
              </TableColumn>
              <TableColumn>{el?.product?.name || el?.product}</TableColumn>
              <TableColumn>
                {el?.expiryDate
                  ? new Date(el.expiryDate).toLocaleDateString("fa-IR")
                  : "—"}
              </TableColumn>
              <TableColumn>
                {formatNumber(el?.purchasePricePerBaseUnit ?? 0)}
              </TableColumn>
              <TableColumn>{el?.unit?.name || el?.unit}</TableColumn>
              <TableColumn className="font-semibold">
                <div className="flex flex-col">
                  {el?.derivedQuantity ? (
                    <div>
                      {formatNumber(el.derivedQuantity.derivedUnit)} {formatNumber(el?.quantity)}/{el?.derivedQuantity?.baseUnitName}
                    </div>
                  ) : (
                    <div>{formatNumber(el?.quantity)} {el?.unit?.name}</div>
                  )}
                </div>
              </TableColumn>
              <TableColumn>{el?.minLevel}</TableColumn>
              <TableColumn>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getStockStatus(el?.quantity, el?.minLevel || 0).color
                  }`}
                >
                  {getStockStatus(el?.quantity, el?.minLevel || 0).label}
                </span>
              </TableColumn>
              <TableColumn>
                <div className={`  w-full h-full flex gap-x-3 items-center`}>
                  <CgEye
                    className=" text-[18px] hover:bg-slate-200 text-yellow-400 rounded-full"
                    onClick={() => {
                      setSelectedData(el);
                      setShow(true);
                    }}
                  />
                  <BiTransferAlt
                    className=" text-[18px] hover:bg-slate-200 text-red-400 rounded-full"
                    onClick={() => {
                      setSelectedData(el);
                      setShowTransfer(true);
                      transferReset({
                        transferType: "store-warehouse",
                        quantity: "",
                        employee: "",
                        unit: "",
                      });
                    }}
                  />
                  <button
                    className="text-indigo-600 hover:text-indigo-900"
                    onClick={() => {
                      setSelectedData(el);
                      setShowEdit(true);
                    }}
                    title="ویرایش"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </TableColumn>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* show details */}
      <GloableModal open={show} setOpen={setShow}>
        {selectedData && (
          <div
            dir="rtl"
            className="w-[500px] mx-auto bg-white rounded-sm shadow-sm overflow-hidden"
          >
            <div className=" p-6 text-slate-800 flex  items-center  gap-3 ">
              <p className="text-2xl  font-black">
                {selectedData?._id?.slice(-6)}#
              </p>
              <h2 className="text-2xl font-bold text-palm-500">
                {selectedData?.location === "store"
                  ? "فروشگاه"
                  : selectedData?.location}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                {/* Unit */}
                <div className=" flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm  font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <Package className=" text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">واحد</span>
                  </h3>
                  <p className="text-lg font-semibold text-palm-400">
                    {selectedData?.unit?.name || selectedData?.unit}
                  </p>
                </div>

                {/* Min Quantity */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <ClipboardList className="text-2xl text-palm-500" />
                    <span className="ext-lg text-palm-500">محصول</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedData?.product?.name || selectedData?.product}
                  </p>
                </div>

                {/* Tracker */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <ImPriceTag className="text-2xl text-palm-500" />
                    <span className="ext-lg text-palm-500">قیمت</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedData?.purchasePricePerBaseUnit}
                  </p>
                </div>

                {/* Date */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="ext-lg text-palm-500">تاریخ انقضا</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedData?.expiryDate
                      ? new Date(selectedData.expiryDate).toLocaleDateString(
                          "fa-IR"
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>
              <div className=" grid grid-cols-2">
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center justify-end gap-1">
                    <Info className="text-2xl text-palm-500" />
                    <span className="ext-[16px] text-palm-500">
                      نمبر ردیابی
                    </span>
                  </h3>
                  <p className="text-gray-800 leading-relaxed text-right">
                    {selectedData?.batchNumber || "DEFAULT"}
                  </p>
                </div>
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center justify-end gap-1">
                    <MdOutlineDescription className="text-2xl text-yellow-500" />
                    <span className="ext-[16px] text-palm-500">توضیحات</span>
                  </h3>
                  <p className="text-gray-800 leading-relaxed text-right">
                    {selectedData.description || "No description provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4   flex justify-end">
              <div className=" w-[120px]">
                <Button onClick={() => setShow(false)}>بسته کردن</Button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
      {/* show transfer */}
      <GloableModal open={showTransfer} setOpen={setShowTransfer}>
        <form
          noValidate
          className="bg-white rounded-lg  w-[480px] p-2 h-[500px]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">انتقال موجودی</h2>
          </div>
          <div className="p-6 space-y-2">
            <div>
              <span>محصول: </span>
              <span className="font-bold text-amber-700 underline">
                {selectedData?.product?.name || selectedData?.product}
              </span>
            </div>
            <div className="flex flex-col  items-center  gap-1 md:flex-row ga-2">
              <label className="flex-1">
                <span className="block text-[12px] font-medium text-gray-600 mb-1">
                  نوع انتقال
                </span>
                <select className={inputStyle} {...register("transferType")}>
                  <option value="store-warehouse">فروشگاه ↔ گدام</option>
                  <option value="store-employee">فروشگاه → کارمند</option>
                </select>
              </label>
              {needsEmployee && (
                <label className="flex-1">
                  <span className="block text-[12px] font-medium text-gray-600 mb-1">
                    کارمند
                  </span>
                  <select className={inputStyle} {...register("employee")}>
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
                  {...register("unit")}
                >
                  <option value={selectedData?.unit?._id}>
                    {selectedData?.unit?.name} (پیشفرض)
                  </option>
                  {selectedData?.unit?.base_unit && (
                    <option value={selectedData.unit.base_unit._id}>
                      {selectedData.unit.base_unit.name} (واحد پایه)
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
                  {...register("quantity", { required: true, min: 1 })}
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
                isCreatingTransfer ||
                transferSubmitLock.isSubmitting
              }
              isLoading={isCreatingTransfer || transferSubmitLock.isSubmitting}
            >
              انتقال موجودی
            </Button>
          </div>
        </form>
        {/* 
        <form
          noValidate
          className="bg-white rounded-lg shadow-sm w-[600px]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">انتقال موجودی</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <span>محصول: </span>
              <span className="font-bold">
                {selectedData?.product?.name || selectedData?.product}
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex-1">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  نوع انتقال
                </span>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  {...register("transferType")}
                >
                  <option value="store-warehouse">فروشگاه ↔ گدام</option>
                  <option value="store-employee">فروشگاه → کارمند</option>
                </select>
              </label>
              {needsEmployee && (
                <label className="flex-1">
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    کارمند
                  </span>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    {...register("employee")}
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
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  از:{" "}
                </span>
                <span className="inline-block border rounded-md px-3 py-2 bg-gray-50">
                  {fromLocation === "warehouse"
                    ? "گدام"
                    : fromLocation === "store"
                    ? "فروشگاه"
                    : "کارمند"}
                </span>
              </label>
              <label className="flex-1">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  به:{" "}
                </span>
                <span className="inline-block border rounded-md px-3 py-2 bg-gray-50">
                  {toLocation === "warehouse"
                    ? "گدام"
                    : toLocation === "store"
                    ? "فروشگاه"
                    : "کارمند"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد (واحد پایه)
              </label>
              <input
                className="w-full border rounded-md px-3 py-2"
                type="number"
                min="1"
                {...register("quantity", { required: true, min: 1 })}
              />
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
              className="bg-green-600 text-white px-4 py-2 rounded-md"
              disabled={
                !quantity || quantity <= 0 || (needsEmployee && !employee)
              }
            >
              انتقال موجودی
            </Button>
          </div>
        </form> */}
      </GloableModal>

      {/* show edit */}
      <GloableModal open={showEdit} setOpen={setShowEdit} isClose={true}>
        <div className="w-[500px] bg-white p-3 rounded-md ">
          <div className=" border-b border-slate-300 pb-3 relative">
            <IoMdClose
              className=" absolute top-2/4 left-2 -translate-y-2/4 text-[24px]"
              onClick={() => setShowEdit(false)}
            />
            <p className=" text-xl font-semibold">بروزرسانی گدام</p>
          </div>
          <form onSubmit={editHandleSubmit(handleEdit)} noValidate>
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
                    placeholder="انتخاب تاریخ انقضا"
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
                isLoading={isUpdatingStock || editSubmitLock.isSubmitting}
                disabled={isUpdatingStock || editSubmitLock.isSubmitting}
              >
                عملی کردن تغییرات{" "}
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
      <Pagination
        currentPage={page}
        totalPages={stocks?.totalPages || 1}
        onPageChange={setPage}
        onLimitChange={setLimit}
        limit={limit}
      />
    </section>
  );
}

export default Store;
