import { AiOutlineLoading3Quarters } from "react-icons/ai";
import React from "react";

function Spinner() {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <AiOutlineLoading3Quarters className=" text-2xl animate-spin" />
    </div>
  );
}

export default Spinner;
