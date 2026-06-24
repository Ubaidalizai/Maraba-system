import { AiOutlineFilePdf } from "react-icons/ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PrinterIcon, XMarkIcon } from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CiLocationOn } from "react-icons/ci";
import { SlCallIn } from "react-icons/sl";
import { formatNumberWithPersianDigits, formatJalaliDate } from "../utilies/helper";
import { useSettings } from "../services/useApi";
import { BACKEND_BASE_URL } from "../services/apiConfig";

const SaleBillPrint = ({ sale, customer, customerAccount, onClose, autoPrint = false }) => {
  const { t } = useTranslation();
  const printRef = useRef(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { data: settings } = useSettings();
  
  const companyName = settings?.data?.settings?.companyName || t("brand.title");
  const companyAddress = settings?.data?.settings?.address || t("bill.address");
  const companyPhone = settings?.data?.settings?.phone1 || "";
  const companyPhone2 = settings?.data?.settings?.phone2 || "";
  const companyPhone3 = settings?.data?.settings?.phone3 || "";
  const companyLogo = settings?.data?.settings?.logo || "";
  const phoneNumbers = [companyPhone, companyPhone2, companyPhone3].filter(Boolean);

  const tableHeaders = [
    { title: t("saleBilling.productHeaders.serial") },
    { title: t("saleBilling.productHeaders.product") },
    { title: t("saleBilling.productHeaders.unit") },
    { title: t("saleForm.quantityLabel") },
    { title: t("saleBilling.productHeaders.unitPrice") },
    { title: t("saleBilling.productHeaders.lineTotal") },
  ];

  const formatPersianDate = formatJalaliDate;

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
  const itemsSubtotal =
    sale?.subtotalAmount ??
    services.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const discountAmount = sale?.discountAmount || 0;

  // Calculate totals grouped by unit
  const unitTotals = services.reduce((acc, item) => {
    const unitName = item.unit?.name || "واحد";
    const quantity = item.quantity || 0;
    
    if (acc[unitName]) {
      acc[unitName] += quantity;
    } else {
      acc[unitName] = quantity;
    }
    
    return acc;
  }, {});

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
        allowTaint: false,
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
      alert(t("bill.printError"));
    }
  }, [t]);

  const handlePdf = useCallback(async () => {
    if (!printRef.current) return;
    
    try {
      patchOklabColors(printRef.current);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
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
      alert(t("bill.pdfError"));
    }
  }, [t]);

  useEffect(() => {
    if (autoPrint && sale) {
      const timer = setTimeout(handlePrint, 400);
      return () => clearTimeout(timer);
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
          <p className="mt-4 text-gray-600">{t("bill.loading")}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-md p-4 max-h-[90vh] overflow-y-auto">
      {/* HEADER - Add no-print class */}
      <div className="flex justify-between  pb-2 mb-4 no-print">
        <h2 className="font-bold text-lg">{t("bill.printTitle")}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
            disabled={!isContentReady || (companyLogo && !logoLoaded)}
          >
            <PrinterIcon className="h-5 w-5" />
            {t("bill.printTwoCopies")}
          </button>
          <button
            onClick={handlePdf}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
            disabled={!isContentReady || (companyLogo && !logoLoaded)}
          >
            <AiOutlineFilePdf className="h-5 w-5" />
            {t("bill.printOneCopy")}
          </button>
          <button
            onClick={onClose}
            className="border px-3 py-1 flex items-center gap-2 hover:bg-gray-50"
          >
            <XMarkIcon className="h-5 w-5" />
            {t("common.pagination.previous")}
          </button>
        </div>
      </div>

      {/* ✅ FIXED: Printable content with proper ref */}
      <div
        ref={printRef}
        className=" bg-[#ffffff] border border-[#e2e8f0] rounded-md small-bill"
        style={{ position: 'relative', overflow: 'visible' }}
      >
        
        <div
          className="bg-white py-2 px-2 rounded-md"
          style={{
            width: "215mm",
            minHeight: "297mm",
            margin: "0 auto",
            boxSizing: "border-box",
            position: 'relative',
          }}
        >
          {/* Company header */}
          <header className="rounded-md p-5 mb-3 border border-[#e2e8f0] bg-white">
            <div className="flex items-center justify-between gap-4">
              {/* Logo */}
              {companyLogo && (
                <div className="shrink-0">
                  <img
                    src={`${BACKEND_BASE_URL}/public/images/settings/${companyLogo}`}
                    alt="Logo"
                    crossOrigin="anonymous"
                    onLoad={() => setLogoLoaded(true)}
                    onError={(e) => {
                      console.error('Logo failed to load:', e);
                      setLogoLoaded(true);
                    }}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'contain',
                      borderRadius: '100%',
                    }}
                  />
                </div>
              )}
              
              {/* Company Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-800 text-right mb-4">
                  {companyName}
                </h3>

                <div className="flex flex-col md:flex-row md:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CiLocationOn className="text-xl text-slate-700 shrink-0" />
                    <p className="text-slate-700 text-sm text-right">{companyAddress}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <SlCallIn className="text-xl text-slate-700 shrink-0" />
                    <div className="text-slate-700 text-sm flex flex-wrap gap-3 justify-end">
                      {phoneNumbers.length > 0 ? (
                        phoneNumbers.map((phone, index) => (
                          <span key={index}>{phone}</span>
                        ))
                      ) : (
                        <span>0000000000</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Invoice Details */}
          <section className="grid grid-cols-3 gap-3 py-2 px-3 border mb-2 rounded border-[#e5e7eb] text-xs">
            <div className="flex items-center gap-6">
              <h3 className="text-[#1e2939] font-semibold">{t("bill.invoiceFor")}</h3>
              <span className="text-[#1e2939]">
                {customer?.name ||
                  sale?.customerName?.name ||
                  sale?.customerName ||
                  "-"}
              </span>
            </div>
            <div className="flex gap-6 items-center">
              <span className="font-semibold">{t("dashboard.fields.date")}:</span>
              <span>{formatPersianDate(sale?.saleDate)}</span>
            </div>
            <div className="flex gap-6 items-center">
              <span className="font-semibold">{t("bill.invoiceNumber")}:</span>
              <span>{sale?.billNumber || "-"}</span>
            </div>
          </section>

          {customerAccount && (
            <section className="py-2 px-3 border mb-2 rounded border-[#e5e7eb] bg-amber-50 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#1e2939]">{t("bill.customerBalance")}:</span>
                <span className="font-bold text-amber-700">
                  {formatNumberWithPersianDigits(customerAccount?.currentBalance || 0)} {t("reports.currencyAfn")}
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
                        className="border border-[#d1d5dc] px-2 py-1 font-semibold text-center"
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
                      <>
                        <tr key={index} style={{ textAlign: "center" }}>
                          <td className="border border-[#d1d5dc] px-2 py-1">
                            {index + 1}
                          </td>
                          <td className="border border-[#d1d5dc] px-2 py-1">
                            {curr.product?.name || "-"}
                          </td>
                          <td className="border border-[#d1d5dc] px-2 py-1 ">
                             {curr.unit?.name || ""}
                          </td>
                          <td className="border border-[#d1d5dc] px-2 py-1">
                            {formatNumberWithPersianDigits(curr.quantity)}
                          </td>
                          <td className="border border-[#d1d5dc] px-2 py-1">
                            {formatNumberWithPersianDigits(curr.unitPrice)}
                          </td>
                          <td className="border border-[#d1d5dc] px-2 py-1">
                            {formatNumberWithPersianDigits(curr.totalPrice)}
                          </td>
                        </tr>
                        {curr.description && (
                          <tr key={`desc-${index}`}>
                            <td colSpan="6" className="border border-[#d1d5dc] px-2 py-1 text-slate-600 bg-gray-50">
                              <span className="font-semibold">{t("dashboard.fields.description")}: </span>{curr.description}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals Section */}
          <section className="flex flex-col md:flex-row justify-between gap-4 mt-6 mb-4 ">
            <div className="overflow-hidden w-full md:w-[280px] text-xs">
              <div className="p-2 space-y-2 font-bold">
                {Object.entries(unitTotals).map(([unitName, total]) => (
                  <div key={unitName} className="flex justify-between gap-3">
                    <span className="text-[#1e2939] shrink-0">{t("bill.totalUnit")}:</span>
                    <span className="font-medium text-left">
                      {formatNumberWithPersianDigits(total)} {unitName}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#e5e7eb] pt-2">
                  <span className="text-[#1e2939]">{t("bill.subtotal")}:</span>
                  <span>{formatNumberWithPersianDigits(itemsSubtotal)} {t("reports.currencyAfn")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>{t("bill.discount")}:</span>
                    <span>-{formatNumberWithPersianDigits(discountAmount)} {t("reports.currencyAfn")}</span>
                  </div>
                )}
              </div>
              <div className="text-[#fff] bg-[#7c4a2d] p-2 font-bold">
                <div className="flex justify-between">
                  <span>{t("bill.grandTotal")}:</span>
                  <span>{formatNumberWithPersianDigits(sale?.totalAmount || 0)} {t("reports.currencyAfn")}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-[280px] space-y-4 text-xs font-bold">
              {sale && (
                <>
                  <div className="flex justify-between border-b-1 border-b-gray-300 space-y-1">
                    <span>{t("bill.amountReceived")}:</span>
                    <span>{formatNumberWithPersianDigits(sale?.paidAmount || 0)} {t("reports.currencyAfn")}</span>
                  </div>
                  <div className="flex justify-between border-b-1 border-b-red-300 space-y-1">
                    <span>{t("bill.remaining")}:</span>
                    <span>{formatNumberWithPersianDigits(sale?.dueAmount || 0)} {t("reports.currencyAfn")}</span>
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
                <h4 className="text-lg font-semibold">{t("bill.management")}</h4>
                <div className="mt-6">
                  <p className="text-sm">{t("bill.signatureStamp")}</p>
                  <div className="h-[1px] w-48 border-t border-[#d1d5dc] mt-[30px]"></div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-medium">{t("bill.thanksTitle")}</p>
                <p className="text-[#4a5565] mt-1">{t("bill.thanksSubtitle")}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SaleBillPrint;
