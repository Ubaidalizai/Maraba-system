import React from "react";

function TableHeader({ headerData }) {
  return (
    <thead className="bg-gray-50">
      <tr>
        {headerData.map((header, index) => (
          <th
            key={index}
            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
          >
            {header.title}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export default TableHeader;
