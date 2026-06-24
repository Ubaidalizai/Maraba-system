import { ChartBarIcon } from "@heroicons/react/24/outline";

export const ReportLoadingState = () => (
  <div className="py-12 space-y-4" aria-busy="true" aria-label="Loading">
    <div className="flex justify-center gap-2">
      {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
        <div
          key={i}
          className="w-8 sm:w-10 bg-gray-200 rounded-t-md animate-pulse"
          style={{ height: `${h + 40}px` }}
        />
      ))}
    </div>
    <div className="h-3 bg-gray-100 rounded-full max-w-xs mx-auto animate-pulse" />
  </div>
);

export const ReportEmptyState = ({ message, icon: Icon = ChartBarIcon }) => (
  <div className="text-center py-12 px-4">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
      <Icon className="h-7 w-7 text-gray-400" />
    </div>
    <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto">{message}</p>
  </div>
);
