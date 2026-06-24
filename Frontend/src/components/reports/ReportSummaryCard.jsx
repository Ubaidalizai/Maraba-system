import { summaryTints } from "./reportTheme";

const ReportSummaryCard = ({
  label,
  value,
  icon: Icon,
  tint = "blue",
  valueClassName = "text-gray-900",
}) => {
  const colors = summaryTints[tint] || summaryTints.blue;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-bold mt-1 truncate ${valueClassName}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`${colors.bg} p-3 rounded-lg shrink-0`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSummaryCard;
