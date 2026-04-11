import React from "react";

function TableColumn({ children, className, colSpan }) {
  return (
    <td
      className={`${
        className ? className : ""
      } px-6 py-4 text-sm text-gray-900`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export default TableColumn;
