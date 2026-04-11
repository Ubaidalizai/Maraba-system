import React, { useRef } from "react";

function PrintSimple() {
  const contentRef = useRef(null);

  return (
    <div>
      <div ref={contentRef} className=" bg-red-400 w-full h-screen">
        Content to print
      </div>
    </div>
  );
}

export default PrintSimple;
