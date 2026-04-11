import React from "react";
import { BiSearch } from "react-icons/bi";

function SearchInput({ placeholder, value, onChange }) {
  return (
    <div className="relative my-1.5">
      <input
        className="w-full py-2 bg-transparent placeholder:text-slate-500 placeholder:text-[16px]  placeholder:font-[400]  dark:text-slate-600 text-sm border border-slate-200  rounded-sm pl-3 pr-28  transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300  "
        placeholder={placeholder}
        value={value || ""}
        onChange={onChange}
      />
      <button
        className="absolute top-2/4 -translate-y-2/4 h-[90%] right-1 flex items-center gap-1 rounded-sm  bg-dategold-400  px-2.5 border border-transparent text-center text-sm text-white transition-all shadow-sm hover:shadow focus:bg-text-700 focus:shadow-none active:bg-text-700 hover:bg-text-300  cursor-pointer  active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
        type="button"
      >
        <BiSearch className=" text-slate-100 dark:text-slate-200" />
        <span className=" text-slate-100 font-semibold"> جستجو</span>
      </button>
    </div>
  );
}

export default React.memo(SearchInput);
