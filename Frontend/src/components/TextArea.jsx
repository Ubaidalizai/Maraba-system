import { BiMessageAlt } from "react-icons/bi";
import { SiAppwrite } from "react-icons/si";
import { SiWritedotas } from "react-icons/si";

function TextArea({ label, register, rows = "6", required = false }) {
  return (
    <>
      <label
        className={`mb-[5px] block text-base font-medium text-slate-700 dark:text-white `}
      >
        {label}
        {required && (
          <span className="text-red-600">
            <sup>*</sup>
          </span>
        )}
      </label>
      <div className="relative">
        <textarea
          {...register}
          required={required}
          type="email"
          rows={rows}
          placeholder="Type your message"
          className="w-full  bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm pr-3 pl-12 py-[14px] transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow"
        />

        <span className="absolute top-[18px] left-4">
          <BiMessageAlt size={20} />
        </span>
      </div>
    </>
  );
}

export default TextArea;
