import { AiOutlineFilePdf } from "react-icons/ai";
import { useCallback, useEffect, useRef, useState } from "react";
// import { useReactToPrint } from "react-to-print";
import { PrinterIcon, XMarkIcon } from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import persianLocale from "react-date-object/locales/persian_fa";
import { CiLocationOn } from "react-icons/ci";
import { SlCallIn } from "react-icons/sl";
import { formatNumberWithPersianDigits } from "../utilies/helper";

const SaleBillPrint = ({ sale, customer, customerAccount, onClose, autoPrint = false }) => {
  const printRef = useRef(null);
  const [isContentReady, setIsContentReady] = useState(false);

  const tableHeaders = [
    { title: "شماره" },
    { title: "نام محصل" },
    { title: "تفصیل" },
    { title: "وزن" },
    { title: "کارتن" },
    { title: "قیمت" },
    { title: "مجموع کل" },
  ];

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

  // Weight & carton
  const calculateWeightAndCarton = (item) => {
    const qty = item.quantity || 0;
    const conversion = item.unit?.conversion_to_base || 1;
    const totalWeight = qty * conversion;

    return {
      weight: totalWeight,
      carton: item.cartonCount || 0,
    };
  };

  const services = sale?.items || [];

  // Find the base unit name (assuming all items use the same base unit system)
  const baseUnitName = services[0]?.unit?.is_base_unit 
    ? services[0]?.unit?.name 
    : services[0]?.unit?.base_unit?.name || "Kg";

  const totalWeight = services.reduce(
    (sum, item) => sum + calculateWeightAndCarton(item).weight,
    0
  );

  const totalCarton = services.reduce(
    (sum, item) => sum + calculateWeightAndCarton(item).carton,
    0
  );

  const printDateTime = formatPersianDateTime(new Date());
  const patchOklabColors = (root) => {
    if (!root) return;
    const props = ['color', 'background', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
    const all = root.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const styles = window.getComputedStyle(el);
      props.forEach((prop) => {
        const val = styles[prop];
        if (val && (val.includes('oklab') || val.includes('oklch'))) {
          // Convert to hex based on element type
          if (prop === 'color') {
            el.style[prop] = '#1e293b'; // slate-800
          } else if (prop.includes('background')) {
            el.style[prop] = '#ffffff'; // white
          } else if (prop.includes('border')) {
            el.style[prop] = '#e2e8f0'; // slate-200
          } else {
            el.style[prop] = '#222222'; // fallback
          }
        }
      });
    }
  };

  const handlePrint = useCallback(async () => {
    if (!printRef.current) return;
    
    try {
      patchOklabColors(printRef.current);

      const canvas = await html2canvas(printRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        ignoreElements: (el) => el.classList?.contains("no-print"),
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const scaledWidth = pageWidth / 2;
      const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

      // Add two copies: one on left half, one on right half (side by side)
      pdf.addImage(imgData, "PNG", 0, 0, scaledWidth, scaledHeight);
      pdf.addImage(imgData, "PNG", scaledWidth, 0, scaledWidth, scaledHeight);

      pdf.autoPrint();
      window.open(pdf.output("bloburl"), "_blank");
    } catch (error) {
      console.error('Print failed:', error);
      alert('خطا در چاپ فاکتور. لطفاً دوباره تلاش کنید.');
    }
  }, []);

  const handlePdf = useCallback(async () => {
    if (!printRef.current) return;
    
    try {
      patchOklabColors(printRef.current);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: false,
        ignoreElements: (el) => el.classList?.contains("no-print"),
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      window.open(pdf.output("bloburl"), "_blank");
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('خطا در تولید PDF. لطفاً دوباره تلاش کنید.');
    }
  }, []);

  useEffect(() => {
    if (autoPrint && sale) {
      const t = setTimeout(handlePrint, 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, sale, handlePrint]);

  // Mark content as ready when ref is available
  useEffect(() => {
    if (printRef.current) {
      setIsContentReady(true);
    }
  }, []);

  // If no sale data, show loading
  if (!sale) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 "></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری فاکتور...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-md p-4 max-h-[90vh] overflow-y-auto">
      {/* HEADER - Add no-print class */}
      <div className="flex justify-between  pb-2 mb-4 no-print">
        <h2 className="font-bold text-lg">چاپ فاکتور</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
            disabled={!isContentReady}
          >
            <PrinterIcon className="h-5 w-5" />
            پرینت دو کپی
          </button>
          <button
            onClick={handlePdf}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
            disabled={!isContentReady}
          >
            <AiOutlineFilePdf className="h-5 w-5" />
            پرینت یک کپی
          </button>
          <button
            onClick={onClose}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
          >
            <XMarkIcon className="h-5 w-5" />
            بستن
          </button>
        </div>
      </div>

      {/* ✅ FIXED: Printable content with proper ref */}
      <div
        ref={printRef}
        className=" bg-[#ffffff] border border-[#e2e8f0] rounded-md small-bill"
      >
        <div
          className=" bg-[url(/bg3.png)]  bg-no-repeat bg-bottom  bg-cover   py-5 px-2  rounded-md "
          style={{
            width: "215mm",
            minHeight: "297mm",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div className="w-full flex justify-between pb-[12px]">
            <span className="font-semibold">
              {formatPersianDate(sale?.saleDate)}
            </span>
            <span className="underline underline-offset-2 text-[#a0522d] font-bold">
              {sale?.billNumber}
            </span>
          </div>

          {/* Company Header */}
          <header className="rounded-md  p-6 mb-2  bg-[url(/banner.png)] bg-no-repeat  bg-cover  bg-center">
            <h3 className="text-2xl font-bold text-[#ffffff] text-right mb-4">
              شرکت تجارتی برادران اصغری
            </h3>

            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              {/* Address */}
              <div className="flex items-center gap-2">
                <CiLocationOn className="text-xl text-[#ffffff]" />
                <p className="text-[#ffffff] text-sm">
                  افغانستان کندهار سرک نو احمدی مارکیت دوکان شماره ۳ و ۴
                </p>
              </div>

              {/* Phone Numbers */}
              <div className="flex items-center gap-2">
                <SlCallIn className="text-xl text-[#ffffff]" />
                <div className="text-[#ffffff] text-sm flex gap-3">
                  <span>0708181028</span>
                  <span>0709006272</span>
                  <span>0708471789</span>
                </div>
              </div>
            </div>
          </header>

          {/* Invoice Details */}
          <section className="grid grid-cols-3 gap-3 py-2 px-3 border mb-2 rounded border-[#e5e7eb] text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-[#1e2939] font-semibold">فاکتور برای:</h3>
              <span className="text-[#1e2939]">
                {customer?.name ||
                  sale?.customerName?.name ||
                  sale?.customerName ||
                  "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">تاریخ:</span>
              <span>{formatPersianDate(sale?.saleDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">شماره فاکتور:</span>
              <span>{sale?.billNumber || "-"}</span>
            </div>
          </section>

          {customerAccount && (
            <section className="py-2 px-3 border mb-2 rounded border-[#e5e7eb] bg-amber-50 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#1e2939]">بیلانس حساب مشتری:</span>
                <span className="font-bold text-amber-700">
                  {formatNumberWithPersianDigits(customerAccount?.currentBalance || 0)} افغانی
                </span>
              </div>
            </section>
          )}

          {/* Services Table */}
          <section className="mb-2">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-[#d1d5dc] text-xs">
                <thead>
                  <tr className="bg-[#f3f4f6]">
                    {tableHeaders.map((header, index) => (
                      <th
                        key={index}
                        className="border border-[#d1d5dc] px-2 py-1 text-right font-semibold"
                      >
                        {header.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.map((curr, index) => {
                    const { weight, carton } = calculateWeightAndCarton(curr);
                    return (
                      <tr key={index} style={{ textAlign: "center" }}>
                        <td className="border border-[#d1d5dc] px-2 py-1 text-center">
                          {index + 1}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1">
                          {curr.product?.name || "-"}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1">
                          {curr.description || "-"}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1 text-left">
                          {formatNumberWithPersianDigits(curr.quantity)} {curr.unit?.name || ""}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1 text-left">
                          {carton > 0 ? formatNumberWithPersianDigits(carton) : "-"}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1 text-left">
                          {formatNumberWithPersianDigits(curr.unitPrice)}
                        </td>
                        <td className="border border-[#d1d5dc] px-2 py-1 text-left">
                          {formatNumberWithPersianDigits(curr.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals Section */}
          <section className="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <div className="border border-[#d1d5dc] rounded overflow-hidden w-full md:w-[280px] text-xs">
              <div className="p-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#1e2939]">مجموعه:</span>
                  <span className="font-medium bg-[#eff6ff] px-2 py-0.5 rounded">
                    {formatNumberWithPersianDigits(sale?.totalAmount || 0)} افغانی
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#1e2939]">مجموع وزن:</span>
                  <span className="font-medium bg-[#eff6ff] px-2 py-0.5 rounded">
                    {formatNumberWithPersianDigits(totalWeight.toFixed(1))} {baseUnitName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#1e2939]">مجموع کارتن:</span>
                  <span className="font-medium bg-[#eff6ff] px-2 py-0.5 rounded">
                    {formatNumberWithPersianDigits(totalCarton)}
                  </span>
                </div>
              </div>
              <div className="text-[#fff] bg-[#7c4a2d] p-2 font-bold">
                <div className="flex justify-between">
                  <span>مجموع کل:</span>
                  <span>{formatNumberWithPersianDigits(sale?.totalAmount || 0)} افغانی</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-[280px] space-y-2 text-xs">
              {sale && (
                <>
                  <div className="flex justify-between border pb-2 border-[#d1d5dc]">
                    <span>مبلغ رسید:</span>
                    <span>{formatNumberWithPersianDigits(sale?.paidAmount || 0)} افغانی</span>
                  </div>
                  <div className="flex justify-between border pb-2 border-[#d1d5dc]">
                    <span>باقیمانده:</span>
                    <span>{formatNumberWithPersianDigits(sale?.dueAmount || 0)} افغانی</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-[#d1d5dc]  pt-1 mt-2">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              {/* Manager Signature */}
              <div className="text-right">
                <h4 className="text-lg font-semibold">مدیریت برادران اصغری</h4>
                <div className="mt-6">
                  <p className="text-sm">مهر و امضاء</p>
                  <div className="h-[1px] w-48 border-t border-[#d1d5dc] mt-[30px]"></div>
                </div>
              </div>

              {/* Thanks Message */}
              <div className="text-right">
                <p className="text-lg font-medium">از خریداری شما سپاسگزاریم</p>
                <p className="text-[#4a5565] mt-1">
                  امیدواریم دوباره خدمت‌گذار تان باشیم
                </p>
              </div>
            </div>

            {/* Print DateTime */}
            <div className="mt-8 pt-4 border-t border-[#d1d5dc] text-sm">
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">تاریخ چاپ: </span>
                  <span>
                    {printDateTime.dayName} -{" "}
                    {formatNumberWithPersianDigits(printDateTime.dateStr)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">وقت چاپ: </span>
                  <span>
                    {new Date().toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SaleBillPrint;
