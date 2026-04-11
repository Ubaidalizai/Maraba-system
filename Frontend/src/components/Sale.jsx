import React, { useState } from "react";
import Table from "./Table";
import SearchInput from "./SearchInput";
import Select from "./Select";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import { formatCurrency } from "../utilies/helper";
import TableMenuModal from "./TableMenuModal";
import Menus from "./Menu";
import { HiPencil, HiSquare2Stack, HiTrash } from "react-icons/hi2";
import { AiTwotonePrinter } from "react-icons/ai";
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
const salesHeader = [
  { title: "نمبر بیل" },
  { title: "تاریخ" },
  { title: "مشتری" },
  { title: "کارمند" },
  { title: "تعداد حنس" },
  { title: "مجموعه" },
  { title: "پرداخت" },
  { title: "باقی مانده" },
  { title: "نوعیت" },
  { title: "پرداخت" },
  { title: "عملیات" },
];
const productHeader = [
  { title: "محصول" },
  { title: "واحد" },
  { title: "Batch" },
  { title: "تعداد" },
  { title: "تعداد کارتن" },
  { title: "قیمت یک" },
  { title: "مجموع" },
];
function Sale({ getBillTypeColor, getPaymentStatusColor }) {
  const { data: filteredSales, isLoading } = useSales();
  const { data: customers, isLoading: isCustomerLoading } = useCustomers();
  const { data: employees, isLoading: isEmployeeLoading } = useEmployees();
  const [openPrint, setOpenPrint] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const { mutate: deleteSale } = useDeleteSales();
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
              <SearchInput placeholder="لطفا جستجو کنید" />
            </div>
            <div className="flex-1">
              <Select
                placeholder=" بر اساس پرداخت"
                options={[
                  { value: "تمام پرداخت ها" },
                  { value: " پرداخت نسبی" },
                  { value: "پرداخت های معلق" },
                ]}
              />
            </div>
            <div className="flex-1">
              <Select
                placeholder=" تمام حالات"
                options={[
                  { value: "تمام فاکتورها" },
                  { value: "فاکتورهای با حجم بالا" },
                  { value: "فاکتورها با حجم پایین" },
                ]}
              />
            </div>
            <div className="flex-1 flex items-center">
              <Select
                placeholder=" تمام حالات"
                options={[{ value: "تما مشتری ها" }]}
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
              <TableColumn>
                {new Date(sale.saleDate).toLocaleDateString()}
              </TableColumn>
              <TableColumn>{currentCustomer(sale.customer)?.name}</TableColumn>
              <TableColumn>{currentEmployee(sale.employee)?.name}</TableColumn>
              <TableColumn>{sale?.items?.length} items</TableColumn>
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
                  {sale.dueAmount === 0 ? "paid" : "partial"}
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
                          نمایش
                        </Menus.Button>

                        <Menus.Button icon={<HiPencil />}>ویرایش</Menus.Button>

                        <TableMenuModal.Open opens="delete">
                          <Menus.Button icon={<HiTrash />}>حذف</Menus.Button>
                        </TableMenuModal.Open>

                        <Menus.Button
                          icon={<AiTwotonePrinter />}
                          onClick={() => {
                            setSelectedSale(sale);
                            setOpenPrint(true);
                          }}
                        >
                          چاپ
                        </Menus.Button>
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
              <h2 className="text-2xl font-bold text-gray-900">جزئیات فروش</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    نمبر فروش
                  </h3>
                  <p className="text-lg font-semibold">{selectedSale?.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date</h3>
                  <p className="text-lg font-semibold">
                    {new Date(selectedSale.saleDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">مشتری</h3>
                  <p className="text-lg font-semibold">
                    {currentCustomer(selectedSale.customer)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">فروشنده</h3>
                  <p className="text-lg font-semibold">
                    {currentEmployee(selectedSale.employee)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    نوعیت فروش
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
                    نوعیت پرداخت
                  </h3>
                  <p className="text-lg font-semibold capitalize">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                        selectedSale.dueAmount === 0 ? "paid" : "partial"
                      )}`}
                    >
                      {selectedSale.dueAmount === 0 ? "paid" : "partial"}
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
                    <span>Subtotal:</span>
                    <span className="font-semibold"></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-semibold text-red-600">
                      {selectedSale?.discount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedSale?.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-xl text-amber-600">
                      {formatCurrency(selectedSale?.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(selectedSale.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Owed:</span>
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
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
      {/* <GloableModal open={openPrint} setOpen={setOpenPrint}>
        {selectedSale && (
          <div className="bg-white rounded-sm shadow-sm w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {selectedSale.billType === "large"
                  ? "Large Bill"
                  : "Small Bill"}
              </h2>
            </div>

            <div id="printable-bill" className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  Khorma Trading System
                </h1>
                <p className="text-gray-600">
                  Trading & Distribution Management
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Contact: +93 700 000 000 | Email: info@khorma.com
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                  <p className="text-gray-700">{selectedSale.customer}</p>
                  <p className="text-sm text-gray-600">
                    Bill #: {selectedSale.billNumber}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm">
                    <strong>Date:</strong>{" "}
                    {new Date(selectedSale.saleDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <strong>Type:</strong> {selectedSale.billType} Bill
                  </p>
                  <p className="text-sm">
                    <strong>Payment:</strong> {selectedSale.saleType}
                  </p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-right py-3">Item</th>
                    <th className="text-right py-3">Qty</th>
                    <th className="text-right py-3">Price</th>
                    <th className="text-right py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 text-right">{item.product}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">${item.unitPrice}</td>
                      <td className="py-3 text-right font-semibold">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      ${selectedSale.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-semibold text-red-600">
                      -${selectedSale.discount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-semibold">
                      ${selectedSale.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t-2 border-gray-300 pt-2 mt-2">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-xl text-amber-600">
                      ${selectedSale.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-sm text-gray-500">
                <p>Thank you for your business!</p>
                <p className="mt-2">{selectedSale.notes}</p>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4">
              <Button
                onClick={() => setOpenPrint(false)}
                className="px-4 py-2 border rounded-lg bg-warning-orange hover:bg-warning-light"
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="px-4 py-2 bg-success-green hover:bg-success-light text-white rounded-lg flex items-center gap-2"
              >
                <PrinterIcon className="h-5 w-5" />
                Print Bill
              </Button>
            </div>
          </div>
        )}
      </GloableModal> */}
    </section>
  );
}

export default Sale;
