import React, { forwardRef } from "react";
import {
  formatNumberWithPersianDigits,
  formatCurrency,
} from "../utilies/helper";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import persianLocale from "react-date-object/locales/persian_fa";

const SaleBill = forwardRef(({ sale, customer, customerAccount }, ref) => {
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

  const formatPersianDateTime = (dateString) => {
    try {
      const date = new DateObject({
        date: new Date(dateString),
        calendar: persianCalendar,
        locale: persianLocale,
      });
      return {
        dayName: date.format("dddd"),
        dateStr: date.format("YYYY/MM/DD"),
        time: new Date(dateString).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return {
        dayName: "",
        dateStr: dateString,
        time: "",
      };
    }
  };

  const calculateWeightAndCarton = (item) => {
    const qty = item.quantity || 0;
    const conversion = item.unit?.conversion_to_base || 1;
    const totalWeight = qty * conversion;

    const unitName = item.unit?.name?.toLowerCase() || "";
    const isCarton = unitName.includes("carton") || unitName.includes("کارتن");

    return {
      weight: totalWeight,
      carton: isCarton ? qty : 0,
    };
  };

  const totalWeight = sale.items?.reduce((sum, item) => {
    return sum + calculateWeightAndCarton(item).weight;
  }, 0);

  const totalCarton = sale.items?.reduce((sum, item) => {
    return sum + calculateWeightAndCarton(item).carton;
  }, 0);

  const printDateTime = formatPersianDateTime(new Date());

  return (
    <div
      ref={ref}
      className="bg-white w-full print:w-full mx-auto"
      style={{ direction: "rtl", fontFamily: "Arial" }}
    >
      {/* Header */}
      <div className="bg-blue-900 text-white text-center py-2">
        <h1 className="text-2xl font-bold">
          شرکت تجارتی علاء الدین و شجاع الدین برادران
        </h1>
      </div>

      {/* Business Description */}
      <div className="text-center py-1 border-b border-gray-300">
        <p className="text-sm">
          فروشنده انواع خرما (کلوته، مضافتی، پیارم، زاهدی و غیره)
        </p>
      </div>

      {/* Address */}
      <div className="text-center py-1 border-b border-gray-300">
        <p className="text-sm">
          آدرس: نیمروز، زرنج، پشت کوچه قالین فروشی ها، روبروی سوپر کولا
        </p>
      </div>

      {/* Contact */}
      <div className="text-center py-1 border-b border-gray-300 text-sm">
        <div className="flex justify-center gap-3">
          <span>00989136524382 ایران</span>
          <span>شجاع الدین: 0796100157</span>
          <span>احسان: 0797365500</span>
          <span>علاء الدین: 0797661688</span>
          <span>0702301904</span>
        </div>
      </div>

      {/* Customer & Invoice Info */}
      <table className="w-full text-sm border-b border-gray-300 mt-2">
        <tbody>
          <tr>
            <td className="font-semibold py-1 border-b px-2">اسم مشتری</td>
            <td className="py-1 border-b px-2">
              {customer?.name ||
                sale.customerName?.name ||
                sale.customerName ||
                "-"}
            </td>

            <td className="font-semibold py-1 border-b px-2">تاریخ</td>
            <td className="py-1 border-b px-2">
              {formatPersianDate(sale.saleDate)}
            </td>
          </tr>

          <tr>
            <td className="font-semibold py-1 border-b px-2">شماره فاکتور</td>
            <td className="py-1 border-b px-2">{sale.billNumber || "-"}</td>

            <td className="font-semibold py-1 border-b px-2">گدام</td>
            <td className="py-1 border-b px-2">{sale.placedIn?.name || "-"}</td>
          </tr>

          <tr>
            <td className="font-semibold py-1 border-b px-2">واحد پول</td>
            <td className="py-1 border-b px-2">افغانی</td>
            <td className="font-semibold py-1 border-b px-2">تفصیل</td>
            <td className="py-1 border-b px-2">-</td>
          </tr>
        </tbody>
      </table>

      {/* Customer Account Info */}
      {customerAccount && (
        <div className="mt-3 border border-gray-300 p-2 text-sm bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold">حساب: </span>
              {customerAccount.name || "-"}
            </div>

            <div>
              <span className="font-semibold">وضعیت حساب: </span>
              {customerAccount.currentBalance > 0 && (
                <span className="text-red-600">
                  بدهکار {formatCurrency(customerAccount.currentBalance)}
                </span>
              )}

              {customerAccount.currentBalance < 0 && (
                <span className="text-green-600">
                  موجودی{" "}
                  {formatCurrency(Math.abs(customerAccount.currentBalance))}
                </span>
              )}

              {customerAccount.currentBalance === 0 && "صفر"}
            </div>
          </div>
        </div>
      )}

      {/* Product Table */}
      <table className="w-full text-sm mt-3 border-collapse">
        <thead className="bg-blue-900 text-white">
          <tr>
            <th className="border py-1 px-2 text-center">شماره</th>
            <th className="border py-1 px-2 text-center">نام محصول</th>
            <th className="border py-1 px-2 text-center">وزن</th>
            <th className="border py-1 px-2 text-center">کارتن</th>
            <th className="border py-1 px-2 text-center">قیمت</th>
            <th className="border py-1 px-2 text-center">جمع کل</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item, i) => {
            const { weight, carton } = calculateWeightAndCarton(item);
            return (
              <tr key={i}>
                <td className="border py-1 px-2 text-center">{i + 1}</td>
                <td className="border py-1 px-2">
                  {item.product?.name || "-"}
                </td>
                <td className="border py-1 px-2 text-center">
                  {formatNumberWithPersianDigits(weight.toFixed(1))}
                </td>
                <td className="border py-1 px-2 text-center">
                  {formatNumberWithPersianDigits(carton)}
                </td>
                <td className="border py-1 px-2 text-center">
                  {formatNumberWithPersianDigits(item.unitPrice)}
                </td>
                <td className="border py-1 px-2 text-center">
                  {formatNumberWithPersianDigits(item.totalPrice)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
        <div className="space-y-1">
          <div className="border p-1">
            مجموع فاکتور: {formatNumberWithPersianDigits(sale.totalAmount)}
          </div>
          <div className="border p-1">
            مبلغ رسید: {formatNumberWithPersianDigits(sale.paidAmount)}
          </div>
          <div className="border p-1">
            باقی‌مانده: {formatNumberWithPersianDigits(sale.dueAmount)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="border p-1">
            جمله وزن: {formatNumberWithPersianDigits(totalWeight.toFixed(1))}
          </div>
          <div className="border p-1">
            جمله کارتن: {formatNumberWithPersianDigits(totalCarton)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-sm">مهر و امضاء</p>
        <div className="h-10 border-b border-gray-400 w-40 mx-auto"></div>

        <div className="text-xs mt-2 text-gray-600">
          <p>
            تاریخ پرینت: {printDateTime.dayName} - {printDateTime.dateStr}
          </p>
          <p>ساعت: {printDateTime.time}</p>
        </div>
      </div>
    </div>
  );
});

SaleBill.displayName = "SaleBill";
export default SaleBill;
