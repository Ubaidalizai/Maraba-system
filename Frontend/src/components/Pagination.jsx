import React, { useMemo, useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const Pagination = ({
  page,
  limit,
  total,
  totalPages: providedTotalPages,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const totalPages = useMemo(
    () => providedTotalPages || Math.ceil(total / limit),
    [total, limit, providedTotalPages]
  );

  const [pageInput, setPageInput] = useState(page);

  useEffect(() => {
    setPageInput(page);
  }, [page]);

  const handleRowsPerPageChange = (e) => {
    const newLimit = parseInt(e.target.value);
    onRowsPerPageChange(newLimit);
    onPageChange(1); // Reset to page 1
  };

  const handlePageClick = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handleKeyDown = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === "Enter") {
      const newPage = parseInt(pageInput);
      if (newPage >= 1 && newPage <= totalPages) {
        onPageChange(newPage);
      } else {
        setPageInput(page); // Reset to current page if invalid
      }
    }
  };

  return (
    <div className="flex  w-fit mx-auto flex-col sm:flex-row items-center justify-between gap-4   py-1 bg-white ">
      {/* Rows per page dropdown */}
      <div className="flex items-center gap-3">
        <select
          id="rows-per-page"
          value={limit}
          onChange={handleRowsPerPageChange}
          className={
            "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm pr-10`"
          }
          aria-label="انتخاب تعداد ردیف در صفحه"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => handlePageClick(page - 1)}
          onKeyDown={(e) => handleKeyDown(e, () => handlePageClick(page - 1))}
          disabled={page === 1}
          className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm  border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm  flex items-center gap-2
           ${
             page === 1
               ? "bg-gray-100 text-gray-400 cursor-not-allowed"
               : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none"
           }`}
          aria-label="صفحه قبلی"
        >
          <ChevronRightIcon className="h-4 w-4" />
          قبلی
        </button>

        {/* Current page display */}
        <div className="px-3 flex gap-x-1 py-2 text-sm text-gray-700 bg-gray-100 rounded">
          صفحه
          <input
            type="number"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputKeyDown}
            className="w-12 text-center bg-transparent border-none outline-none"
            min={1}
            max={totalPages}
          />
          از <span>{totalPages}</span>
        </div>

        {/* Next button */}
        <button
          onClick={() => handlePageClick(page + 1)}
          onKeyDown={(e) => handleKeyDown(e, () => handlePageClick(page + 1))}
          disabled={page === totalPages}
          className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm  flex items-center gap-2  ${
            page === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none "
          }`}
          aria-label="صفحه بعدی"
        >
          بعدی
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(Pagination);
