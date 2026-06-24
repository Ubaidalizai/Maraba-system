import { useMemo } from "react";
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
import { formatNumber } from "../../utilies/helper";
import { chartTokens, reportColors } from "./reportTheme";

const formatYAxis = (value) => {
  if (value === undefined || value === null) return "٠";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(num)) return "٠";
  return formatNumber(num);
};

const ChartTooltip = ({ active, payload, label, currencyLabel, formatValue }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm"
      style={{
        background: chartTokens.tooltipBg,
        borderColor: chartTokens.tooltipBorder,
        color: chartTokens.tooltipText,
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: chartTokens.tooltipMuted }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: entry.color || entry.fill }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold">
            {formatValue
              ? formatValue(entry.value, entry.name, entry.dataKey)
              : `${formatNumber(parseFloat(entry.value) || 0)} ${currencyLabel}`}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * @param {"single"|"cashFlow"|"profit"} mode
 */
const ReportBarChart = ({
  data,
  mode = "single",
  xKey = "date",
  dataKey,
  barName,
  barColor = reportColors.sales,
  gradientId = "reportBarGradient",
  currencyLabel = "",
  profitDataKey,
  profitBarName,
  getBarColor,
  formatTooltipValue,
}) => {
  const dataLength = data?.length ?? 0;
  const useAngledLabels = dataLength > 7;
  const xInterval = dataLength > 12 ? "preserveStartEnd" : 0;

  const bars = useMemo(() => {
    if (mode === "cashFlow") {
      return [
        {
          dataKey: "moneyIn",
          name: barName?.moneyIn,
          fill: reportColors.moneyIn,
          gradientId: "moneyInGradient",
        },
        {
          dataKey: "moneyOut",
          name: barName?.moneyOut,
          fill: reportColors.moneyOut,
          gradientId: "moneyOutGradient",
        },
      ];
    }
    if (mode === "profit") {
      return [
        {
          dataKey: profitDataKey,
          name: profitBarName,
          fill: reportColors.profit,
          gradientId: "profitGradient",
          useCells: true,
        },
      ];
    }
    return [
      {
        dataKey,
        name: barName,
        fill: barColor,
        gradientId,
        useCells: false,
      },
    ];
  }, [mode, dataKey, barName, barColor, gradientId, profitDataKey, profitBarName]);

  if (!dataLength) return null;

  return (
    <div className="h-[280px] sm:h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: useAngledLabels ? 8 : 0 }}
          barCategoryGap="20%"
        >
          <defs>
            {bars.map((bar) => (
              <linearGradient
                key={bar.gradientId}
                id={bar.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={bar.fill} stopOpacity={0.95} />
                <stop offset="100%" stopColor={bar.fill} stopOpacity={0.65} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            stroke={chartTokens.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: chartTokens.axis }}
            angle={useAngledLabels ? -45 : 0}
            textAnchor={useAngledLabels ? "end" : "middle"}
            height={useAngledLabels ? 72 : 36}
            interval={xInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: chartTokens.axis }}
            tickFormatter={formatYAxis}
            width={56}
          />
          <Tooltip
            content={
              <ChartTooltip
                currencyLabel={currencyLabel}
                formatValue={formatTooltipValue}
              />
            }
            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={`url(#${bar.gradientId})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            >
              {bar.useCells &&
                data.map((entry, index) => {
                  const value = entry[bar.dataKey];
                  const fill = getBarColor
                    ? getBarColor(value, entry)
                    : value >= 0
                      ? reportColors.profit
                      : reportColors.profitNegative;
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ReportBarChart;
