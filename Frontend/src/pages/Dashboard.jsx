import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableRow from "../components/TableRow";
import {
  useRecentTransactions,
  useReverseTransaction,
  useDailyReport,
} from "../services/useApi";
import { useAuditLogsByTable, useAuditLogs } from "../services/useAuditLogs";
import TableHeader from "./../components/TableHeader";
import { formatCurrency } from "./../utilies/helper";
import Select from "../components/Select";
import Pagination from "../components/Pagination";
import GloableModal from "../components/GloableModal";
import JalaliDatePicker from "../components/JalaliDatePicker";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReportPDF from "../components/ReportPDF";

const TABLE_FILTER_VALUES = [
  "all",
  "Account",
  "AccountTransaction",
  "AuditLog",
  "Brand",
  "Category",
  "Company",
  "Customer",
  "Employee",
  "EmployeeStock",
  "Expense",
  "Income",
  "Product",
  "Purchase",
  "PurchaseItem",
  "Sale",
  "SaleItem",
  "SaleReturn",
  "Stock",
  "StockTransfer",
  "Supplier",
  "Type",
  "Unit",
  "User",
];

const Dashboard = () => {
  const { t, i18n } = useTranslation();

  const headers = useMemo(
    () => [
      { title: t("dashboard.headers.account") },
      { title: t("dashboard.headers.type") },
      { title: t("dashboard.headers.date") },
      { title: t("dashboard.headers.amount") },
      { title: t("dashboard.headers.reference") },
      { title: t("dashboard.headers.actions") },
    ],
    [t]
  );

  const auditLogHeaders = useMemo(
    () => [
      { title: t("dashboard.auditHeaders.changedAt") },
      { title: t("dashboard.auditHeaders.table") },
      { title: t("dashboard.auditHeaders.reason") },
      { title: t("dashboard.auditHeaders.changedBy") },
      { title: t("dashboard.auditHeaders.operationType") },
      { title: t("dashboard.auditHeaders.details") },
    ],
    [t]
  );

  const tableOptions = useMemo(
    () =>
      TABLE_FILTER_VALUES.map((value) => ({
        value,
        label: t(`dashboard.tables.${value}`),
      })),
    [t]
  );

  const translateFieldName = useCallback(
    (fieldName) =>
      t(`dashboard.fields.${fieldName}`, { defaultValue: fieldName }),
    [t]
  );

  // Helper function to filter out ID fields
  const filterDataFields = (data) => {
    if (!data || typeof data !== "object") return data;
    const filtered = {};
    Object.entries(data).forEach(([key, value]) => {
      if (
        !key.toLowerCase().endsWith("id") &&
        !key.toLowerCase().endsWith("_id") &&
        key.toLowerCase() !== "id"
      ) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  const renderValue = useCallback(
    (value, depth = 0) => {
      if (value === null || value === undefined) {
        return (
          <span className="text-gray-500">
            {t("dashboard.render.emptyValue")}
          </span>
        );
      }
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          return (
            <div className={`ml-${depth * 4} mt-1`}>
              <div className="text-xs text-gray-600 mb-1">
                {t("dashboard.render.arrayLabel", { count: value.length })}
              </div>
              {value.map((item, index) => (
                <div
                  key={index}
                  className="border-l-2 border-gray-200 pl-2 mb-1"
                >
                  <span className="text-xs text-gray-500">[{index}]:</span>
                  {renderValue(item, depth + 1)}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className={`ml-${depth * 4} mt-1`}>
            <div className="text-xs text-gray-600 mb-1">
              {t("dashboard.render.objectLabel")}
            </div>
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="border-l-2 border-gray-200 pl-2 mb-1">
                <span className="font-medium text-xs">
                  {translateFieldName(key)}:
                </span>
                {renderValue(val, depth + 1)}
              </div>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;
    },
    [t, translateFieldName]
  );
  const getTypeColor = (type) => {
    switch (type) {
      case "Sale":
        return "text-blue-600 ";
      case "Purchase":
        return "text-orange-600  ";
      case "Payment":
        return "text-green-600";
      case "Transfer":
        return "text-purple-600 ";
      case "Expense":
        return "text-red-600";
      case "Credit":
        return "text-green-700 ";
      case "Debit":
        return "text-red-700 ";
      case "SaleReturn":
        return "text-yellow-600 ";
      default:
        return "text-gray-800";
    }
  };

  const getTransactionTypeLabel = useCallback(
    (type) => t(`dashboard.transactionTypes.${type}`, { defaultValue: type }),
    [t]
  );

  const getOperationLabel = useCallback(
    (operation) =>
      t(`dashboard.operations.${operation}`, { defaultValue: operation }),
    [t]
  );

  const getOperationColor = (operation) => {
    switch (operation) {
      case "INSERT":
        return "text-green-600";
      case "UPDATE":
        return "text-yellow-600";
      case "DELETE":
        return "text-red-600";
      default:
        return "text-gray-800";
    }
  };

  // API hooks
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionLimit, setTransactionLimit] = useState(10);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState("logs");
  const { data: recentTransactions, isLoading: statsLoading } =
    useRecentTransactions({
      page: currentPage,
      limit: transactionLimit,
      search: transactionSearch,
      sortBy: "date",
      sortOrder: "desc",
    });
  const { mutate: reverseTransaction, isLoading: reverseLoading } =
    useReverseTransaction();

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

  // PDF Export function
  const exportToPDF = async () => {
    if (!dailyReportData) return;

    const reportElement = document.getElementById('daily-report-content');
    if (!reportElement) return;

    try {
      // Force a repaint to ensure all text is rendered
      reportElement.style.display = 'none';
      reportElement.offsetHeight; // Trigger reflow
      reportElement.style.display = 'block';
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Patch oklch colors before capturing
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
  // Audit logs hooks
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [selectedTable, setSelectedTable] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Daily Report state
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);
  const { data: dailyReportData, isLoading: reportLoading } = useDailyReport({
    startDate: reportDate,
    endDate: reportDate,
  });

  const allAuditLogs = useAuditLogs({
    page: auditPage,
    limit: auditLimit,
    search: searchTerm,
    sortBy: "changedAt",
    sortOrder: "desc",
  });

  const tableAuditLogs = useAuditLogsByTable(selectedTable, {
    page: auditPage,
    limit: auditLimit,
    search: searchTerm,
    sortBy: "changedAt",
    sortOrder: "desc",
  });
  const tableLogs = selectedTable === "all" ? allAuditLogs : tableAuditLogs;
  const auditLogs = tableLogs.data;
  const auditLoading = tableLogs.isLoading;

  useEffect(() => {
    setAuditPage(1);
  }, [selectedTable]);

  const handleReverseClick = (transaction) => {
    if (transaction && transaction._id && transaction._id !== "undefined") {
      setSelectedTransaction(transaction);
      setShowModal(true);
    }
  };

  const handleConfirmReverse = () => {
    if (reason.trim() && selectedTransaction && selectedTransaction._id) {
      reverseTransaction({ id: selectedTransaction._id, reason });
      setShowModal(false);
      setReason("");
      setSelectedTransaction(null);
    }
  };

  // Format recent transactions from API data

  const formatTimeAgo = useCallback(
    (dateString) => {
      if (!dateString) return t("dashboard.time.unknown");
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

      if (diffInHours < 1) return t("dashboard.time.justNow");
      if (diffInHours < 24)
        return t("dashboard.time.hoursAgo", { count: diffInHours });
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7)
        return t("dashboard.time.daysAgo", { count: diffInDays });
      const lang = (i18n.language || "ps").split("-")[0];
      const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
      return date.toLocaleDateString(localeTag);
    },
    [t, i18n.language]
  );

  return (
    <div
      dir={i18n.dir()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Page header */}
      <div className=" ">
        <h1
          className="font-bold text-xl pb-2"
          style={{
            color: "var(--text-dark)",
          }}
        >
          {t("dashboard.title")}
        </h1>
        <p
          style={{
            color: "var(--text-medium)",
            fontSize: "var(--body-regular)",
          }}
        >
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Daily Report Section */}
      <div className="bg-white rounded-lg shadow border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Export PDF Button */}
            {dailyReportData && (
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {t("dailyReport.exportPDF")}
              </button>
            )}
            
            {/* Persian Date Picker */}
            <div className="w-64">
              <JalaliDatePicker
                value={reportDate}
                onChange={setReportDate}
                placeholder={t("dailyReport.selectDate")}
                clearable={false}
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {reportLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{t("dailyReport.loading")}</p>
          </div>
        )}

        {/* Report Content */}
        {!reportLoading && dailyReportData && (
          <div id="daily-report-content" style={{ fontFamily: "'Noto Nastaliq Urdu', Arial, serif", direction: 'rtl', backgroundColor: 'white', padding: '1rem' }}>
            <style>{`
              #daily-report-content * {
                font-family: 'Noto Nastaliq Urdu', Arial, serif !important;
              }
            `}</style>
            {/* Report Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #d1d5db', paddingBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورځنی راپور</h2>
              <p style={{ fontSize: '1.25rem', color: '#6b7280', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                نېټه: {new Date(reportDate).toLocaleDateString('fa-AF')}
              </p>
            </div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.purchases")}</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                  {dailyReportData.data.summary.totalPurchases.toLocaleString()}
                </p>
                <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.sales")}</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                  {dailyReportData.data.summary.totalSales.toLocaleString()}
                </p>
                <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.totalExpenses")}</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                  {dailyReportData.data.summary.totalExpenses.toLocaleString()}
                </p>
                <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
              </div>
            </div>

            {/* Store, Customer, Supplier Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Store Summary */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>د دوکان معلومات</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ارزښت:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.storeValue.toLocaleString()} افغانۍ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>محصولات:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.storeProducts}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مقدار:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.storeQuantity.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Customer Summary */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>مشتریان</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.customerMoneyIn.toLocaleString()} افغانۍ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.customerMoneyOut.toLocaleString()} افغانۍ</span>
                  </div>
                </div>
              </div>

              {/* Supplier Summary */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>عرضه کوونکي</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.supplierMoneyIn.toLocaleString()} افغانۍ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې:</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{dailyReportData.data.summary.supplierMoneyOut.toLocaleString()} افغانۍ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Products */}
            {dailyReportData.data.store?.products && dailyReportData.data.store.products.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د دوکان محصولات</h3>
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>محصول</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>واحد</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مقدار</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ارزښت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportData.data.store.products.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.product?.name || '—'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.unit?.name || '—'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.quantity?.toLocaleString() || 0}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.value?.toLocaleString() || 0} افغانۍ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sales Records */}
            {dailyReportData.data.sales?.records && dailyReportData.data.sales.records.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>خرڅلاو ({dailyReportData.data.sales.count})</h3>
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>نېټه</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مشتري</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ټول</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورکړل شوی</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>پاتې</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportData.data.sales.records.map((sale, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{new Date(sale.saleDate).toLocaleDateString('fa-AF')}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.customer?.name || 'نغدي'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.totalAmount?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.paidAmount?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.dueAmount?.toLocaleString() || 0} افغانۍ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purchase Records */}
            {dailyReportData.data.purchases?.records && dailyReportData.data.purchases.records.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>رانیول ({dailyReportData.data.purchases.count})</h3>
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>نېټه</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>عرضه کوونکی</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ټول</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورکړل شوی</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>پاتې</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportData.data.purchases.records.map((purchase, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{new Date(purchase.purchaseDate).toLocaleDateString('fa-AF')}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.supplier?.name || '—'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.totalAmount?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.paidAmount?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.dueAmount?.toLocaleString() || 0} افغانۍ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Supplier Accounts */}
            {dailyReportData.data.suppliers?.accounts && dailyReportData.data.suppliers.accounts.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د عرضه کوونکو حسابونه ({dailyReportData.data.suppliers.accounts.length})</h3>
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>عرضه کوونکی</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>بیلانس</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportData.data.suppliers.accounts.map((acc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.account?.name || '—'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyIn?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyOut?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{(acc.moneyIn - acc.moneyOut).toLocaleString()} افغانۍ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}  

            {/* Customer Accounts */}
            {dailyReportData.data.customers?.accounts && dailyReportData.data.customers.accounts.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د مشتریانو حسابونه ({dailyReportData.data.customers.accounts.length})</h3>
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مشتري</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>بیلانس</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportData.data.customers.accounts.map((acc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.account?.name || '—'}</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyIn?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyOut?.toLocaleString() || 0} افغانۍ</td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{(acc.moneyIn - acc.moneyOut).toLocaleString()} افغانۍ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg  border border-slate-100">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "logs"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BuildingOffice2Icon className="h-5 w-5" />
              {t("dashboard.tabs.logs")}
            </button>
            <button
              onClick={() => setActiveTab("transaction")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "transaction"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t("dashboard.tabs.transactions")}
            </button>
          </nav>
        </div>
      </div>
      {activeTab === "transaction" && (
        <Fragment>
          {/* Search and Pagination Row */}
          <div className="flex py-3 border border-slate-200 items-center justify-between bg-white rounded-md">
            <div className="relative pr-3">
              <input
                type="text"
                placeholder={t("dashboard.searchTransactions")}
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm pr-10`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader headerData={headers} />
              <TableBody>
                {statsLoading ? (
                  <TableRow>
                    <TableColumn>
                      <p className="">{t("dashboard.loading")}</p>
                    </TableColumn>
                  </TableRow>
                ) : recentTransactions?.data?.transactions?.length > 0 ? (
                  recentTransactions.data?.transactions?.map(
                    (transaction, index) => (
                      <TableRow key={index}>
                        <TableColumn className="px-4 py-2">
                          {transaction.transactionType === "Transfer" ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-red-600 font-semibold">
                                {t("dashboard.from")}{" "}
                                {transaction.account?.name || t("dashboard.unknown")}
                              </span>
                              <span className="text-green-600 font-semibold">
                                {t("dashboard.to")}{" "}
                                {transaction.pairedAccount?.name ||
                                  t("dashboard.unknown")}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`font-semibold ${
                                (transaction.amount || 0) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.account?.name || t("dashboard.unknown")}
                            </span>
                          )}
                        </TableColumn>
                        <TableColumn
                          className={`font-semibold text-center ${getTypeColor(
                            transaction.transactionType
                          )}`}
                        >
                          {getTransactionTypeLabel(
                            transaction.transactionType
                          )}
                        </TableColumn>
                        <TableColumn className="px-4">
                          {formatTimeAgo(transaction.createdAt || transaction.date)}
                        </TableColumn>
                        <TableColumn
                          className={`px-4 font-semibold ${
                            (transaction.amount || 0) > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </TableColumn>
                        <TableColumn className="px-4">
                          {transaction.referenceData ? (
                            <div className="text-sm">
                              {transaction.referenceData.purchaseNumber && (
                                <span className="text-blue-600">
                                  {t("dashboard.refPurchase")}{" "}
                                  {transaction.referenceData.purchaseNumber}
                                </span>
                              )}
                              {transaction.referenceData.saleNumber && (
                                <span className="text-green-600">
                                  {t("dashboard.refSale")}{" "}
                                  {transaction.referenceData.saleNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableColumn>
                        <TableColumn className="px-4">
                          <button
                            onClick={() => handleReverseClick(transaction)}
                            disabled={reverseLoading}
                            className="text-red-500 transition-all duration-200 hover:bg-red-100 p-0.5 rounded-full  hover:text-red-700 disabled:opacity-50"
                            title={t("dashboard.reverseTitle")}
                          >
                            <ArrowUturnLeftIcon className="h-5 w-5" />
                          </button>
                        </TableColumn>
                      </TableRow>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      {t("dashboard.noTransactions")}
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            <div className="w-full  justify-center flex items-center gap-4">
              <Pagination
                page={currentPage}
                limit={transactionLimit}
                total={recentTransactions?.data?.pagination?.total || 0}
                totalPages={
                  recentTransactions?.data?.pagination?.totalPages || 0
                }
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(newLimit) => {
                  setTransactionLimit(newLimit);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </Fragment>
      )}
      {activeTab === "logs" && (
        <Fragment>
          <div className=" space-x-4 flex bg-white py-3 border border-slate-200 rounded-md   items-center justify-between">
            <div className="flex w-[40%] flex-col md:flex-row gap-x-4   items-center pr-3">
              <div className=" flex-1  flex items-center">
                <Select
                  label=""
                  id="table-select"
                  options={tableOptions}
                  value={selectedTable}
                  onChange={(value) => setSelectedTable(value)}
                />
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t("dashboard.searchAudit")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm pr-10`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader headerData={auditLogHeaders} />
              <TableBody>
                {auditLoading ? (
                  <TableRow>
                    <TableColumn>
                      <p className="">{t("dashboard.loading")}</p>
                    </TableColumn>
                  </TableRow>
                ) : auditLogs?.data?.length > 0 ? (
                  auditLogs.data.map((log, index) => (
                    <TableRow key={index}>
                      <TableColumn className="px-4 py-2">
                        {formatTimeAgo(log.changedAt)}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.tableName || "-"}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.reason || t("dashboard.noReason")}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.changedBy || "-"}
                      </TableColumn>
                      <TableColumn
                        className={`px-4 font-semibold ${getOperationColor(
                          log.operation
                        )}`}
                      >
                        {getOperationLabel(log.operation)}
                      </TableColumn>
                      <TableColumn className="px-4">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-500 hover:bg-blue-100 p-1 rounded transition-colors"
                          title={t("dashboard.viewDetailsTitle")}
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </TableColumn>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      {t("dashboard.noAuditLogs")}
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            <div className=" w-full  flex justify-center items-center pl-10  ">
              <Pagination
                page={auditPage}
                limit={auditLimit}
                total={auditLogs?.pagination?.total || 0}
                totalPages={auditLogs?.pagination?.totalPages}
                onPageChange={setAuditPage}
                onRowsPerPageChange={(newLimit) => {
                  setAuditLimit(newLimit);
                  setAuditPage(1);
                }}
              />
            </div>
          </div>
        </Fragment>
      )}

      <GloableModal open={showModal} setOpen={setShowModal} isClose={true}>
        <div className="bg-white p-6 rounded-lg shadow-lg  lg:w-[500px] w-[350px] mx-4">
          <h3 className="text-lg font-semibold mb-4">
            {t("dashboard.confirmReverseTitle")}
          </h3>
          <p className="mb-4">{t("dashboard.confirmReverseHint")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            rows="3"
            placeholder={t("dashboard.reasonPlaceholder")}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              {t("dashboard.cancel")}
            </button>
            <button
              onClick={handleConfirmReverse}
              disabled={!reason.trim() || reverseLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {reverseLoading
                ? t("dashboard.processing")
                : t("dashboard.confirmReverse")}
            </button>
          </div>
        </div>
      </GloableModal>

      <GloableModal
        open={showDetailsModal}
        setOpen={setShowDetailsModal}
        isClose={true}
      >
        {selectedLog && (
          <div className=" w-[550px] px-5 mx-auto rounded-lg lg:w-[800px] bg-white overflow-y-auto ">
            <div className=" bg-transparent    w-full  max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {t("dashboard.auditDetailTitle")}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("dashboard.labelTable")}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.tableName || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("dashboard.labelOperationType")}
                    </label>
                    <p
                      className={`mt-1 text-sm font-semibold ${getOperationColor(
                        selectedLog.operation
                      )}`}
                    >
                      {getOperationLabel(selectedLog.operation)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("dashboard.labelChangedBy")}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.changedBy || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("dashboard.labelChangedAt")}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatTimeAgo(selectedLog.changedAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("dashboard.labelReason")}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLog.reason || t("dashboard.noReason")}
                  </p>
                </div>
                {selectedLog.operation === "INSERT" && selectedLog.newData && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("dashboard.newRowsTitle")}
                    </label>
                    <div className="bg-green-50 p-4 rounded border border-slate-200 overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-green-100">
                            <th className="px-4 py-2 text-left text-green-800 font-semibold">
                              {t("dashboard.thField")}
                            </th>
                            <th className="px-4 py-2 text-left text-green-800 font-semibold">
                              {t("dashboard.thValue")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            filterDataFields(selectedLog.newData)
                          ).map(([key, value], index) => (
                            <tr
                              key={key}
                              className={
                                index % 2 === 0 ? "bg-green-50" : "bg-white"
                              }
                            >
                              <td className="px-4 py-2 font-medium text-green-800 border-b border-green-200">
                                {translateFieldName(key)}
                              </td>
                              <td className="px-4 py-2 text-green-700 border-b border-green-200">
                                {renderValue(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {selectedLog.operation === "UPDATE" &&
                  (selectedLog.oldData || selectedLog.newData) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("dashboard.compareTitle")}
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedLog.oldData && (
                          <div className="bg-red-50 p-4 rounded border rounded-slate-500 overflow-x-auto">
                            <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                              <span>🔴</span> {t("dashboard.oldBlockTitle")}
                            </h4>
                            <table className="min-w-full table-auto">
                              <thead>
                                <tr className="bg-red-100">
                                  <th className="px-4 py-2 text-left text-red-800 font-semibold">
                                    {t("dashboard.thField")}
                                  </th>
                                  <th className="px-4 py-2 text-left text-red-800 font-semibold">
                                    {t("dashboard.thOldValue")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  filterDataFields(selectedLog.oldData)
                                ).map(([key, value], index) => (
                                  <tr
                                    key={key}
                                    className={
                                      index % 2 === 0 ? "bg-red-50" : "bg-white"
                                    }
                                  >
                                    <td className="px-4 py-2 font-medium text-red-800 border-b border-red-200">
                                      {translateFieldName(key)}
                                    </td>
                                    <td className="px-4 py-2 text-red-700 border-b border-red-200">
                                      {renderValue(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {selectedLog.newData && (
                          <div className="bg-green-50 p-4 rounded border overflow-x-auto">
                            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                              <span>🟢</span> {t("dashboard.newBlockTitle")}
                            </h4>
                            <table className="min-w-full table-auto">
                              <thead>
                                <tr className="bg-green-100">
                                  <th className="px-4 py-2 text-left text-green-800 font-semibold">
                                    {t("dashboard.thField")}
                                  </th>
                                  <th className="px-4 py-2 text-left text-green-800 font-semibold">
                                    {t("dashboard.thNewValue")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  filterDataFields(selectedLog.newData)
                                ).map(([key, value], index) => (
                                  <tr
                                    key={key}
                                    className={
                                      index % 2 === 0
                                        ? "bg-green-50"
                                        : "bg-white"
                                    }
                                  >
                                    <td className="px-4 py-2 font-medium text-green-800 border-b border-green-200">
                                      {translateFieldName(key)}
                                    </td>
                                    <td className="px-4 py-2 text-green-700 border-b border-green-200">
                                      {renderValue(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                {selectedLog.operation === "DELETE" && selectedLog.oldData && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("dashboard.deletedRowsTitle")}
                    </label>
                    <div className="bg-red-50 p-4 rounded border border-slate-300 overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-red-100">
                            <th className="px-4 py-2 text-left text-red-800 font-semibold">
                              {t("dashboard.thField")}
                            </th>
                            <th className="px-4 py-2 text-left text-red-800 font-semibold">
                              {t("dashboard.thDeletedValue")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedLog.oldData).map(
                            ([key, value], index) => (
                              <tr
                                key={key}
                                className={
                                  index % 2 === 0 ? "bg-red-50" : "bg-white"
                                }
                              >
                                <td className="px-4 py-2 font-medium text-red-800 border-b border-red-200">
                                  {translateFieldName(key)}
                                </td>
                                <td className="px-4 py-2 text-red-700 border-b border-red-200">
                                  {renderValue(value)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  {t("dashboard.close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
    </div>
  );
};

export default Dashboard;
