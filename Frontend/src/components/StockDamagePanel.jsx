import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { toast } from "react-toastify";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import { BiLoaderAlt } from "react-icons/bi";
import { bindNumericControlled } from "../utilies/numericInput";

import {

  useStockDamages,

  useCreateStockDamage,

  useDeleteStockDamage,

  useProductsFromStock,

  useProducts,

  useUnits,

  useEmployees,

} from "../services/useApi";

import { fetchEmployeeStockByEmployee } from "../services/apiUtiles";

import { formatCurrency, formatNumber, formatJalaliDate } from "../utilies/helper";

import GloableModal from "./GloableModal";

import Confirmation from "./Confirmation";

import { useQuery } from "@tanstack/react-query";



const DAMAGE_TYPES = ["broken", "expired", "spoiled", "theft", "other"];



const emptyLine = () => ({

  productId: "",

  unitId: "",

  batchNumber: "",

  quantity: "",

});



const productIdFromRow = (row) =>

  String(row.product?._id ?? row.product ?? "");



const rowQty = (row) => Number(row.quantity ?? row.quantity_in_hand ?? 0);



/** Units assigned to the product (base + derived when applicable). */

function getUnitsForProduct(product, allUnits) {

  if (!product || !allUnits?.length) return [];



  const productUnitId = product.baseUnit?._id || product.baseUnit;

  if (!productUnitId) return [];



  const productUnit = allUnits.find((u) => u._id === productUnitId);

  if (!productUnit) return [];



  if (productUnit.base_unit) {

    const baseUnitId = productUnit.base_unit._id || productUnit.base_unit;

    const baseUnit = allUnits.find((u) => u._id === baseUnitId);

    return baseUnit ? [baseUnit, productUnit] : [productUnit];

  }



  return [productUnit];

}



/** Default to the root base unit when the product uses a derived unit. */

function getDefaultUnitIdForProduct(product, allUnits) {

  const productUnitId = product?.baseUnit?._id || product?.baseUnit;

  if (!productUnitId || !allUnits?.length) return "";



  const productUnit = allUnits.find((u) => u._id === productUnitId);

  if (!productUnit) return "";



  if (productUnit.base_unit) {

    return productUnit.base_unit._id || productUnit.base_unit;

  }



  return productUnitId;

}

function summarizeDamageItems(items) {
  if (!items?.length) return ["—"];
  return items.map((item) => {
    const name = item.product?.name || "—";
    const qty = item.quantity ?? 0;
    const unitName = item.unit?.name || "";
    const batch =
      item.batchNumber && item.batchNumber !== "DEFAULT"
        ? ` (${item.batchNumber})`
        : "";
    return unitName
      ? `${name}${batch} — ${qty} ${unitName}`
      : `${name}${batch} — ${qty}`;
  });
}

