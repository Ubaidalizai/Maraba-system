import React from "react";

function TableRow({ children, className = "", ...props }) {
  return (
    <tr className={className || "hover:bg-gray-50"} {...props}>
      {children}
    </tr>
  );
}

export default TableRow;
