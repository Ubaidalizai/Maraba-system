import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
  CubeIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  HashtagIcon,
  DocumentTextIcon,
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import {
  useSalesReports,
  useNetProfit,
  useProfitStats,
  useProfitSummary,
  usePurchaseReports,
  useExpenseSummary,
  useCategoriesByType,
  useAccountBalances,
  useCashFlowReport,
  useStockReport,
} from "../services/useApi";
import { formatNumber, formatCurrency, normalizeDateToIso, toPersianDigits, toEnglishDigits } from "../utilies/helper";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import gregorianCalendar from "react-date-object/calendars/gregorian";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import JalaliDatePicker from "../components/JalaliDatePicker";

const dateEnabledReports = new Set([
  "sales",
  "purchases",
  "expenses",
  "profit",
  "accounts",
]);

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentJalaliYearNumber = () => {
  const todayGregorian = new DateObject({ calendar: gregorianCalendar });
  const todayJalali = todayGregorian.convert(persianCalendar);
  return parseInt(todayJalali.format("YYYY"), 10);
};

const getCurrentYearValue = () => {
  return getCurrentJalaliYearNumber().toString();
};

const createInitialFilter = () => ({
  range: "monthly",
  month: getCurrentMonthValue(),
  year: getCurrentYearValue(),
});

const getJalaliYearIsoRange = (jalaliYearString) => {
  const fallbackYear = new Date().getFullYear();
  const y = parseInt(jalaliYearString, 10);
  const jalaliYear = Number.isNaN(y) ? fallbackYear : y;

  try {
    // Start of Jalali year -> Gregorian ISO
    const startJalali = new DateObject({
      date: `${jalaliYear}/01/01`,
      format: "YYYY/MM/DD",
      calendar: persianCalendar,
    });
    const startIso = startJalali.convert(gregorianCalendar).format("YYYY-MM-DD");

    // End of Jalali year: take first day of next Jalali year, subtract 1 day
    const nextYearFirst = new DateObject({
      date: `${jalaliYear + 1}/01/01`,
      format: "YYYY/MM/DD",
      calendar: persianCalendar,
    });
    const endJalali = nextYearFirst.subtract(1, "day");
    const endIso = endJalali.convert(gregorianCalendar).format("YYYY-MM-DD");

    return { startDate: startIso, endDate: endIso };
  } catch (_e) {
    // Fallback to Gregorian year if anything goes wrong
    const startDate = new Date(fallbackYear, 0, 1).toISOString().split("T")[0];
    const endDate = new Date(fallbackYear, 11, 31).toISOString().split("T")[0];
    return { startDate, endDate };
  }
};

