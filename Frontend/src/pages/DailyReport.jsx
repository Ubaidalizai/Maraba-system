import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDailyReport } from "../services/useApi";
import { FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReportPDF from "../components/ReportPDF";

export default function DailyReport() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);

  const { data: dailyReportData, isLoading: reportLoading, isError } = useDailyReport({
    startDate: reportDate,
    endDate: reportDate,
  });

  // Patch oklch colors to standard colors for html2canvas
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
          if (prop === 'color') {
            el.style[prop] = '#1e293b';
          } else if (prop.includes('background')) {
            el.style[prop] = '#ffffff';
          } else if (prop.includes('border')) {
            el.style[prop] = '#e2e8f0';
          } else {
            el.style[prop] = '#222222';
          }
        }
      });
    }
  };

  const exportToPDF = async () => {
    if (!dailyReportData) return;

    const reportElement = document.getElementById('daily-report-content');
    if (!reportElement) return;

    try {
      reportElement.style.display = 'none';
      reportElement.offsetHeight;
      reportElement.style.display = 'block';
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      patchOklabColors(reportElement);

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.classList?.contains('no-print'),
        logging: false,
        letterRendering: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Daily_Report_${reportDate}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("dailyReport.title")}</h1>
        <p className="text-gray-600">{t("dailyReport.subtitle")}</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("dailyReport.selectDate")}
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportToPDF}
              disabled={reportLoading || !dailyReportData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiDownload />
              {t("dailyReport.exportPDF")}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {reportLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t("dailyReport.loading")}</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{t("dailyReport.error")}</p>
        </div>
      )}

      {/* Report Content */}
      {dailyReportData && (
        <div id="daily-report-content">
          <ReportPDF data={dailyReportData.data} reportDate={reportDate} />
        </div>
      )}
    </div>
  );
}
