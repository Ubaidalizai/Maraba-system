import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
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
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  ArchiveBoxXMarkIcon,
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
import { formatNumber, formatCurrency, normalizeDateToIso, toPersianDigits, toEnglishDigits, formatReportMonthPeriod, formatJalaliMonthFromDate } from "../utilies/helper";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import gregorianCalendar from "react-date-object/calendars/gregorian";
import JalaliDatePicker from "../components/JalaliDatePicker";
import ReportSummaryCard from "../components/reports/ReportSummaryCard";
import ReportTypeCard from "../components/reports/ReportTypeCard";
import ReportChartCard from "../components/reports/ReportChartCard";
import ReportBarChart from "../components/reports/ReportBarChart";
import { ReportLoadingState, ReportEmptyState } from "../components/reports/ReportState";
import SegmentedControl from "../components/reports/SegmentedControl";
import { reportColors } from "../components/reports/reportTheme";

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

  const { data: profitStatsData, isLoading: profitStatsLoading } =
    useProfitStats({
      startDate: profitDateParams.startDate,
      endDate: profitDateParams.endDate,
      productLimit: 20,
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
        const monthLabel = formatJalaliMonthFromDate(new Date(gregorianYear, month, 1));
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
        const monthLabel = formatJalaliMonthFromDate(
          new Date(gregorianYear, month - 1, 1)
        );
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

  // Product profit list (from /profit/stats, highest profit first)
  const productProfitList = useMemo(() => {
    if (selectedReport !== "profit" || !profitStatsData?.data) return [];

    const items =
      profitStatsData.data.grossProfitDetails?.byProduct || [];

    return [...items]
      .sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
      .map((row, index) => ({
        rank: index + 1,
        productId: row._id,
        name: row.productName || "—",
        profit: parseFloat(row.totalProfit) || 0,
        revenue: parseFloat(row.totalRevenue) || 0,
        itemCount: row.itemCount || 0,
      }));
  }, [profitStatsData, selectedReport]);

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
        const monthLabel = formatJalaliMonthFromDate(new Date(gregorianYear, month, 1));
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
        const monthLabel = formatJalaliMonthFromDate(new Date(gregorianYear, month, 1));
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
        const monthLabel = formatJalaliMonthFromDate(new Date(gregorianYear, month, 1));
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

  const periodBadgeLabel = useMemo(() => {
    if (!activeFilter) return null;
    if (activeRange === "monthly") {
      const monthValue = activeFilter.month || getCurrentMonthValue();
      return t("reports.periodTitle.monthly", {
        month: formatReportMonthPeriod(monthValue),
      });
    }
    return t("reports.periodTitle.yearly", {
      year: toPersianDigits(activeFilter.year || getCurrentYearValue()),
    });
  }, [activeFilter, activeRange, t]);

  const handleReportTypeChange = (reportId) => {
    setSelectedReport(reportId);
    if (reportId !== "expenses") {
      setSelectedExpenseCategory("");
    }
    if (reportId !== "inventory") {
      setSelectedStockLocation("all");
      setSelectedStockLevel("low");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("reports.title")}</h1>
          <p className="text-gray-600 mt-1">{t("reports.subtitle")}</p>
        </div>
        {periodBadgeLabel && (
          <span className="inline-flex items-center self-start px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            {periodBadgeLabel}
          </span>
        )}
      </div>

      {/* Report type selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("reports.selectType")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {reportTypes.map((report) => (
            <ReportTypeCard
              key={report.id}
              id={report.id}
              name={report.name}
              icon={report.icon}
              active={selectedReport === report.id}
              onClick={() => handleReportTypeChange(report.id)}
            />
          ))}
        </div>
      </div>

      {/* Summary cards for Sales */}
      {selectedReport === "sales" && salesReportsData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ReportSummaryCard
            label={t("reports.summary.salesTotal")}
            value={formatCurrency(salesReportsData.data.totals.totalSales || 0)}
            icon={CurrencyDollarIcon}
            tint="green"
          />
          <ReportSummaryCard
            label={t("reports.summary.paidTotal")}
            value={formatCurrency(salesReportsData.data.totals.totalPaid || 0)}
            icon={CheckCircleIcon}
            tint="blue"
          />
          <ReportSummaryCard
            label={t("reports.summary.dueTotal")}
            value={formatCurrency(salesReportsData.data.totals.totalDue || 0)}
            icon={ExclamationCircleIcon}
            tint="red"
          />
        </div>
      )}

      {/* Summary cards for Purchases */}
      {selectedReport === "purchases" && purchaseReportsData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ReportSummaryCard
            label={t("reports.summary.purchasesTotal")}
            value={formatCurrency(
              purchaseReportsData.data.totals.totalPurchases || 0
            )}
            icon={TruckIcon}
            tint="amber"
          />
          <ReportSummaryCard
            label={t("reports.summary.paidTotal")}
            value={formatCurrency(
              purchaseReportsData.data.totals.totalPaid || 0
            )}
            icon={CheckCircleIcon}
            tint="blue"
          />
          <ReportSummaryCard
            label={t("reports.summary.dueTotal")}
            value={formatCurrency(
              purchaseReportsData.data.totals.totalDue || 0
            )}
            icon={ClockIcon}
            tint="red"
          />
        </div>
      )}

      {/* Summary cards for Expenses */}
      {selectedReport === "expenses" && expenseSummaryData?.data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <ReportSummaryCard
            label={t("reports.summary.expensesTotal")}
            value={formatCurrency(
              expenseSummaryData.data.totals.totalExpenses || 0
            )}
            icon={ReceiptPercentIcon}
            tint="red"
          />
          <ReportSummaryCard
            label={t("reports.summary.expenseCount")}
            value={formatNumber(expenseSummaryData.data.totals.totalCount || 0)}
            icon={HashtagIcon}
            tint="gray"
          />
        </div>
      )}

      {/* Summary cards for Account Balances */}
      {selectedReport === "accounts" && accountBalancesData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <ReportSummaryCard
            label={t("reports.summary.cashAccountsTotal")}
            value={formatCurrency(
              accountBalancesData.data.summary.totalCashAccounts || 0
            )}
            icon={WalletIcon}
            tint="green"
          />
          <ReportSummaryCard
            label={t("reports.summary.supplierDebtTotal")}
            value={formatCurrency(
              accountBalancesData.data.summary.totalSupplierDebt || 0
            )}
            icon={ArrowDownIcon}
            tint="red"
          />
          <ReportSummaryCard
            label={t("reports.summary.customerCreditTotal")}
            value={formatCurrency(
              accountBalancesData.data.summary.totalCustomerCredit || 0
            )}
            icon={ArrowUpIcon}
            tint="blue"
          />
          <ReportSummaryCard
            label={t("reports.summary.netPosition")}
            value={formatCurrency(
              accountBalancesData.data.summary.netPosition || 0
            )}
            icon={ArrowTrendingUpIcon}
            tint={
              (accountBalancesData.data.summary.netPosition || 0) >= 0
                ? "emerald"
                : "red"
            }
            valueClassName={
              (accountBalancesData.data.summary.netPosition || 0) >= 0
                ? "text-emerald-600"
                : "text-red-600"
            }
          />
        </div>
      )}

      {/* Summary cards for Profit */}
      {selectedReport === "profit" && netProfitData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          <ReportSummaryCard
            label={t("reports.summary.grossProfit")}
            value={`${formatNumber(netProfitData.data.grossProfit || 0)} ${t("reports.currencyAfn")}`}
            icon={ArrowTrendingUpIcon}
            tint="blue"
          />
          <ReportSummaryCard
            label={t("reports.summary.otherIncome")}
            value={`${formatNumber(netProfitData.data.otherIncome || 0)} ${t("reports.currencyAfn")}`}
            icon={PlusCircleIcon}
            tint="green"
          />
          <ReportSummaryCard
            label={t("reports.summary.expensesTotal")}
            value={`${formatNumber(netProfitData.data.expenses || 0)} ${t("reports.currencyAfn")}`}
            icon={MinusCircleIcon}
            tint="red"
          />
          <ReportSummaryCard
            label={t("reports.summary.stockDamageLoss")}
            value={`${formatNumber(netProfitData.data.stockDamageLoss || 0)} ${t("reports.currencyAfn")}`}
            icon={ArchiveBoxXMarkIcon}
            tint="orange"
            valueClassName="text-orange-600"
          />
          <ReportSummaryCard
            label={t("reports.summary.netProfit")}
            value={`${formatNumber(netProfitData.data.netProfit || 0)} ${t("reports.currencyAfn")}`}
            icon={ChartPieIcon}
            tint={
              (netProfitData.data.netProfit || 0) >= 0 ? "emerald" : "red"
            }
            valueClassName={
              (netProfitData.data.netProfit || 0) >= 0
                ? "text-emerald-600"
                : "text-red-600"
            }
          />
        </div>
      )}

      {/* Date range selector */}
      {hasDateControls && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("reports.selectRangeDate")}
          </h3>
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <SegmentedControl
                value={activeRange}
                onChange={(range) =>
                  updateReportFilter(selectedReport, (current) => ({
                    ...current,
                    range,
                  }))
                }
                options={[
                  { value: "monthly", label: t("reports.range.monthly") },
                  { value: "yearly", label: t("reports.range.yearly") },
                ]}
              />

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">
            {reportTypes.find((r) => r.id === selectedReport)?.name}
            {hasDateControls && activeFilter && (
              <>
                {" - "}
                {activeFilter.range === "monthly"
                  ? t("reports.periodTitle.monthly", {
                      month: formatReportMonthPeriod(
                        activeFilter.month || getCurrentMonthValue()
                      ),
                    })
                  : t("reports.periodTitle.yearly", {
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
                <ReportLoadingState />
              ) : !salesReportsData?.data ? (
                <ReportEmptyState message={t("reports.states.noData")} />
              ) : chartData.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodSales")} />
              ) : (
                <ReportChartCard title={t("reports.charts.salesTrend")}>
                  <ReportBarChart
                    data={chartData}
                    mode="single"
                    xKey="date"
                    dataKey="sales"
                    barName={t("reports.charts.barSales")}
                    barColor={reportColors.sales}
                    gradientId="salesGradient"
                    currencyLabel={t("reports.currencyAfn")}
                  />
                </ReportChartCard>
              )}
            </div>
          )}

          {selectedReport === "purchases" && (
            <div className="space-y-6">
              {purchaseReportsLoading ? (
                <ReportLoadingState />
              ) : !purchaseReportsData?.data ? (
                <ReportEmptyState message={t("reports.states.noData")} />
              ) : purchaseChartData.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodPurchases")} />
              ) : (
                <ReportChartCard title={t("reports.charts.purchasesTrend")}>
                  <ReportBarChart
                    data={purchaseChartData}
                    mode="single"
                    xKey="date"
                    dataKey="purchases"
                    barName={t("reports.charts.barPurchases")}
                    barColor={reportColors.purchases}
                    gradientId="purchasesGradient"
                    currencyLabel={t("reports.currencyAfn")}
                  />
                </ReportChartCard>
              )}
            </div>
          )}

          {selectedReport === "expenses" && (
            <div className="space-y-6">
              {expenseSummaryLoading ? (
                <ReportLoadingState />
              ) : !expenseSummaryData?.data ? (
                <ReportEmptyState message={t("reports.states.noData")} />
              ) : expenseChartData.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodExpenses")} />
              ) : (
                <ReportChartCard title={t("reports.charts.expensesTrend")}>
                  <ReportBarChart
                    data={expenseChartData}
                    mode="single"
                    xKey="date"
                    dataKey="expenses"
                    barName={t("reports.charts.barExpenses")}
                    barColor={reportColors.expenses}
                    gradientId="expensesGradient"
                    currencyLabel={t("reports.currencyAfn")}
                  />
                </ReportChartCard>
              )}
            </div>
          )}

          {selectedReport === "accounts" && (
            <div className="space-y-6">
              {cashFlowLoading ? (
                <ReportLoadingState />
              ) : !cashFlowData?.data ? (
                <ReportEmptyState message={t("reports.states.noData")} />
              ) : cashFlowChartData.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodAccounts")} />
              ) : (
                <ReportChartCard title={t("reports.charts.cashFlowTrend")}>
                  {cashFlowData.data.totals && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <ReportSummaryCard
                        label={t("reports.summary.moneyInTotal")}
                        value={formatCurrency(
                          cashFlowData.data.totals.totalIn || 0
                        )}
                        tint="green"
                        valueClassName="text-green-600"
                      />
                      <ReportSummaryCard
                        label={t("reports.summary.moneyOutTotal")}
                        value={formatCurrency(
                          cashFlowData.data.totals.totalOut || 0
                        )}
                        tint="red"
                        valueClassName="text-red-600"
                      />
                      <ReportSummaryCard
                        label={t("reports.summary.netFlowTotal")}
                        value={formatCurrency(
                          cashFlowData.data.totals.netFlow || 0
                        )}
                        tint={
                          (cashFlowData.data.totals.netFlow || 0) >= 0
                            ? "emerald"
                            : "red"
                        }
                        valueClassName={
                          (cashFlowData.data.totals.netFlow || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                    </div>
                  )}
                  <ReportBarChart
                    data={cashFlowChartData}
                    mode="cashFlow"
                    xKey="date"
                    barName={{
                      moneyIn: t("reports.charts.barMoneyIn"),
                      moneyOut: t("reports.charts.barMoneyOut"),
                    }}
                    currencyLabel={t("reports.currencyAfn")}
                  />
                </ReportChartCard>
              )}
            </div>
          )}

          {selectedReport === "inventory" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("reports.filters.inventory.title")}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("reports.filters.inventory.location")}
                  </label>
                  <SegmentedControl
                    value={selectedStockLocation}
                    onChange={setSelectedStockLocation}
                    options={[
                      { value: "all", label: t("reports.filters.inventory.all") },
                      { value: "store", label: t("reports.filters.inventory.store") },
                      {
                        value: "warehouse",
                        label: t("reports.filters.inventory.warehouse"),
                      },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("reports.filters.inventory.stockLevel")}
                  </label>
                  <SegmentedControl
                    value={selectedStockLevel}
                    onChange={setSelectedStockLevel}
                    options={[
                      { value: "all", label: t("reports.filters.inventory.all") },
                      { value: "low", label: t("reports.filters.inventory.low") },
                      {
                        value: "critical",
                        label: t("reports.filters.inventory.critical"),
                      },
                      { value: "out", label: t("reports.filters.inventory.out") },
                    ]}
                  />
                </div>
              </div>

              {stockReportLoading ? (
                <ReportLoadingState />
              ) : !stockReportData?.data ? (
                <ReportEmptyState message={t("reports.states.noData")} />
              ) : stockReportData.data.stocks.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodInventory")} />
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
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
                      <tbody className="bg-white divide-y divide-gray-100">
                        {stockReportData.data.stocks.map((stock, idx) => (
                          <tr
                            key={stock._id}
                            className={`hover:bg-amber-50/40 transition-colors ${
                              idx % 2 === 1 ? "bg-gray-50/50" : ""
                            }`}
                          >
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
                <ReportLoadingState />
              ) : profitChartData.length === 0 &&
                productProfitList.length === 0 ? (
                <ReportEmptyState message={t("reports.states.noDataPeriodProfit")} />
              ) : (
                <>
                  {profitChartData.length > 0 && (
                    <ReportChartCard
                      title={
                        profitChartType === "net"
                          ? t("reports.charts.profitTrendNet")
                          : t("reports.charts.profitTrendGross")
                      }
                      actions={
                        <SegmentedControl
                          value={profitChartType}
                          onChange={setProfitChartType}
                          options={[
                            {
                              value: "gross",
                              label: t("reports.charts.toggleGross"),
                            },
                            {
                              value: "net",
                              label: t("reports.charts.toggleNet"),
                            },
                          ]}
                        />
                      }
                    >
                      <ReportBarChart
                        data={profitChartData}
                        mode="profit"
                        xKey="period"
                        profitDataKey={
                          profitChartType === "net" ? "netProfit" : "grossProfit"
                        }
                        profitBarName={
                          profitChartType === "net"
                            ? t("reports.charts.barNetProfit")
                            : t("reports.charts.barGrossProfit")
                        }
                        currencyLabel={t("reports.currencyAfn")}
                        getBarColor={(value) =>
                          value >= 0
                            ? reportColors.profit
                            : reportColors.profitNegative
                        }
                      />
                    </ReportChartCard>
                  )}

                  {productProfitList.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {t("reports.charts.productProfit")}
                        </h4>
                      </div>
                      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                {t("reports.productProfitTable.rank")}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("reports.productProfitTable.product")}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("reports.productProfitTable.revenue")}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("reports.productProfitTable.profit")}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("reports.productProfitTable.lineCount")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {productProfitList.map((row, idx) => (
                              <tr
                                key={row.productId || row.rank}
                                className={`hover:bg-amber-50/40 transition-colors ${
                                  idx % 2 === 1 ? "bg-gray-50/50" : ""
                                }`}
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {formatNumber(row.rank)}
                                </td>
                                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                                  {row.name}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {formatCurrency(row.revenue)}
                                </td>
                                <td
                                  className={`px-6 py-3 whitespace-nowrap text-sm font-semibold ${
                                    row.profit >= 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(row.profit)}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {formatNumber(row.itemCount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
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
            <ReportEmptyState
              message={t("reports.states.comingSoonDesc")}
              icon={ChartBarIcon}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
