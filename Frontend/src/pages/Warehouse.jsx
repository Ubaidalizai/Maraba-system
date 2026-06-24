import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { BiLoaderAlt, BiTransferAlt } from "react-icons/bi";
import { CgEye } from "react-icons/cg";
import { PencilIcon } from "@heroicons/react/24/outline";
import { IoMdClose } from "react-icons/io";
import Button from "../components/Button";
import GloableModal from "../components/GloableModal";
import StockTransferModal from "../components/StockTransferModal";
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
import {
  formatNumber,
  formatNotifyDaysBefore,
  formatJalaliDate,
} from "../utilies/helper";
import StockPurchasePriceDisplay from "../components/StockPurchasePriceDisplay";
import StockQuantityDisplay from "../components/StockQuantityDisplay";
import { getStockStatus } from "../utilies/stockStatus";
import { inputStyle } from "./../components/ProductForm";
import { registerNumeric } from "../utilies/numericInput";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import StockPurchaseCostExpiryFields from "../components/StockPurchaseCostExpiryFields";

function Warehouse() {
  const { t } = useTranslation();

  const tableHeader = useMemo(
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
  const {
    register: editRegister,
    handleSubmit,
    reset,
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
        : "unknown";

  const warehouseTransferOptions = useMemo(
    () => [
      {
        value: "warehouse-store",
        label: t("inventory.transfer.modal.types.warehouseStore"),
      },
      {
        value: "warehouse-employee",
        label: t("inventory.transfer.modal.types.warehouseEmployee"),
      },
    ],
    [t]
  );

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
        minLevel: selectedPro?.minLevel,
        notifyDaysBefore:
          selectedPro?.product?.notifyDaysBefore != null
            ? selectedPro.product.notifyDaysBefore
            : "",
      });
    },
    [selectedPro, reset]
  );
  const onSubmitEdit = editSubmitLock.wrapSubmit(async (data) => {
    const stockData = {
      minLevel: data.minLevel,
      notifyDaysBefore: data.notifyDaysBefore,
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
                <TableColumn>
                  {row?.location === "warehouse"
                    ? t("inventory.locations.warehouse")
                    : row?.location}
                </TableColumn>
                <TableColumn>{row?.unit?.name || row?.unit}</TableColumn>
                <TableColumn>
                  <StockPurchasePriceDisplay
                    pricePerBase={row?.purchasePricePerBaseUnit ?? 0}
                    primaryUnit={row?.unit}
                  />
                </TableColumn>
                <TableColumn>
                  <StockQuantityDisplay
                    quantity={row?.quantity}
                    unit={row?.unit}
                  />
                </TableColumn>
                <TableColumn>
                  {row?.expiryDate ? formatJalaliDate(row.expiryDate) : "—"}
                </TableColumn>
                <TableColumn>
                  {formatNotifyDaysBefore(row?.product?.notifyDaysBefore, t)}
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
              <h2 className="text-2xl font-bold text-gray-900">د ګودام جزئیات</h2>
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
                    د بچ شمېره
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
                    د رانیول بیه/واحد
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    <StockPurchasePriceDisplay
                      pricePerBase={selectedPro?.purchasePricePerBaseUnit ?? 0}
                      primaryUnit={selectedPro?.unit}
                    />
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    په ګودام کې موجودی
                  </h3>
                  <p className="text-2xl text-purple-600">
                    {selectedPro?.location === "warehouse" ? (
                      <StockQuantityDisplay
                        quantity={selectedPro?.quantity}
                        unit={selectedPro?.unit}
                      />
                    ) : (
                      formatNumber(0)
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    لړترلړه کچه
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.product?.minLevel ?? 0} دانې
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    {t("inventory.stockEdit.expiryDateLabel")}
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro?.expiryDate
                      ? formatJalaliDate(selectedPro.expiryDate)
                      : "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    {t("inventory.product.notifyDaysLabel")}
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNotifyDaysBefore(
                      selectedPro?.product?.notifyDaysBefore,
                      t
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end w-[120px]">
              <Button onClick={() => setShow(false)}>
                {t("inventory.product.close")}
              </Button>
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
            <p className=" text-xl font-semibold">
              {t("inventory.stockEdit.warehouseTitle")}
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmitEdit)} noValidate>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <StockPurchaseCostExpiryFields
                  stockId={selectedPro?._id}
                  purchasePricePerBaseUnit={
                    selectedPro?.purchasePricePerBaseUnit
                  }
                  primaryUnit={selectedPro?.unit}
                  expiryDate={selectedPro?.expiryDate || selectedPro?.expiry_date}
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
                    htmlFor="notifyDaysBefore"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("inventory.product.form.notifyDaysBefore")}
                  </label>
                  <input
                    id="notifyDaysBefore"
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
                isLoading={isEditBusy}
                disabled={isEditBusy}
              >
                {t("inventory.stockEdit.submitWarehouse")}
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
      <StockTransferModal
        open={showTransfer}
        setOpen={setShowTransfer}
        productName={selectedPro?.product?.name || selectedPro?.product}
        batchNumber={selectedPro?.batchNumber}
        transferTypeOptions={warehouseTransferOptions}
        register={transferRegister}
        handleSubmit={transferHandleSubmit}
        onSubmit={onSubmit}
        needsEmployee={needsEmployee}
        employees={employees?.data || []}
        stockRow={selectedPro}
        quantity={quantity}
        employee={employee}
        isBusy={isTransferBusy}
      />
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
