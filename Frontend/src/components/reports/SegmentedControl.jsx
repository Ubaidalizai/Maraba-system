const SegmentedControl = ({ options, value, onChange, className = "" }) => {
  return (
    <div
      className={`inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-1 ${className}`}
      role="group"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-white text-amber-700 border border-amber-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
