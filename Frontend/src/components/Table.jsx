import React from "react";

function Table({ children, firstRow, className }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Optional header / action row */}
      {firstRow && (
        <div className="w-full relative text-left rtl:text-right dark:text-slate-600 mb-2">
          {firstRow}
        </div>
      )}

      {/* Scroll container (main behavior) */}
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export default Table;
