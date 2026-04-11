import React from "react";

function NumberInput({ id, register, placeholder, label }) {
  return (
    <>
      <label
        htmlFor={id}
        className={`mb-[5px] font-custom block text-base font-medium text-text-600 dark:text-white`}
      >
        {label}
      </label>
      <input
        {...register}
        type="number"
        id={id}
        className="w-full font-custom   bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md pr-3 pl-3 py-[14px] transition duration-300 ease focus:outline-none focus:border-text-300 hover:border-slate-300 shadow-sm focus:shadow"
        placeholder={placeholder}
      />
    </>
  );
}

export default NumberInput;
