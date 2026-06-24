import { reportTypeTints } from "./reportTheme";

const ReportTypeCard = ({ id, name, icon: Icon, active, onClick }) => {
  const tint = reportTypeTints[id] || reportTypeTints.sales;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-h-[120px] p-4 rounded-xl border transition-all duration-200 text-center ${
        active
          ? `border-amber-500 bg-amber-50/50 ring-1 ring-amber-200 text-amber-800`
          : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
      }`}
    >
      <div
        className={`${tint.bg} p-3 rounded-lg mb-3 ${active ? "scale-105" : ""} transition-transform`}
      >
        <Icon className={`h-7 w-7 ${tint.text}`} />
      </div>
      <p className="text-sm font-medium leading-snug">{name}</p>
    </button>
  );
};

export default ReportTypeCard;