const Reports = () => {
  const { t, i18n } = useTranslation();
  const [selectedReport, setSelectedReport] = useState("sales");
  const [reportFilters, setReportFilters] = useState(() => {
    const initial = {};
    dateEnabledReports.forEach((report) => {
      initial[report] = createInitialFilter();
    });
    return initial;
  });
  const [profitChartType, setProfitChartType] = useState("net"); // "net" or "gross"
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(""); // Empty string means "all categories"
  const [selectedStockLocation, setSelectedStockLocation] = useState("all"); // "all", "warehouse", or "store"
  const [selectedStockLevel, setSelectedStockLevel] = useState("low"); // "all", "low", "critical", or "out"
  const localeTag = (i18n.language || "ps").split("-")[0] === "ps" ? "ps-AF" : "fa-IR";

  const reportTypes = useMemo(
    () => [
      { id: "sales", name: t("reports.types.sales"), icon: ShoppingBagIcon },
      {
        id: "inventory",
        name: t("reports.types.inventory"),
        icon: CubeIcon,
      },
      {
        id: "purchases",
        name: t("reports.types.purchases"),
        icon: ShoppingCartIcon,
      },
      { id: "accounts", name: t("reports.types.accounts"), icon: BanknotesIcon },
      {
        id: "expenses",
        name: t("reports.types.expenses"),
        icon: ReceiptPercentIcon,
      },
      { id: "profit", name: t("reports.types.profit"), icon: ChartPieIcon },
    ],
    [t]
  );

  const updateReportFilter = (reportId, updater) => {
    if (!dateEnabledReports.has(reportId)) {
      return;
    }

    setReportFilters((prev) => {
      const current = prev[reportId] || createInitialFilter();
      const nextFilters =
        typeof updater === "function"
          ? updater(current)
          : { ...current, ...updater };
      return {
        ...prev,
        [reportId]: { ...current, ...nextFilters },
      };
    });
  };

  const activeFilter = useMemo(() => {
    if (!dateEnabledReports.has(selectedReport)) {
      return null;
    }
    return reportFilters[selectedReport] || createInitialFilter();
  }, [reportFilters, selectedReport]);

  const hasDateControls = Boolean(activeFilter);
  const activeRange = activeFilter?.range || "monthly";

  // Calculate date range based on selected period
  const getDateRange = (filter) => {
    const now = new Date();
    const safeFilter = filter || createInitialFilter();
    const { range, month, year } = safeFilter;

    const formatDate = (date) => date.toISOString().split("T")[0];
    let startDate;
    let endDate;

    if (range === "yearly") {
      // Treat 'year' as Jalali year; convert to Gregorian ISO start/end for backend
      const rangeIso = getJalaliYearIsoRange(year);
      return rangeIso;
    } else {
      const monthValue = month && month.includes("-") ? month : getCurrentMonthValue();
      const [yearPart, monthPart] = monthValue.split("-").map(Number);

      if (
        !Number.isNaN(yearPart) &&
        !Number.isNaN(monthPart) &&
        monthPart >= 1 &&
        monthPart <= 12
      ) {
        startDate = new Date(yearPart, monthPart - 1, 1);
        endDate = new Date(yearPart, monthPart, 0);
      } else {
        const fallbackMonth = getCurrentMonthValue();
        const [fallbackYear, fallbackMonthNumber] = fallbackMonth
          .split("-")
          .map(Number);
        startDate = new Date(fallbackYear, fallbackMonthNumber - 1, 1);
        endDate = new Date(fallbackYear, fallbackMonthNumber, 0);
      }
    }

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  };

  // Map UI range to backend groupBy values
  const groupByMap = {
    monthly: "day", // Monthly view shows days
    yearly: "month", // Yearly view shows months
  };

  const salesFilter = reportFilters.sales;
  const purchaseFilter = reportFilters.purchases;
  const expenseFilter = reportFilters.expenses;
  const profitFilter = reportFilters.profit;
  const accountsFilter = reportFilters.accounts;

  const salesDateParams = useMemo(
    () => getDateRange(salesFilter),
    [salesFilter]
  );
  const purchaseDateParams = useMemo(
    () => getDateRange(purchaseFilter),
    [purchaseFilter]
  );
  const expenseDateParams = useMemo(
    () => getDateRange(expenseFilter),
    [expenseFilter]
  );
  const profitDateParams = useMemo(
    () => getDateRange(profitFilter),
    [profitFilter]
  );
  const accountsDateParams = useMemo(
    () => getDateRange(accountsFilter),
    [accountsFilter]
  );

  const salesGroupBy = groupByMap[salesFilter?.range] || "day";
  const purchasesGroupBy = groupByMap[purchaseFilter?.range] || "day";
  const expensesGroupBy = groupByMap[expenseFilter?.range] || "day";
  const profitGroupBy = groupByMap[profitFilter?.range] || "day";
  const accountsGroupBy = groupByMap[accountsFilter?.range] || "day";

  // Fetch sales reports data
  const { data: salesReportsData, isLoading: salesReportsLoading } =
    useSalesReports({
      startDate: salesDateParams.startDate,
      endDate: salesDateParams.endDate,
      groupBy: salesGroupBy,
    });

  // Fetch purchase reports data
  const { data: purchaseReportsData, isLoading: purchaseReportsLoading } =
    usePurchaseReports({
      startDate: purchaseDateParams.startDate,
      endDate: purchaseDateParams.endDate,
      groupBy: purchasesGroupBy,
    });

  // Fetch expense categories (for filter dropdown)
  const { data: expenseCategoriesData } = useCategoriesByType("expense");

  // Fetch account balances data
  const { data: accountBalancesData } = useAccountBalances();

  // Fetch cash flow report data
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlowReport({
    startDate: accountsDateParams.startDate,
    endDate: accountsDateParams.endDate,
    groupBy: accountsGroupBy,
  });

  // Fetch stock report data
  const { data: stockReportData, isLoading: stockReportLoading } =
    useStockReport({
      location:
        selectedStockLocation === "all" ? undefined : selectedStockLocation,
      stockLevel: selectedStockLevel === "all" ? undefined : selectedStockLevel,
    });

  // Fetch expense summary data
  const { data: expenseSummaryData, isLoading: expenseSummaryLoading } =
    useExpenseSummary({
      startDate: expenseDateParams.startDate,
      endDate: expenseDateParams.endDate,
      groupBy: expensesGroupBy,
      category: selectedExpenseCategory || undefined, // Only include if category is selected
    });

  // Fetch profit data
  const { data: netProfitData, isLoading: netProfitLoading } = useNetProfit({
    startDate: profitDateParams.startDate,
    endDate: profitDateParams.endDate,
  });

  const { isLoading: profitStatsLoading } = useProfitStats({
    startDate: profitDateParams.startDate,
    endDate: profitDateParams.endDate,
  });

  const { data: profitSummaryData, isLoading: profitSummaryLoading } =
    useProfitSummary({
      startDate: profitDateParams.startDate,
      endDate: profitDateParams.endDate,
      groupBy: profitGroupBy,
    });

  // Note: inventoryData will be fetched from API in future

  // Generate all periods in date range and merge with API data
  const chartData = useMemo(() => {
    if (selectedReport !== "sales" || !salesReportsData?.data) return [];

    const { startDate, endDate } = salesDateParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const range = salesFilter?.range || "monthly";

    // Get API data
    const apiData = salesReportsData.data.summary || [];

    // Create map of API data by date key
    const apiMap = new Map();
    apiData.forEach((item) => {
      const key = item.date || item.period || "";
      apiMap.set(key, {
        date: key,
        sales: parseFloat(item.sales) || 0,
        paid: parseFloat(item.paid) || 0,
        due: parseFloat(item.due) || 0,
        count: parseInt(item.count) || 0,
      });
    });

    // Generate all periods in range
    const allPeriods = [];

    if (range === "monthly") {
      // Monthly view: Generate all days of the selected month
      let current = new Date(start);
      while (current <= end) {
        const dateKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        allPeriods.push({
          date: `${current.getDate()}`, // Show day number
          fullDate: dateKey, // Keep for matching with API
          sales: apiMap.get(dateKey)?.sales || 0,
          paid: apiMap.get(dateKey)?.paid || 0,
          due: apiMap.get(dateKey)?.due || 0,
          count: apiMap.get(dateKey)?.count || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === "yearly") {
      // Yearly view: Generate all 12 months
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      // Use Gregorian year from the date range (already converted from Jalali)
      const gregorianYear = new Date(startDate).getFullYear();

      for (let month = 0; month < 12; month++) {
        const monthKey = `${monthNames[month]} ${gregorianYear}`;
        const apiItem = apiMap.get(monthKey);
        const monthLabel = new Date(gregorianYear, month, 1).toLocaleDateString(
          localeTag,
          { month: "long" }
        );
        allPeriods.push({
          date: monthLabel,
          fullDate: monthKey,
          sales: apiItem ? parseFloat(apiItem.sales) : 0,
          paid: apiItem ? parseFloat(apiItem.paid) : 0,
          due: apiItem ? parseFloat(apiItem.due) : 0,
          count: apiItem ? parseInt(apiItem.count) : 0,
        });
      }
    }

    return allPeriods;
  }, [salesReportsData, selectedReport, salesDateParams, salesFilter, localeTag]);

  // Chart data for profit reports - generate all periods like sales
  const profitChartData = useMemo(() => {
    if (selectedReport !== "profit" || !profitSummaryData?.data) return [];

    const { startDate, endDate } = profitDateParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const range = profitFilter?.range || "monthly";

    // Get API data
    const apiData = profitSummaryData.data.summary || [];

    // Create map of API data by period key
    const apiMap = new Map();
    apiData.forEach((item) => {
      const key = item.period || "";
      apiMap.set(key, {
        period: key,
        grossProfit: parseFloat(item.grossProfit) || 0,
        otherIncome: parseFloat(item.otherIncome) || 0,
        expenses: parseFloat(item.expenses) || 0,
        netProfit: parseFloat(item.netProfit) || 0,
      });
    });

    // Generate all periods in range
    const allPeriods = [];

    if (range === "monthly") {
      // Monthly view: Generate all days of the selected month
      let current = new Date(start);
      while (current <= end) {
        const dateKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        const apiItem = apiMap.get(dateKey);
        allPeriods.push({
          period: `${current.getDate()}`, // Show day number
          fullDate: dateKey,
          grossProfit: apiItem ? parseFloat(apiItem.grossProfit) : 0,
          otherIncome: apiItem ? parseFloat(apiItem.otherIncome) : 0,
          expenses: apiItem ? parseFloat(apiItem.expenses) : 0,
          netProfit: apiItem ? parseFloat(apiItem.netProfit) : 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === "yearly") {
      // Yearly view: Generate all 12 months
      // Profit API uses YYYY-MM format for monthly grouping
      // Use Gregorian year from the date range (already converted from Jalali)
      const gregorianYear = new Date(startDate).getFullYear();
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${gregorianYear}-${String(month).padStart(2, "0")}`; // Format: YYYY-MM
        const apiItem = apiMap.get(monthKey);
        const monthLabel = new Date(
          gregorianYear,
          month - 1,
          1
        ).toLocaleDateString(localeTag, {
          month: "long",
        });
        allPeriods.push({
          period: monthLabel,
          fullDate: monthKey,
          grossProfit: apiItem ? parseFloat(apiItem.grossProfit) : 0,
          otherIncome: apiItem ? parseFloat(apiItem.otherIncome) : 0,
          expenses: apiItem ? parseFloat(apiItem.expenses) : 0,
          netProfit: apiItem ? parseFloat(apiItem.netProfit) : 0,
        });
      }
    }

    return allPeriods;
  }, [profitSummaryData, selectedReport, profitDateParams, profitFilter, localeTag]);

  // Chart data for purchase reports - generate all periods like sales
  const purchaseChartData = useMemo(() => {
    if (selectedReport !== "purchases" || !purchaseReportsData?.data)
      return [];

    const { startDate, endDate } = purchaseDateParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const range = purchaseFilter?.range || "monthly";

    // Get API data
    const apiData = purchaseReportsData.data.summary || [];

    // Create map of API data by date key
    const apiMap = new Map();
    apiData.forEach((item) => {
      const key = item.date || item.period || "";
      apiMap.set(key, {
        date: key,
        purchases: parseFloat(item.purchases) || 0,
        paid: parseFloat(item.paid) || 0,
        due: parseFloat(item.due) || 0,
        count: parseInt(item.count) || 0,
      });
    });

    // Generate all periods in range
    const allPeriods = [];

    if (range === "monthly") {
      // Monthly view: Generate all days of the selected month
      let current = new Date(start);
      while (current <= end) {
        const dateKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        allPeriods.push({
          date: `${current.getDate()}`, // Show day number
          fullDate: dateKey, // Keep for matching with API
          purchases: apiMap.get(dateKey)?.purchases || 0,
          paid: apiMap.get(dateKey)?.paid || 0,
          due: apiMap.get(dateKey)?.due || 0,
          count: apiMap.get(dateKey)?.count || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === "yearly") {
      // Yearly view: Generate all 12 months
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      // Use Gregorian year from the date range (already converted from Jalali)
      const gregorianYear = new Date(startDate).getFullYear();

      for (let month = 0; month < 12; month++) {
        const monthKey = `${monthNames[month]} ${gregorianYear}`;
        const apiItem = apiMap.get(monthKey);
        const monthLabel = new Date(gregorianYear, month, 1).toLocaleDateString(
          localeTag,
          { month: "long" }
        );
        allPeriods.push({
          date: monthLabel,
          fullDate: monthKey,
          purchases: apiItem ? parseFloat(apiItem.purchases) : 0,
          paid: apiItem ? parseFloat(apiItem.paid) : 0,
          due: apiItem ? parseFloat(apiItem.due) : 0,
          count: apiItem ? parseInt(apiItem.count) : 0,
        });
      }
    }

    return allPeriods;
  }, [
    purchaseReportsData,
    selectedReport,
    purchaseDateParams,
    purchaseFilter,
    localeTag,
  ]);

  // Chart data for expense reports - generate all periods like sales
  const expenseChartData = useMemo(() => {
    if (selectedReport !== "expenses" || !expenseSummaryData?.data) return [];

    const { startDate, endDate } = expenseDateParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const range = expenseFilter?.range || "monthly";

    // Get API data
    const apiData = expenseSummaryData.data.summary || [];

    // Create map of API data by date key
    const apiMap = new Map();
    apiData.forEach((item) => {
      const key = item.date || item.period || "";
      apiMap.set(key, {
        date: key,
        expenses: parseFloat(item.expenses) || 0,
        count: parseInt(item.count) || 0,
      });
    });

    // Generate all periods in range
    const allPeriods = [];

    if (range === "monthly") {
      // Monthly view: Generate all days of the selected month
      let current = new Date(start);
      while (current <= end) {
        const dateKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        allPeriods.push({
          date: `${current.getDate()}`, // Show day number
          fullDate: dateKey, // Keep for matching with API
          expenses: apiMap.get(dateKey)?.expenses || 0,
          count: apiMap.get(dateKey)?.count || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === "yearly") {
      // Yearly view: Generate all 12 months
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      // Use Gregorian year from the date range (already converted from Jalali)
      const gregorianYear = new Date(startDate).getFullYear();

      for (let month = 0; month < 12; month++) {
        const monthKey = `${monthNames[month]} ${gregorianYear}`;
        const apiItem = apiMap.get(monthKey);
        const monthLabel = new Date(gregorianYear, month, 1).toLocaleDateString(
          localeTag,
          { month: "long" }
        );
        allPeriods.push({
          date: monthLabel,
          fullDate: monthKey,
          expenses: apiItem ? parseFloat(apiItem.expenses) : 0,
          count: apiItem ? parseInt(apiItem.count) : 0,
        });
      }
    }

    return allPeriods;
  }, [expenseSummaryData, selectedReport, expenseDateParams, expenseFilter, localeTag]);

  // Chart data for cash flow reports - generate all periods like sales
  const cashFlowChartData = useMemo(() => {
    if (selectedReport !== "accounts" || !cashFlowData?.data) return [];

    const { startDate, endDate } = accountsDateParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const range = accountsFilter?.range || "monthly";

    // Get API data
    const apiData = cashFlowData.data.summary || [];

    // Create map of API data by date key
    const apiMap = new Map();
    apiData.forEach((item) => {
      const key = item.date || item.period || "";
      apiMap.set(key, {
        date: key,
        moneyIn: parseFloat(item.moneyIn) || 0,
        moneyOut: parseFloat(item.moneyOut) || 0,
        netFlow: parseFloat(item.netFlow) || 0,
        transactionCount: parseInt(item.transactionCount) || 0,
      });
    });

    // Generate all periods in range
    const allPeriods = [];

    if (range === "monthly") {
      // Monthly view: Generate all days of the selected month
      let current = new Date(start);
      while (current <= end) {
        const dateKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        allPeriods.push({
          date: `${current.getDate()}`, // Show day number
          fullDate: dateKey, // Keep for matching with API
          moneyIn: apiMap.get(dateKey)?.moneyIn || 0,
          moneyOut: apiMap.get(dateKey)?.moneyOut || 0,
          netFlow: apiMap.get(dateKey)?.netFlow || 0,
          transactionCount: apiMap.get(dateKey)?.transactionCount || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === "yearly") {
      // Yearly view: Generate all 12 months
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      // Use Gregorian year from the date range (already converted from Jalali)
      const gregorianYear = new Date(startDate).getFullYear();

      for (let month = 0; month < 12; month++) {
        const monthKey = `${monthNames[month]} ${gregorianYear}`;
        const apiItem = apiMap.get(monthKey);
        const monthLabel = new Date(gregorianYear, month, 1).toLocaleDateString(
          localeTag,
          { month: "long" }
        );
        allPeriods.push({
          date: monthLabel,
          fullDate: monthKey,
          moneyIn: apiItem ? parseFloat(apiItem.moneyIn) : 0,
          moneyOut: apiItem ? parseFloat(apiItem.moneyOut) : 0,
          netFlow: apiItem ? parseFloat(apiItem.netFlow) : 0,
          transactionCount: apiItem ? parseInt(apiItem.transactionCount) : 0,
        });
      }
    }

    return allPeriods;
  }, [cashFlowData, selectedReport, accountsDateParams, accountsFilter, localeTag]);

  // System colors for charts
  const chartColors = {
    sales: "#10B981", // green-500
    purchases: "#F59E0B", // amber-500 (orange)
    expenses: "#EF4444", // red-500
    moneyIn: "#10B981", // green-500
    moneyOut: "#EF4444", // red-500
    paid: "#3B82F6", // blue-500
    due: "#EF4444", // red-500
  };

  // Note: getStatusColor was used for inventory report, but inventory is not yet implemented

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("reports.title")}</h1>
          <p className="text-gray-600 mt-1">{t("reports.subtitle")}</p>
        </div>
      </div>

      {/* Report type selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("reports.selectType")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report.id);
                  // Reset filters when switching reports
                  if (report.id !== "expenses") {
                    setSelectedExpenseCategory("");
                  }
                  if (report.id !== "inventory") {
                    setSelectedStockLocation("all");
                    setSelectedStockLevel("low");
                  }
                }}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedReport === report.id
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <Icon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{report.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary cards for Sales - Moved to top */}
      {selectedReport === "sales" && salesReportsData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.salesTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesReportsData.data.totals.totalSales || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.paidTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesReportsData.data.totals.totalPaid || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500">
                <ExclamationCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.dueTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesReportsData.data.totals.totalDue || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards for Purchases - Moved to top */}
      {selectedReport === "purchases" && purchaseReportsData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-500">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.purchasesTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    purchaseReportsData.data.totals.totalPurchases || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.paidTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    purchaseReportsData.data.totals.totalPaid || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.dueTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    purchaseReportsData.data.totals.totalDue || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards for Expenses - Moved to top */}
      {selectedReport === "expenses" && expenseSummaryData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500">
                <ReceiptPercentIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.expensesTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    expenseSummaryData.data.totals.totalExpenses || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-500">
                <HashtagIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.expenseCount")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(expenseSummaryData.data.totals.totalCount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards for Account Balances - Moved to top */}
      {selectedReport === "accounts" && accountBalancesData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.cashAccountsTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    accountBalancesData.data.summary.totalCashAccounts || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500">
                <ArrowDownIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.supplierDebtTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    accountBalancesData.data.summary.totalSupplierDebt || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500">
                <ArrowUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.customerCreditTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    accountBalancesData.data.summary.totalCustomerCredit || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div
                className={`p-3 rounded-full ${
                  (accountBalancesData.data.summary.netPosition || 0) >= 0
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              >
                <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.netPosition")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (accountBalancesData.data.summary.netPosition || 0) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    accountBalancesData.data.summary.netPosition || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards for Profit - Moved to top (above date selector, like sales) */}
      {selectedReport === "profit" && netProfitData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500">
                <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.grossProfit")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(netProfitData.data.grossProfit || 0)}{" "}
                  {t("reports.currencyAfn")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg  border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500">
                <PlusCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.otherIncome")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(netProfitData.data.otherIncome || 0)}{" "}
                  {t("reports.currencyAfn")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500">
                <MinusCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.expensesTotal")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(netProfitData.data.expenses || 0)}{" "}
                  {t("reports.currencyAfn")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div
                className={`p-3 rounded-full ${
                  (netProfitData.data.netProfit || 0) >= 0
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              >
                <ChartPieIcon className="h-6 w-6 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.summary.netProfit")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (netProfitData.data.netProfit || 0) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatNumber(netProfitData.data.netProfit || 0)}{" "}
                  {t("reports.currencyAfn")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date range selector */}
      {hasDateControls && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("reports.selectRangeDate")}
          </h3>
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex space-x-4">
                <button
                  onClick={() =>
                    updateReportFilter(selectedReport, (current) => ({
                      ...current,
                      range: "monthly",
                    }))
                  }
                  className={`px-4 py-2 rounded-lg border ${
                    activeRange === "monthly"
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t("reports.range.monthly")}
                </button>
                <button
                  onClick={() =>
                    updateReportFilter(selectedReport, (current) => ({
                      ...current,
                      range: "yearly",
                    }))
                  }
                  className={`px-4 py-2 rounded-lg border ${
                    activeRange === "yearly"
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t("reports.range.yearly")}
                </button>
              </div>

              {activeRange === "monthly" && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    {t("reports.filters.pickMonth")}
                  </label>
                  <JalaliDatePicker
                    value={
                      activeFilter?.month ? `${activeFilter.month}-01` : ""
                    }
                    onChange={(nextValue) => {
                      const iso = normalizeDateToIso(nextValue);
                      updateReportFilter(selectedReport, (current) => {
                        if (iso) {
                          const [year, month] = iso.split("-");
                          return {
                            ...current,
                            month: `${year}-${month}`,
                            range: "monthly",
                          };
                        }
                        const fallbackMonth = getCurrentMonthValue();
                        return {
                          ...current,
                          month: fallbackMonth,
                          range: "monthly",
                        };
                      });
                    }}
                    placeholder={t("reports.filters.pickDate")}
                    clearable
                  />
                </div>
              )}

              {activeRange === "yearly" && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    {t("reports.filters.pickYear")}
                  </label>
                  <div className="relative inline-block">
                    <input
                      type="text"
                      inputMode="numeric"
                      min="1390"
                      max={getCurrentJalaliYearNumber() + 1}
                      value={activeFilter?.year ? toPersianDigits(activeFilter.year) : ""}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Convert any Persian/Arabic digits to English for processing
                        const englishValue = toEnglishDigits(inputValue);
                        // Only allow numeric input (remove any non-digit characters)
                        const numericValue = englishValue.replace(/\D/g, '');
                        
                        updateReportFilter(selectedReport, (current) => {
                          if (numericValue && !Number.isNaN(parseInt(numericValue, 10))) {
                            const yearNum = parseInt(numericValue, 10);
                            const minYear = 1390;
                            const maxYear = getCurrentJalaliYearNumber() + 1;
                            // Validate year range
                            if (yearNum >= minYear && yearNum <= maxYear) {
                              return { ...current, year: numericValue, range: "yearly" };
                            }
                          }
                          // If invalid or empty, keep current year or set to default
                          return {
                            ...current,
                            year: current.year || getCurrentYearValue(),
                            range: "yearly",
                          };
                        });
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        const englishValue = toEnglishDigits(inputValue);
                        const numericValue = englishValue.replace(/\D/g, '');
                        
                        updateReportFilter(selectedReport, (current) => {
                          if (numericValue && !Number.isNaN(parseInt(numericValue, 10))) {
                            const yearNum = parseInt(numericValue, 10);
                            const minYear = 1390;
                            const maxYear = getCurrentJalaliYearNumber() + 1;
                            if (yearNum >= minYear && yearNum <= maxYear) {
                              return { ...current, year: numericValue, range: "yearly" };
                            }
                          }
                          // On blur, if invalid, reset to current year
                          return {
                            ...current,
                            year: getCurrentYearValue(),
                            range: "yearly",
                          };
                        });
                      }}
                      onKeyDown={(e) => {
                        // Handle arrow keys for increment/decrement
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const currentYear = parseInt(activeFilter?.year || getCurrentYearValue(), 10);
                          const maxYear = getCurrentJalaliYearNumber() + 1;
                          if (currentYear < maxYear) {
                            updateReportFilter(selectedReport, (current) => ({
                              ...current,
                              year: String(currentYear + 1),
                              range: "yearly",
                            }));
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const currentYear = parseInt(activeFilter?.year || getCurrentYearValue(), 10);
                          const minYear = 1390;
                          if (currentYear > minYear) {
                            updateReportFilter(selectedReport, (current) => ({
                              ...current,
                              year: String(currentYear - 1),
                              range: "yearly",
                            }));
                          }
                        }
                      }}
                      className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-32 text-right font-medium"
                      placeholder={toPersianDigits(getCurrentJalaliYearNumber().toString())}
                      required
                      dir="rtl"
                    />
                    <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const currentYear = parseInt(activeFilter?.year || getCurrentYearValue(), 10);
                          const maxYear = getCurrentJalaliYearNumber() + 1;
                          if (currentYear < maxYear) {
                            updateReportFilter(selectedReport, (current) => ({
                              ...current,
                              year: String(currentYear + 1),
                              range: "yearly",
                            }));
                          }
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded-t text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label={t("reports.filters.increaseYear")}
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentYear = parseInt(activeFilter?.year || getCurrentYearValue(), 10);
                          const minYear = 1390;
                          if (currentYear > minYear) {
                            updateReportFilter(selectedReport, (current) => ({
                              ...current,
                              year: String(currentYear - 1),
                              range: "yearly",
                            }));
                          }
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded-b text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label={t("reports.filters.decreaseYear")}
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category filter for expenses - Only show when expenses report is selected, placed on left */}
            {selectedReport === "expenses" && expenseCategoriesData?.data && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  {t("reports.filters.expenseCategory")}
                </label>
                <select
                  value={selectedExpenseCategory}
                  onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-[180px]"
                >
                  <option value="">{t("reports.filters.allCategories")}</option>
                  {expenseCategoriesData.data.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {reportTypes.find((r) => r.id === selectedReport)?.name}
            {hasDateControls && activeFilter && (
              <>
                {" - "}
                {activeFilter.range === "monthly"
                  ? (() => {
                      const monthValue =
                        activeFilter.month || getCurrentMonthValue();
                      const displayDate = new Date(`${monthValue}-01`);
                      return t("reports.periodTitle.monthly", {
                        type: t("reports.range.monthlyLabel"),
                        month: displayDate.toLocaleDateString(localeTag, {
                          year: "numeric",
                          month: "long",
                        }),
                      });
                    })()
                  : t("reports.periodTitle.yearly", {
                      type: t("reports.range.yearlyLabel"),
                      year: toPersianDigits(
                        activeFilter.year || getCurrentYearValue()
                      ),
                    })}
              </>
            )}
          </h3>
        </div>

        <div className="p-6">
          {selectedReport === "sales" && (
            <div className="space-y-6">
              {salesReportsLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingSales")}
                </div>
              ) : !salesReportsData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodSales")}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("reports.charts.salesTrend")}
                  </h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(parseFloat(value))} ${t("reports.currencyAfn")}`,
                          t("reports.charts.barSales"),
                        ]}
                        labelStyle={{ color: "#374151" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="sales"
                        fill={chartColors.sales}
                        name={t("reports.charts.barSales")}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {selectedReport === "purchases" && (
            <div className="space-y-6">
              {purchaseReportsLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingPurchases")}
                </div>
              ) : !purchaseReportsData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : purchaseChartData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodPurchases")}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("reports.charts.purchasesTrend")}
                  </h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={purchaseChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(parseFloat(value))} ${t("reports.currencyAfn")}`,
                          t("reports.charts.barPurchases"),
                        ]}
                        labelStyle={{ color: "#374151" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="purchases"
                        fill={chartColors.purchases}
                        name={t("reports.charts.barPurchases")}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {selectedReport === "expenses" && (
            <div className="space-y-6">
              {expenseSummaryLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingExpenses")}
                </div>
              ) : !expenseSummaryData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : expenseChartData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodExpenses")}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("reports.charts.expensesTrend")}
                  </h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={expenseChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value === undefined || value === null) return "٠";
                          const num =
                            typeof value === "number"
                              ? value
                              : parseFloat(String(value));
                          if (isNaN(num)) return "٠";
                          return formatNumber(num);
                        }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(parseFloat(value))} ${t("reports.currencyAfn")}`,
                          t("reports.charts.barExpenses"),
                        ]}
                        labelStyle={{ color: "#374151" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="expenses"
                        fill={chartColors.expenses}
                        name={t("reports.charts.barExpenses")}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {selectedReport === "accounts" && (
            <div className="space-y-6">
              {cashFlowLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingAccounts")}
                </div>
              ) : !cashFlowData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : cashFlowChartData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodAccounts")}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("reports.charts.cashFlowTrend")}
                  </h4>
                  {cashFlowData.data.totals && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          {t("reports.summary.moneyInTotal")}
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(
                            cashFlowData.data.totals.totalIn || 0
                          )}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          {t("reports.summary.moneyOutTotal")}
                        </p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(
                            cashFlowData.data.totals.totalOut || 0
                          )}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          {t("reports.summary.netFlowTotal")}
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            (cashFlowData.data.totals.netFlow || 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(
                            cashFlowData.data.totals.netFlow || 0
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={cashFlowChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value === undefined || value === null) return "٠";
                          const num =
                            typeof value === "number"
                              ? value
                              : parseFloat(String(value));
                          if (isNaN(num)) return "٠";
                          return formatNumber(num);
                        }}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          const num =
                            typeof value === "number"
                              ? value
                              : parseFloat(value);
                          return [
                            `${formatNumber(num)} ${t("reports.currencyAfn")}`,
                            name === "moneyIn"
                              ? t("reports.charts.barMoneyIn")
                              : name === "moneyOut"
                              ? t("reports.charts.barMoneyOut")
                              : t("reports.charts.barNetFlow"),
                          ];
                        }}
                        labelStyle={{ color: "#374151" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="moneyIn"
                        fill={chartColors.moneyIn}
                        name={t("reports.charts.barMoneyIn")}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="moneyOut"
                        fill={chartColors.moneyOut}
                        name={t("reports.charts.barMoneyOut")}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {selectedReport === "inventory" && (
            <div className="space-y-6">
              {/* Filter buttons */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("reports.filters.inventory.title")}
                </h3>

                {/* Location filter buttons */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("reports.filters.inventory.location")}
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedStockLocation("all")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLocation === "all"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.all")}
                    </button>
                    <button
                      onClick={() => setSelectedStockLocation("store")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLocation === "store"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.store")}
                    </button>
                    <button
                      onClick={() => setSelectedStockLocation("warehouse")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLocation === "warehouse"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.warehouse")}
                    </button>
                  </div>
                </div>

                {/* Stock level filter buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("reports.filters.inventory.stockLevel")}
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedStockLevel("all")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLevel === "all"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.all")}
                    </button>
                    <button
                      onClick={() => setSelectedStockLevel("low")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLevel === "low"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.low")}
                    </button>
                    <button
                      onClick={() => setSelectedStockLevel("critical")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLevel === "critical"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.critical")}
                    </button>
                    <button
                      onClick={() => setSelectedStockLevel("out")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStockLevel === "out"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("reports.filters.inventory.out")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stock items list */}
              {stockReportLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingInventory")}
                </div>
              ) : !stockReportData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : stockReportData.data.stocks.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodInventory")}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.product")}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.location")}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.quantity")}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.minLevel")}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.status")}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("reports.inventoryTable.value")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockReportData.data.stocks.map((stock) => (
                          <tr key={stock._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {stock.product?.name || "-"}
                              </div>
                              {stock.batchNumber &&
                                stock.batchNumber !== "DEFAULT" && (
                                  <div className="text-xs text-gray-500">
                                    {t("reports.inventoryTable.batch")}: {stock.batchNumber}
                                  </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  stock.location === "warehouse"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {stock.location === "warehouse"
                                  ? t("reports.filters.inventory.warehouse")
                                  : t("reports.filters.inventory.store")}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(stock.quantity)}{" "}
                              {stock.unit?.name || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(stock.minLevel || 0)}{" "}
                              {stock.unit?.name || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  stock.status === "out"
                                    ? "bg-red-100 text-red-800"
                                    : stock.status === "critical"
                                    ? "bg-orange-100 text-orange-800"
                                    : stock.status === "low"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {stock.status === "out"
                                  ? t("reports.inventoryTable.statusOut")
                                  : stock.status === "critical"
                                  ? t("reports.inventoryTable.statusCritical")
                                  : stock.status === "low"
                                  ? t("reports.inventoryTable.statusLow")
                                  : t("reports.inventoryTable.statusNormal")}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(stock.stockValue || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedReport === "profit" && (
            <div className="space-y-6">
              {profitSummaryLoading ||
              netProfitLoading ||
              profitStatsLoading ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.loadingProfit")}
                </div>
              ) : !profitSummaryData?.data ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noData")}
                </div>
              ) : profitChartData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("reports.states.noDataPeriodProfit")}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {profitChartType === "net"
                        ? t("reports.charts.profitTrendNet")
                        : t("reports.charts.profitTrendGross")}
                    </h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setProfitChartType("gross")}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          profitChartType === "gross"
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t("reports.charts.toggleGross")}
                      </button>
                      <button
                        onClick={() => setProfitChartType("net")}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          profitChartType === "net"
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t("reports.charts.toggleNet")}
                      </button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={profitChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value === undefined || value === null) return "٠";
                          const num =
                            typeof value === "number"
                              ? value
                              : parseFloat(String(value));
                          if (isNaN(num)) return "٠";
                          return formatNumber(num);
                        }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const num =
                            typeof value === "number"
                              ? value
                              : parseFloat(value);
                          return [
                            `${formatNumber(num)} ${t("reports.currencyAfn")}`,
                            profitChartType === "net"
                              ? t("reports.charts.barNetProfit")
                              : t("reports.charts.barGrossProfit"),
                          ];
                        }}
                        labelStyle={{ color: "#374151" }}
                      />
                      <Legend />
                      <Bar
                        dataKey={
                          profitChartType === "net"
                            ? "netProfit"
                            : "grossProfit"
                        }
                        name={
                          profitChartType === "net"
                            ? t("reports.charts.barNetProfit")
                            : t("reports.charts.barGrossProfit")
                        }
                        radius={[4, 4, 0, 0]}
                      >
                        {profitChartData.map((entry, index) => {
                          const value =
                            profitChartType === "net"
                              ? entry.netProfit
                              : entry.grossProfit;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={value >= 0 ? "#10B981" : "#EF4444"}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {![
            "sales",
            "inventory",
            "profit",
            "purchases",
            "expenses",
            "accounts",
          ].includes(selectedReport) && (
            <div className="text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("reports.states.comingSoonTitle", {
                  type: reportTypes.find((r) => r.id === selectedReport)?.name,
                })}
              </h3>
              <p className="text-gray-600">
                {t("reports.states.comingSoonDesc")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
