import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useDailyReport } from "../services/useApi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReportPDF from "../components/ReportPDF";
import JalaliDatePicker from "../components/JalaliDatePicker";
import Spinner from "../components/Spinner";
import { normalizeDateToIso } from "../utilies/helper";
import { addCanvasAsPagedJpegs } from "../utilies/addCanvasAsPagedJpegs";
import {
  buildPdfCaptureNode,
  patchOklabColors,
  removePdfCaptureNode,
} from "../utilies/dailyReportPdfCapture";

export default function DailyReport() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [reportDate, setReportDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  const { data: dailyReportData, isLoading: reportLoading, isError } =
    useDailyReport({
      startDate: reportDate,
      endDate: reportDate,
    });

  const exportToPDF = async () => {
    if (!dailyReportData || isExporting) return;

    const reportElement = document.getElementById("daily-report-content");
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
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("dailyReport.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("dailyReport.subtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("dailyReport.selectDate")}
            </label>
            <JalaliDatePicker
              value={reportDate}
              onChange={(nextValue) => {
                const iso = normalizeDateToIso(nextValue);
                if (iso) setReportDate(iso);
              }}
              placeholder={t("dailyReport.selectDate")}
              clearable={false}
            />
          </div>
          <button
            type="button"
            onClick={exportToPDF}
            disabled={reportLoading || !dailyReportData || isExporting}
            className="btn-primary shadow-none hover:shadow-none w-full md:w-auto px-4 py-2.5 rounded-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {isExporting
              ? t("dailyReport.exportingPDF")
              : t("dailyReport.exportPDF")}
          </button>
        </div>
      </div>

      {isExporting && (
        <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-3 bg-black/60 pointer-events-none">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-white text-sm font-medium">
            {t("dailyReport.exportingPDF")}
          </p>
        </div>
      )}

      {reportLoading && (
        <div className="flex justify-center items-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{t("dailyReport.error")}</p>
        </div>
      )}

      {dailyReportData && (
        <div id="daily-report-content">
          <ReportPDF data={dailyReportData.data} reportDate={reportDate} />
        </div>
      )}
    </div>
  );
}
