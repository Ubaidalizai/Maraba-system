const ReportChartCard = ({ title, actions, children, className = "" }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          {title && (
            <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default ReportChartCard;
