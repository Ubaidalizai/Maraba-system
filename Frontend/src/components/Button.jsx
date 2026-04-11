import React from "react";

function Button({ children, icon, className, ...props }) {
  return (
    <button
      {...props}
      className={`${
        className ? className : " bg-amber-600 text-white"
      } cursor-pointer group w-full   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`}
    >
      {icon && (
        <span className=" group-hover:rotate-45 transition-all duration-200">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

export default Button;