const StockDamagePanel = () => {

  const { t, i18n } = useTranslation();

  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);

  const [location, setLocation] = useState("store");

  const [employeeId, setEmployeeId] = useState("");

  const [damageType, setDamageType] = useState("broken");

  const [description, setDescription] = useState("");

  const [lines, setLines] = useState([emptyLine()]);

  const [deleteId, setDeleteId] = useState(null);



  const { data: listResp, isLoading } = useStockDamages({ page, limit: 15 });

  const { mutate: createDamage, isPending: creating } = useCreateStockDamage();

  const { mutate: deleteDamage, isPending: deleting } = useDeleteStockDamage();

  const { data: unitsData } = useUnits();

  const { data: productsData } = useProducts();

  const { data: employeesData } = useEmployees();



  const { data: storeStock, isLoading: storeStockLoading } = useProductsFromStock(

    "store",

    false,

    { enabled: showForm && location === "store" }

  );

  const { data: warehouseStock, isLoading: warehouseStockLoading } =

    useProductsFromStock("warehouse", false, {

      enabled: showForm && location === "warehouse",

    });



  const { data: employeeStock, isLoading: employeeStockLoading } = useQuery({

    queryKey: ["employeeStockDamage", employeeId],

    queryFn: () => fetchEmployeeStockByEmployee(employeeId),

    enabled: showForm && location === "employee" && !!employeeId,

  });



  const stockRows = useMemo(() => {

    if (location === "employee") {

      if (!employeeId) return [];

      const rows = employeeStock?.data || employeeStock || [];

      return (Array.isArray(rows) ? rows : []).filter((r) => rowQty(r) > 0);

    }

    if (location === "warehouse") {

      const rows = Array.isArray(warehouseStock) ? warehouseStock : [];

      return rows.filter((r) => rowQty(r) > 0);

    }

    if (location === "store") {

      const rows = Array.isArray(storeStock) ? storeStock : [];

      return rows.filter((r) => rowQty(r) > 0);

    }

    return [];

  }, [location, employeeId, employeeStock, storeStock, warehouseStock]);



  const stockLoading =

    (location === "store" && storeStockLoading) ||

    (location === "warehouse" && warehouseStockLoading) ||

    (location === "employee" && !!employeeId && employeeStockLoading);



  const units = unitsData?.data || unitsData || [];

  const products = productsData?.data || productsData || [];

  const employees = employeesData?.data || employeesData || [];

  const records = listResp?.data || [];



  const locationReady =

    location !== "employee" || (location === "employee" && !!employeeId);



  const formatDate = formatJalaliDate;



  const productOptions = useMemo(() => {

    const map = new Map();

    stockRows.forEach((row) => {

      const id = productIdFromRow(row);

      const name = row.product?.name;

      if (id && name) map.set(id, name);

    });

    return Array.from(map.entries())

      .map(([id, name]) => ({ id, name }))

      .sort((a, b) => a.name.localeCompare(b.name, "ps"));

  }, [stockRows]);



  const getBatchesForProduct = (productId) => {

    if (!productId) return [];

    const id = String(productId);

    const seen = new Set();

    const batches = [];

    stockRows

      .filter((r) => productIdFromRow(r) === id)

      .forEach((r) => {

        const batchNumber = r.batchNumber || "DEFAULT";

        if (seen.has(batchNumber)) return;

        seen.add(batchNumber);

        batches.push({

          batchNumber,

          qty: rowQty(r),

        });

      });

    return batches;

  };



  const getProductById = (productId) =>

    products.find((p) => p._id === productId);



  const handleProductChange = (index, productId) => {

    const product = getProductById(productId);

    const defaultUnitId = getDefaultUnitIdForProduct(product, units);

    const batches = getBatchesForProduct(productId);

    const defaultBatch =

      product?.trackByBatch && batches.length === 1

        ? batches[0].batchNumber

        : "";



    setLines((prev) =>

      prev.map((line, i) =>

        i === index

          ? {

              ...line,

              productId,

              unitId: defaultUnitId,

              batchNumber: defaultBatch,

              quantity: line.quantity,

            }

          : line

      )

    );

  };



  const updateLine = (index, field, value) => {

    setLines((prev) =>

      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))

    );

  };



  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index) =>

    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));



  const handleSubmit = () => {

    if (location === "employee" && !employeeId) {

      toast.error(t("inventory.damage.selectEmployee"));

      return;

    }



    const items = [];

    for (const line of lines) {

      const qty = parseFloat(line.quantity);

      if (!line.productId || !line.unitId || !qty || qty <= 0) {

        toast.error(t("inventory.damage.fillAllLines"));

        return;

      }



      const product = getProductById(line.productId);

      if (product?.trackByBatch && !line.batchNumber) {

        toast.error(t("inventory.damage.selectBatch"));

        return;

      }



      items.push({

        product: line.productId,

        unit: line.unitId,

        quantity: qty,

        ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),

      });

    }



    createDamage(

      {

        location,

        employee: location === "employee" ? employeeId : undefined,

        damageType,

        description: description.trim() || undefined,

        items,

      },

      {

        onSuccess: (res) => {
          const count =
            res?.count ?? (Array.isArray(res?.data) ? res.data.length : 1);
          toast.success(
            count > 1
              ? t("inventory.damage.createSuccessMultiple", { count })
              : t("inventory.damage.createSuccess")
          );

          setShowForm(false);

          setLines([emptyLine()]);

          setDescription("");

        },

        onError: (err) => {

          toast.error(`${t("inventory.damage.createError")}: ${err.message}`);

        },

      }

    );

  };



  const confirmDelete = () => {

    if (!deleteId) return;

    deleteDamage(

      { id: deleteId, reason: t("inventory.damage.cancelReason") },

      {

        onSuccess: () => {

          toast.success(t("inventory.damage.deleteSuccess"));

          setDeleteId(null);

        },

        onError: (err) => {

          toast.error(`${t("inventory.damage.deleteError")}: ${err.message}`);

        },

      }

    );

  };



  return (

    <div className="p-4 space-y-4">

      <div className="flex justify-between items-center flex-wrap gap-2">

        <p className="text-sm text-gray-600">{t("inventory.damage.subtitle")}</p>

        <button

          type="button"

          onClick={() => setShowForm(true)}

          className="px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 flex items-center gap-2 text-sm"

        >

          <PlusIcon className="h-4 w-4" />

          {t("inventory.damage.recordDamage")}

        </button>

      </div>



      {isLoading ? (

        <div className="flex justify-center py-12">

          <BiLoaderAlt className="text-2xl animate-spin" />

        </div>

      ) : records.length === 0 ? (

        <p className="text-center text-gray-500 py-8">{t("inventory.damage.empty")}</p>

      ) : (

        <div className="overflow-x-auto border border-gray-200 rounded-lg">

          <table className="min-w-full divide-y divide-gray-200 text-sm">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.date")}</th>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.location")}</th>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.type")}</th>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.product")}</th>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.loss")}</th>

                <th className="px-3 py-2 text-right">{t("inventory.damage.table.actions")}</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {records.map((row) => (

                <tr key={row._id} className="hover:bg-gray-50">

                  <td className="px-3 py-2">{formatDate(row.damageDate)}</td>

                  <td className="px-3 py-2">

                    {t(`inventory.locations.${row.location}`)}

                    {row.employee?.name ? ` — ${row.employee.name}` : ""}

                  </td>

                  <td className="px-3 py-2">

                    {t(`inventory.damage.types.${row.damageType}`)}

                  </td>

                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {summarizeDamageItems(row.items).map((text, idx) => (
                        <div key={idx} className="text-gray-900">
                          {text}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-3 py-2 font-medium text-red-600">

                    {formatCurrency(row.totalLossAmount || 0)}

                  </td>

                  <td className="px-3 py-2">

                    <button

                      type="button"

                      onClick={() => setDeleteId(row._id)}

                      className="text-red-600 hover:text-red-800"

                      title={t("inventory.damage.cancel")}

                    >

                      <TrashIcon className="h-4 w-4" />

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}



      {showForm && (

        <GloableModal open={showForm} setOpen={setShowForm} isClose>

          <div className="w-[560px] max-h-[90vh] overflow-y-auto bg-white rounded-md p-6 space-y-4">

            <h2 className="text-xl font-bold">{t("inventory.damage.formTitle")}</h2>



            <div className="grid grid-cols-2 gap-3">

              <div>

                <label className="block text-sm font-medium mb-1">

                  {t("inventory.damage.location")}

                </label>

                <select

                  value={location}

                  onChange={(e) => {

                    setLocation(e.target.value);

                    setEmployeeId("");

                    setLines([emptyLine()]);

                  }}

                  className="w-full border rounded-sm px-3 py-2"

                >

                  <option value="store">{t("inventory.locations.store")}</option>

                  <option value="warehouse">{t("inventory.locations.warehouse")}</option>

                  <option value="employee">{t("inventory.locations.employee")}</option>

                </select>

              </div>

              <div>

                <label className="block text-sm font-medium mb-1">

                  {t("inventory.damage.damageType")}

                </label>

                <select

                  value={damageType}

                  onChange={(e) => setDamageType(e.target.value)}

                  className="w-full border rounded-sm px-3 py-2"

                >

                  {DAMAGE_TYPES.map((dt) => (

                    <option key={dt} value={dt}>

                      {t(`inventory.damage.types.${dt}`)}

                    </option>

                  ))}

                </select>

              </div>

            </div>



            {location === "employee" && (

              <div>

                <label className="block text-sm font-medium mb-1">

                  {t("inventory.damage.employee")}

                </label>

                <select

                  value={employeeId}

                  onChange={(e) => {

                    setEmployeeId(e.target.value);

                    setLines([emptyLine()]);

                  }}

                  className="w-full border rounded-sm px-3 py-2"

                >

                  <option value="">{t("inventory.damage.selectEmployee")}</option>

                  {employees.map((emp) => (

                    <option key={emp._id} value={emp._id}>

                      {emp.name}

                    </option>

                  ))}

                </select>

              </div>

            )}



            {stockLoading && locationReady ? (

              <div className="flex justify-center py-4">

                <BiLoaderAlt className="text-xl animate-spin text-amber-600" />

              </div>

            ) : null}



            {locationReady && !stockLoading && productOptions.length === 0 ? (

              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">

                {t("inventory.damage.noStockAtLocation")}

              </p>

            ) : null}



            {lines.map((line, index) => {

              const lineProduct = getProductById(line.productId);

              const lineUnits = getUnitsForProduct(lineProduct, units);

              const batches = getBatchesForProduct(line.productId);

              const showBatch =

                lineProduct?.trackByBatch && batches.length > 0;



              return (

                <div

                  key={index}

                  className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"

                >

                  <div className="flex justify-between items-center">

                    <span className="text-sm font-medium">

                      {t("inventory.damage.line")} {index + 1}

                    </span>

                    {lines.length > 1 && (

                      <button

                        type="button"

                        onClick={() => removeLine(index)}

                        className="text-red-600 text-xs"

                      >

                        {t("inventory.damage.removeLine")}

                      </button>

                    )}

                  </div>

                  <select

                    value={line.productId}

                    onChange={(e) => handleProductChange(index, e.target.value)}

                    disabled={!locationReady || stockLoading}

                    className="w-full border rounded-sm px-3 py-2 disabled:bg-gray-100"

                  >

                    <option value="">{t("inventory.damage.selectProduct")}</option>

                    {productOptions.map((p) => (

                      <option key={p.id} value={p.id}>

                        {p.name}

                      </option>

                    ))}

                  </select>

                  {showBatch && (

                    <select

                      value={line.batchNumber}

                      onChange={(e) =>

                        updateLine(index, "batchNumber", e.target.value)

                      }

                      className="w-full border rounded-sm px-3 py-2"

                    >

                      <option value="">{t("inventory.damage.selectBatch")}</option>

                      {batches.map((b) => (

                        <option key={b.batchNumber} value={b.batchNumber}>

                          {b.batchNumber} ({formatNumber(b.qty)})

                        </option>

                      ))}

                    </select>

                  )}

                  <div className="grid grid-cols-2 gap-2">

                    <select

                      value={line.unitId}

                      onChange={(e) => updateLine(index, "unitId", e.target.value)}

                      disabled={!line.productId || lineUnits.length === 0}

                      className="w-full border rounded-sm px-3 py-2 disabled:bg-gray-100"

                    >

                      <option value="">{t("inventory.damage.selectUnit")}</option>

                      {lineUnits.map((u) => (

                        <option key={u._id} value={u._id}>

                          {u.name}

                        </option>

                      ))}

                    </select>

                    <input

                      {...bindNumericControlled({

                        allowDecimal: true,

                        value: line.quantity,

                        onChange: (e) =>

                          updateLine(index, "quantity", e.target.value)

                        ,

                        placeholder: t("inventory.damage.quantity"),

                        disabled: !line.productId,

                        className: "w-full border rounded-sm px-3 py-2 disabled:bg-gray-100",

                      })}

                    />

                  </div>

                </div>

              );

            })}



            <button

              type="button"

              onClick={addLine}

              disabled={!locationReady || productOptions.length === 0}

              className="text-sm text-amber-700 hover:underline disabled:text-gray-400 disabled:no-underline"

            >

              + {t("inventory.damage.addLine")}

            </button>



            <div>

              <label className="block text-sm font-medium mb-1">

                {t("inventory.damage.description")}

              </label>

              <textarea

                value={description}

                onChange={(e) => setDescription(e.target.value)}

                rows={2}

                className="w-full border rounded-sm px-3 py-2"

              />

            </div>



            <div className="flex justify-end gap-2 pt-2">

              <button

                type="button"

                onClick={() => setShowForm(false)}

                className="px-4 py-2 border rounded-sm"

              >

                {t("inventory.damage.cancel")}

              </button>

              <button

                type="button"

                onClick={handleSubmit}

                disabled={creating || !locationReady || productOptions.length === 0}

                className="px-4 py-2 bg-amber-600 text-white rounded-sm disabled:opacity-50"

              >

                {creating ? t("inventory.damage.saving") : t("inventory.damage.save")}

              </button>

            </div>

          </div>

        </GloableModal>

      )}



      {deleteId && (

        <GloableModal open={!!deleteId} setOpen={() => setDeleteId(null)} isClose>

          <Confirmation

            handleClick={confirmDelete}

            handleCancel={() => setDeleteId(null)}

          />

        </GloableModal>

      )}

    </div>

  );

};



export default StockDamagePanel;


