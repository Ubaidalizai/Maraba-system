import { MdOutlineDescription } from "react-icons/md";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BiTransferAlt } from "react-icons/bi";
import { ImPriceTag } from "react-icons/im";
import { PencilIcon } from "@heroicons/react/24/outline";
import GloableModal from "../components/GloableModal";
import StockTransferModal from "../components/StockTransferModal";
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
import { registerNumeric } from "../utilies/numericInput";
import Pagination from "../components/Pagination";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import StockPurchaseCostExpiryFields from "../components/StockPurchaseCostExpiryFields";

import {
  useCreateStockTransfer,
  useEmployees,
  useStoreStocks,
  useUpdateInventory,
} from "../services/useApi";
import { formatNotifyDaysBefore, formatJalaliDate } from "../utilies/helper";
import StockPurchasePriceDisplay from "../components/StockPurchasePriceDisplay";
import StockQuantityDisplay from "../components/StockQuantityDisplay";

function Store() {
  const { t } = useTranslation();

  const storeHeader = useMemo(
    () => [
      { title: t("inventory.expiring.table.product") },
      { title: t("inventory.expiring.table.batch") },
      { title: t("inventory.expiring.table.location") },
      { title: t("inventory.expiring.table.unit") },
      { title: t("inventory.product.latestPurchase") },
      { title: t("inventory.expiring.table.quantity") },
      { title: t("inventory.expiring.table.expiryDate") },
      { title: t("inventory.stockEdit.table.notifyDays") },
      { title: t("inventory.product.minLevelLabel") },
      { title: t("inventory.expiring.table.status") },
      { title: t("inventory.product.table.actions") },
    ],
    [t]
  );
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
        minLevel: selectedData?.minLevel,
        notifyDaysBefore:
          selectedData?.product?.notifyDaysBefore != null
            ? selectedData.product.notifyDaysBefore
            : "",
      });
    },
    [selectedData, editReset]
  );
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

  const storeTransferOptions = useMemo(
    () => [
      {
        value: "store-warehouse",
        label: t("inventory.transfer.modal.types.storeWarehouse"),
      },
      {
        value: "store-employee",
        label: t("inventory.transfer.modal.types.storeEmployee"),
      },
    ],
    [t]
  );

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
    const stockData = {
      minLevel: data.minLevel,
      notifyDaysBefore: data.notifyDaysBefore,
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
              <TableColumn>{el?.product?.name || el?.product}</TableColumn>
              <TableColumn>{el?.batchNumber || "DEFAULT"}</TableColumn>
              <TableColumn>
                {el?.location === "store"
                  ? t("inventory.locations.store")
                  : el?.location}
              </TableColumn>
              <TableColumn>{el?.unit?.name || el?.unit}</TableColumn>
              <TableColumn>
                <StockPurchasePriceDisplay
                  pricePerBase={el?.purchasePricePerBaseUnit ?? 0}
                  primaryUnit={el?.unit}
                />
              </TableColumn>
              <TableColumn>
                <StockQuantityDisplay quantity={el?.quantity} unit={el?.unit} />
              </TableColumn>
              <TableColumn>
                {el?.expiryDate
                  ? formatJalaliDate(el.expiryDate)
                  : "—"}
              </TableColumn>
              <TableColumn>
                {formatNotifyDaysBefore(el?.product?.notifyDaysBefore, t)}
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
                  ? "دوکان"
                  : selectedData?.location}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                {/* Unit */}
                <div className=" flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm  font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <Package className=" text-2xl text-palm-500" />
                    <span className="ext-lg text-palm-500">واحد</span>
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
                    <span className="ext-lg text-palm-500">بیه</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    <StockPurchasePriceDisplay
                      pricePerBase={selectedData?.purchasePricePerBaseUnit ?? 0}
                      primaryUnit={selectedData?.unit}
                    />
                  </p>
                </div>

                {/* Expiry date */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">
                      {t("inventory.stockEdit.expiryDateLabel")}
                    </span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedData?.expiryDate
                      ? formatJalaliDate(selectedData.expiryDate)
                      : "—"}
                  </p>
                </div>

                {/* Notify days */}
                <div className="flex flex-col items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">
                      {t("inventory.product.notifyDaysLabel")}
                    </span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNotifyDaysBefore(
                      selectedData?.product?.notifyDaysBefore,
                      t
                    )}
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
                      د ردیابۍ شمېره
                    </span>
                  </h3>
                  <p className="text-gray-800 leading-relaxed text-right">
                    {selectedData?.batchNumber || "DEFAULT"}
                  </p>
                </div>
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center justify-end gap-1">
                    <MdOutlineDescription className="text-2xl text-yellow-500" />
                    <span className="ext-[16px] text-palm-500">تشریح</span>
                  </h3>
                  <p className="text-gray-800 leading-relaxed text-right">
                    {selectedData.description || "هیڅ تشریح نه دی ورکړ شوی"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4   flex justify-end">
              <div className=" w-[120px]">
                <Button onClick={() => setShow(false)}>
                  {t("inventory.product.close")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
      <StockTransferModal
        open={showTransfer}
        setOpen={setShowTransfer}
        productName={selectedData?.product?.name || selectedData?.product}
        batchNumber={selectedData?.batchNumber}
        transferTypeOptions={storeTransferOptions}
        register={register}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        needsEmployee={needsEmployee}
        employees={employees?.data || []}
        stockRow={selectedData}
        quantity={quantity}
        employee={employee}
        isBusy={isCreatingTransfer || transferSubmitLock.isSubmitting}
      />

      {/* show edit */}
      <GloableModal open={showEdit} setOpen={setShowEdit} isClose={true}>
        <div className="w-[500px] bg-white p-3 rounded-md ">
          <div className=" border-b border-slate-300 pb-3 relative">
            <IoMdClose
              className=" absolute top-2/4 left-2 -translate-y-2/4 text-[24px]"
              onClick={() => setShowEdit(false)}
            />
            <p className=" text-xl font-semibold">
              {t("inventory.stockEdit.storeTitle")}
            </p>
          </div>
          <form onSubmit={editHandleSubmit(handleEdit)} noValidate>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <StockPurchaseCostExpiryFields
                  stockId={selectedData?._id}
                  purchasePricePerBaseUnit={
                    selectedData?.purchasePricePerBaseUnit
                  }
                  primaryUnit={selectedData?.unit}
                  expiryDate={selectedData?.expiryDate}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.stockEdit.minLevelLabel")}
                  </label>
                  <input
                    {...registerNumeric("minLevel", editRegister, {}, {
                      className: inputStyle,
                    })}
                  />
                </div>

                <div>
                  <label
                    htmlFor="notifyDaysBefore-store"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("inventory.product.form.notifyDaysBefore")}
                  </label>
                  <input
                    id="notifyDaysBefore-store"
                    {...registerNumeric("notifyDaysBefore", editRegister, {}, {
                      allowDecimal: false,
                      className: inputStyle,
                      placeholder: t(
                        "inventory.product.form.notifyDaysBeforePlaceholder"
                      ),
                    })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {t("inventory.product.form.notifyDaysBeforeHint")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t w-full mx-auto border-gray-200 flex justify-end gap-4">
              <Button
                type="submit"
                className={" bg-primary-brown-light text-white"}
                isLoading={isUpdatingStock || editSubmitLock.isSubmitting}
                disabled={isUpdatingStock || editSubmitLock.isSubmitting}
              >
                {t("inventory.stockEdit.submitStore")}
              </Button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className={
                  " cursor-pointer group w-full   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200 bg-transparent border  border-slate-700 text-black"
                }
              >
                {t("inventory.stockEdit.cancel")}
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
