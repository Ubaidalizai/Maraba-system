import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import persianLocale from "react-date-object/locales/persian_fa";
import { CiLocationOn } from "react-icons/ci";
import { SlCallIn } from "react-icons/sl";
import { formatNumberWithPersianDigits } from "../utilies/helper";
import Table from "./Table";
import TableBody from "./TableBody";
import TableColumn from "./TableColumn";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";

const Invoice = forwardRef(({ sale, customer, customerAccount }, ref) => {
  const { t } = useTranslation();

  const formatPersianDate = (dateString) => {
    try {
      return new DateObject({
        date: new Date(dateString),
        calendar: persianCalendar,
        locale: persianLocale,
      }).format("YYYY/MM/DD");
    } catch {
      return new Date(dateString).toLocaleDateString("fa-IR");
    }
  };

  // Weight & carton
  const calculateWeightAndCarton = (item) => {
    const qty = item.quantity || 0;
    const conversion = item.unit?.conversion_to_base || 1;
    const totalWeight = qty * conversion;

    const unitName = item.unit?.name?.toLowerCase() || "";
    const isCarton = unitName.includes("کارتن") || unitName.includes("carton");

    return {
      weight: totalWeight,
      carton: isCarton ? qty : 0,
    };
  };

  const services = sale?.items || [];

  const totalWeight = services.reduce(
    (sum, item) => sum + calculateWeightAndCarton(item).weight,
    0
  );

  const totalCarton = services.reduce(
    (sum, item) => sum + calculateWeightAndCarton(item).carton,
    0
  );

  const tableHeaders = [
    { title: "شماره" },
    { title: "نام محصل" },
    { title: "تفصیل" },
    { title: "وزن" },
    { title: "کارتن" },
    { title: "قیمت" },
    { title: "مجموع کل" },
  ];

  return (
    <div
      ref={ref}
      className="relative mx-auto bg-white p-10 rounded-md print:shadow-none print:rounded-none"
    >
      <header className="rounded-md border border-gray-200 bg-slate-800 p-8 flex flex-col gap-4">
        <h3 className="text-[30px] font-semibold text-white text-right">
          {t("brand.title")}
        </h3>

        <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-y-2 gap-x-6">
          <div className="flex items-center justify-end gap-2">
            <CiLocationOn className="text-2xl text-white shrink-0" />
            <p className="text-lg font-medium text-white text-right">
              {t("bill.address")}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <SlCallIn className="text-2xl text-white shrink-0" />
            <div className="text-lg font-medium text-white text-right flex gap-x-2">
              <span>0708181028</span>
              <span>0709006272</span>
              <span>0708471789</span>
            </div>
          </div>
        </div>
      </header>

      {/* Invoice Details */}
      <section className="grid grid-cols-3 gap-8 py-5 px-3 border m-1 rounded-md border-slate-300">
        {/* Invoice To */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-x-2">
            <h3 className="text-sm text-gray-800 mb-2.5 font-semibold">
              فاکتور برای :
            </h3>
            <div className="text-sm text-gray-800 uppercase mb-2.5">
              {customer?.name ||
                sale?.customerName?.name ||
                sale?.customerName ||
                "-"}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold">تفصیل:</span>
            <span>-</span>
          </div>
        </div>

        {/* Date and Warehouse */}
        <div className="flex flex-col gap-2">
          <div className="text-sm flex items-center justify-between text-gray-800 text-right">
            <span className="font-semibold"> تاریخ: </span>
            <span className="p-0.5 rounded-sm">
              {formatPersianDate(sale?.saleDate)}
            </span>
          </div>

          <div className="text-sm flex justify-between items-center text-gray-800 mb-1">
            <span className="font-semibold">گدام:</span>
            <span>فروشگاه مرکزی</span>
          </div>
        </div>

        {/* Bill Number & Currency */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold">شماره فاکتور:</span>
            <span>{sale?.billNumber || "-"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">واحد پول:</span>
            <span>افغانی</span>
          </div>
        </div>
      </section>

      {/* Services Table */}
      <section className="mb-10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader headerData={tableHeaders} />
            <TableBody>
              {services.map((curr, index) => {
                const { weight, carton } = calculateWeightAndCarton(curr);

                return (
                  <TableRow key={index}>
                    <TableColumn>{index + 1}</TableColumn>
                    <TableColumn>{curr.product?.name || "-"}</TableColumn>
                    <TableColumn>{curr.description || "-"}</TableColumn>
                    <TableColumn>
                      {formatNumberWithPersianDigits(weight.toFixed(1))}
                    </TableColumn>
                    <TableColumn>
                      {formatNumberWithPersianDigits(carton)}
                    </TableColumn>
                    <TableColumn>
                      {formatNumberWithPersianDigits(curr.unitPrice)}
                    </TableColumn>
                    <TableColumn>
                      {formatNumberWithPersianDigits(curr.totalPrice)}
                    </TableColumn>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="flex flex-col  justify-between items-end mb-15 gap-8">
        {/* Summary Box */}
        <div className=" rounded  w-[250px] overflow-hidden">
          <div className="p-5">
            <div className="flex justify-between mb-2.5 text-sm">
              <span className="text-gray-800 p-2">مجموعه :</span>
              <span className="font-medium text-gray-800 border p-2 bg-sky-100 border-sky-100">
                {formatNumberWithPersianDigits(sale?.totalAmount || 0)} افغانی
              </span>
            </div>

            <div className="flex justify-between mb-2.5 text-sm">
              <span className="text-gray-800 p-2">مجموع وزن: </span>
              <span className="font-medium text-gray-800 border p-2 bg-sky-100 border-sky-100">
                {formatNumberWithPersianDigits(totalWeight.toFixed(1))}
              </span>
            </div>
            <div className="flex justify-between mb-2.5 text-sm">
              <span className="text-gray-800 p-2 ">مجموع کارتن :</span>
              <span className="font-medium text-gray-800 border p-2 bg-sky-100 border-sky-100">
                {formatNumberWithPersianDigits(totalCarton)}
              </span>
            </div>
          </div>

          <div className=" bg-primary-brown-light text-white p-5 font-bold text-base">
            <div className="flex justify-between">
              <span>مجموع :</span>
              <span>
                {formatNumberWithPersianDigits(sale?.totalAmount || 0)} افغانی
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method & Summary */}
        <div className=" w-[250px]">
          {sale && (
            <div className="mt-4 text-sm">
              <div className="flex justify-between mb-1">
                <span>مبلغ رسید:</span>
                <span>
                  {formatNumberWithPersianDigits(sale?.paidAmount || 0)} افغانی
                </span>
              </div>

              <div className="flex justify-between">
                <span>باقیمانده:</span>
                <span>
                  {formatNumberWithPersianDigits(sale?.dueAmount || 0)} افغانی
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
      <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-6 mt-6 border-t border-gray-300 gap-6">
        {/* Left Side — Manager / Signature */}
        <div className="flex flex-col items-end text-right">
          <h4 className="text-lg font-semibold text-gray-800">
            {t("bill.management")}
          </h4>
          <div className="mt-4 text-center w-full">
            <p className="text-sm text-gray-700">{t("bill.signatureStamp")}</p>
            <div className="h-10 border-b border-gray-400 mt-1"></div>
          </div>
        </div>

        <div className="text-right sm:text-left">
          <p className="text-lg font-medium text-gray-800">
            {t("bill.thanksTitle")}
          </p>
          <p className="text-sm text-gray-600 mt-1">{t("bill.thanksSubtitle")}</p>
        </div>
      </footer>
    </div>
  );
});

Invoice.displayName = "Invoice";
export default Invoice;
