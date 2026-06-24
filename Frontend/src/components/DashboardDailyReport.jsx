import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JalaliDatePicker from "./JalaliDatePicker";
import ReportPDF from "./ReportPDF";
import { useDailyReport } from "../services/useApi";
import { formatCurrency } from "../utilies/helper";
import { addCanvasAsPagedJpegs } from "../utilies/addCanvasAsPagedJpegs";
import {
  buildPdfCaptureNode,
  patchOklabColors,
  removePdfCaptureNode,
} from "../utilies/dailyReportPdfCapture";

export default function DashboardDailyReport() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [reportDate, setReportDate] = useState(today);
  const [expanded, setExpanded] = useState(() => {
    try {
      return sessionStorage.getItem("dashboardDailyReportExpanded") === "true";
    } catch {
      return false;
    }
  });

  const reportContentRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: dailyReportData, isLoading: reportLoading } = useDailyReport({
    startDate: reportDate,
    endDate: reportDate,
  });

  const summary = dailyReportData?.data?.summary;

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("dashboardDailyReportExpanded", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const exportToPDF = async () => {
    if (!dailyReportData || isExporting) return;

    const reportElement = reportContentRef.current;
    if (!reportElement) {
      toast.error(t("dailyReport.exportError"));
      return;
    }

    setIsExporting(true);
    let captureNode = null;

    try {
      captureNode = buildPdfCaptureNode(reportElement);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));

      patchOklabColors(captureNode);
      void captureNode.offsetHeight;

      const canvas = await html2canvas(captureNode, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        ignoreElements: (el) => el.classList?.contains("no-print"),
        logging: false,
        letterRendering: false,
        imageTimeout: 0,
      });

      if (!canvas?.width || !canvas?.height) {
        throw new Error("Empty canvas");
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      addCanvasAsPagedJpegs(pdf, canvas, { jpegQuality: 0.62 });

      pdf.save(`Daily_Report_${reportDate}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("dailyReport.exportError"));
    } finally {
      removePdfCaptureNode(captureNode);
      setIsExporting(false);
    }
  };

  return (
    <>
    {isExporting && (
      <div
        className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-3 bg-black/60 pointer-events-none"
        aria-hidden
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-white text-sm font-medium">
          {t("dailyReport.exportingPDF")}
        </p>
      </div>
    )}
    <div className="bg-white rounded-lg shadow border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/80">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 min-w-0 flex-1 text-right hover:opacity-90 transition-opacity"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUpIcon className="h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 shrink-0 text-amber-600" />
          )}
          <DocumentTextIcon className="h-6 w-6 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("dailyReport.title")}
            </h2>
            <p className="text-sm text-gray-500">
              {expanded
                ? t("dashboard.dailyReport.collapseHint")
                : t("dashboard.dailyReport.expandHint")}
            </p>
          </div>
        </button>

        <div
          className="flex flex-wrap items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div className="w-48 sm:w-56">
            <JalaliDatePicker
              value={reportDate}
              onChange={setReportDate}
              placeholder={t("dailyReport.selectDate")}
              clearable={false}
            />
          </div>
          {dailyReportData && (
            <button
              type="button"
              onClick={exportToPDF}
              disabled={reportLoading || isExporting}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {isExporting
                ? t("dailyReport.exportingPDF")
                : t("dailyReport.exportPDF")}
            </button>
          )}
        </div>
      </div>

      {reportLoading && (
        <div className="text-center py-8 px-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          <p className="mt-2 text-gray-600">{t("dailyReport.loading")}</p>
        </div>
      )}

      {!reportLoading && summary && !expanded && (
        <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {t("dailyReport.purchases")}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalPurchases)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {t("dailyReport.sales")}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalSales)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {t("dailyReport.totalExpenses")}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
        </div>
      )}

      {!reportLoading && dailyReportData && (
        <div
          ref={reportContentRef}
          id="daily-report-content"
          className={
            expanded
              ? "p-4 max-h-[min(70vh,720px)] overflow-y-auto border-t border-slate-100"
              : "fixed left-[-10000px] top-0 w-[794px] max-h-none overflow-visible opacity-0 pointer-events-none -z-10"
          }
          aria-hidden={!expanded}
        >
          <ReportPDF data={dailyReportData.data} reportDate={reportDate} />
        </div>
      )}
    </div>
    </>
  );
}
