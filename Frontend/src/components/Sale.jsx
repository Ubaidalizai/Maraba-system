import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Table from "./Table";
import SearchInput from "./SearchInput";
import Select from "./Select";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import { formatCurrency } from "../utilies/helper";
import TableMenuModal from "./TableMenuModal";
import Menus from "./Menu";
import { HiPencil, HiSquare2Stack, HiTrash } from "react-icons/hi2";
import {
  useCustomers,
  useDeleteSales,
  useEmployees,
  useSales,
} from "../services/useApi";
import Spinner from "./Spinner";
import TableRow from "./TableRow";
import TableColumn from "./TableColumn";
import Confirmation from "./Confirmation";
import GloableModal from "./GloableModal";
import Button from "./Button";

function formatSaleDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ps-AF", { dateStyle: "medium" });
  } catch {
    return "";
  }
}

function Sale({ getBillTypeColor, getPaymentStatusColor }) {
  const { t } = useTranslation();
  const { data: filteredSales, isLoading } = useSales();
  const { data: customers, isLoading: isCustomerLoading } = useCustomers();
  const { data: employees, isLoading: isEmployeeLoading } = useEmployees();
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const { mutate: deleteSale } = useDeleteSales();

  const salesHeader = useMemo(
    () => [
      { title: t("saleBilling.headers.billNumber") },
      { title: t("saleBilling.headers.date") },
      { title: t("saleBilling.headers.customer") },
      { title: t("saleBilling.headers.employee") },
      { title: t("saleBilling.headers.lineItems") },
      { title: t("saleBilling.headers.total") },
      { title: t("saleBilling.headers.amountPaid") },
      { title: t("saleBilling.headers.balanceDue") },
      { title: t("saleBilling.headers.invoiceType") },
      { title: t("saleBilling.headers.paymentStatus") },
      { title: t("saleBilling.headers.actions") },
    ],
    [t]
  );

  const productHeader = useMemo(
    () => [
      { title: t("saleBilling.productHeaders.product") },
      { title: t("saleBilling.productHeaders.unit") },
      { title: t("saleBilling.productHeaders.batch") },
      { title: t("saleBilling.productHeaders.quantity") },
      { title: t("saleBilling.productHeaders.cartonCount") },
      { title: t("saleBilling.productHeaders.unitPrice") },
      { title: t("saleBilling.productHeaders.lineTotal") },
    ],
    [t]
  );

  const currentCustomer = (cuid) => {
    return customers?.data?.filter((curr) => curr.id === cuid)[0];
  };
  const currentEmployee = (cuid) => {
    return employees?.data?.filter((curr) => curr.id === cuid)[0];
  };

  if (isLoading || isCustomerLoading || isEmployeeLoading) return <Spinner />;

  return (
    <section>
      <Table
        firstRow={
          <div className=" w-full flex gap-1 justify-around  ">
            <div className="flex-1 flex items-center justify-start">
              <SearchInput placeholder={t("saleBilling.searchPlaceholder")} />
            </div>
            <div className="flex-1">
              <Select
                placeholder={t("saleBilling.filterByPayment")}
                options={[
                  { value: t("saleBilling.filterAllPayments") },
                  { value: t("saleBilling.filterPartial") },
                  { value: t("saleBilling.filterPending") },
                ]}
              />
            </div>
            <div className="flex-1">
              <Select
                placeholder={t("saleBilling.filterAllStates")}
                options={[
                  { value: t("saleBilling.filterAllInvoices") },
                  { value: t("saleBilling.filterHighVolume") },
                  { value: t("saleBilling.filterLowVolume") },
                ]}
              />
            </div>
            <div className="flex-1 flex items-center">
              <Select
                placeholder={t("saleBilling.filterAllStates")}
                options={[{ value: t("saleBilling.filterAllCustomers") }]}
              />
            </div>
          </div>
        }
      >
        <TableHeader headerData={salesHeader} />
        <TableBody>
          {filteredSales?.data?.map((sale, index) => (
            <TableRow key={index}>
              <TableColumn>{sale.id}</TableColumn>
              <TableColumn>{formatSaleDate(sale.saleDate)}</TableColumn>
              <TableColumn>{currentCustomer(sale.customer)?.name}</TableColumn>
              <TableColumn>{currentEmployee(sale.employee)?.name}</TableColumn>
              <TableColumn>
                {t("saleBilling.itemsCount", {
                  count: sale?.items?.length ?? 0,
                })}
              </TableColumn>
              <TableColumn>{formatCurrency(sale.totalAmount)}</TableColumn>
              <TableColumn className=" text-success-green">
                {formatCurrency(sale.paidAmount)}
              </TableColumn>
              <TableColumn className=" text-red-500">
                {formatCurrency(sale.dueAmount)}
              </TableColumn>
              <TableColumn>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBillTypeColor(
                    sale.invoiceType
                  )}`}
                >
                  {sale.invoiceType}
                </span>
              </TableColumn>
              <TableColumn>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                    sale.dueAmount === 0 ? "paid" : "partial"
                  )}`}
                >
                  {sale.dueAmount === 0
                    ? t("saleBilling.paymentPaid")
                    : t("saleBilling.paymentPartial")}
                </span>
              </TableColumn>
              <TableColumn
                className={` relative ${
                  "salesItem" +
                  sale?.id +
                  new Date(sale?.saleDate).getMilliseconds()
                }`}
              >
                <TableMenuModal>
                  <Menus>
                    <Menus.Menu>
                      <Menus.Toggle id={sale?.id} />
                      <Menus.List
                        parent={
                          "salesItem" +
                          sale?.id +
                          new Date(sale?.saleDate).getMilliseconds()
                        }
                        id={sale?.id}
                        className="bg-white rounded-lg shadow-xl"
                      >
                        <Menus.Button
                          icon={<HiSquare2Stack />}
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowModal(true);
                          }}
                        >
                          {t("saleBilling.actions.view")}
                        </Menus.Button>

                        <Menus.Button icon={<HiPencil />}>
                          {t("saleBilling.actions.edit")}
                        </Menus.Button>

                        <TableMenuModal.Open opens="delete">
                          <Menus.Button icon={<HiTrash />}>
                            {t("saleBilling.actions.delete")}
                          </Menus.Button>
                        </TableMenuModal.Open>
                      </Menus.List>
                    </Menus.Menu>

                    <TableMenuModal.Window name="delete" className={""}>
                      <Confirmation
                        type="delete"
                        handleClick={() => deleteSale(sale?.id)}
                        handleCancel={() => {}}
                      />
                    </TableMenuModal.Window>
                  </Menus>
                </TableMenuModal>
              </TableColumn>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <GloableModal open={showModal} setOpen={setShowModal}>
        {selectedSale && (
          <div className="bg-white rounded-sm  shadow-sm  w-[600px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("saleBilling.detailsTitle")}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.saleNumber")}
                  </h3>
                  <p className="text-lg font-semibold">{selectedSale?.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.headers.date")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {formatSaleDate(selectedSale.saleDate)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.headers.customer")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {currentCustomer(selectedSale.customer)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.seller")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {currentEmployee(selectedSale.employee)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.saleType")}
                  </h3>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getBillTypeColor(
                      selectedSale.invoiceType
                    )}`}
                  >
                    {selectedSale.invoiceType}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {t("saleBilling.paymentType")}
                  </h3>
                  <p className="text-lg font-semibold capitalize">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                        selectedSale.dueAmount === 0 ? "paid" : "partial"
                      )}`}
                    >
                      {selectedSale.dueAmount === 0
                        ? t("saleBilling.paymentPaid")
                        : t("saleBilling.paymentPartial")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <Table className="w-full text-sm">
                  <TableHeader headerData={productHeader} />
                  <TableBody>
                    {selectedSale?.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableColumn>{item.product}</TableColumn>
                        <TableColumn>{item.unit}</TableColumn>
                        <TableColumn>{item.batchNumber}</TableColumn>
                        <TableColumn>{item.quantity}</TableColumn>
                        <TableColumn>{item.cartonCount || "-"}</TableColumn>
                        <TableColumn>{item.unitPrice}</TableColumn>
                        <TableColumn>{item.totalPrice}</TableColumn>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t("saleBilling.subtotal")}:</span>
                    <span className="font-semibold"></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("saleBilling.discount")}:</span>
                    <span className="font-semibold text-red-600">
                      {selectedSale?.discount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("saleBilling.tax")}:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedSale?.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold text-lg">
                      {t("saleBilling.total")}:
                    </span>
                    <span className="font-bold text-xl text-amber-600">
                      {formatCurrency(selectedSale?.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">
                      {t("saleBilling.paid")}:
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(selectedSale.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">{t("saleBilling.owed")}:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(selectedSale.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <div className=" w-[160px] ">
                <Button
                  onClick={() => setShowModal(false)}
                  className=" bg-warning-orange text-white rounded-lg"
                >
                  {t("saleBilling.close")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
    </section>
  );
}

export default Sale;
