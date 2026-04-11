import { FaChevronDown } from "react-icons/fa6";
import { useClickOutSide } from "../hooks/useClickOutSide";

export default function FilterOption({
  options,
  name,
  selected,
  onChange,
  open,
  setOpen,
}) {
  const ref = useClickOutSide(() => setOpen(false));
  return (
    <div className="w-full mx-1 z-[5]">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex z-[5] cursor-pointer items-center dark:text-slate-200 justify-between w-full px-1.5 md:px-2  lg:px-4 py-2 bg-transparent border  border-slate-300 dark:border-slate-700 rounded-sm text-sm truncate text-slate-500 font-medium hover:border-slate-400 transition dark:bg-primary-dark-600/80"
        >
          {selected}
          <FaChevronDown
            className={`ml-2 transform transition-transform ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
        {/* Options */}
        {open && (
          <div className="absolute mt-2 w-full  border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-primary-dark-600">
            {options.map((option, index) => (
              <label
                key={index}
                className="flex items-center lg:px-4 py-2 px-1 md:px-2 cursor-pointer hover:bg-primary-500 dark:hover:bg-primary-dark-400 dark:text-accent-300 dark:bg-primary-dark-600 hover:text-white rounded-md transition"
              >
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={selected === option}
                  onChange={() => onChange(option)}
                  className="hidden"
                />
                {option}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
