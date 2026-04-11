import React from "react";

function Input({ placeholder, label, error, id, register, required }) {
  return (
    <>
      <label
        htmlFor={id}
        className={`mb-[5px] font-custom block text-base font-medium text-slate-600 dark:text-white `}
      >
        {label}{" "}
        {required && (
          <span className="text-red-600">
            <sup>*</sup>
          </span>
        )}
      </label>
      <div className=" relative">
        <input
          id={id}
          required={required}
          {...register}
          type="text"
          className="w-full font-custom  dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md pr-3 pl-3 py-[14px] transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow"
          placeholder={placeholder}
        />
      </div>
      {error && <p className="mt-1.5 text-red-500 text-sm">{error}</p>}
    </>
  );
}

export default Input;
