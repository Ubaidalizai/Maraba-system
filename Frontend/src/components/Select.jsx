import { useEffect, useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import { useClickOutSide } from "../hooks/useClickOutSide";

function Select({
  label,
  error,
  id,
  options,
  register,
  name,
  defaultSelected,
  onChange,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(value || "");
  useEffect(() => {
    if (value) {
      setSelected(value);
    } else {
      setSelected("");
    }
  }, [value]);

  const ref = useClickOutSide(() => setIsOpen(false));
  const filteredOptions = options?.filter((opt) =>
    (opt.label || opt.value).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value) => {
    setSelected(value);
    setIsOpen(false);
    if (onChange) onChange(value);
  };

  const getSelectedLabel = () => {
    if (!selected) return defaultSelected || "انتخاب نکردید";
    const option = options?.find((opt) => opt.value === selected);
    return option ? option.label || option.value : selected;
  };

  return (
    <div className="relative w-full" ref={ref}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[12px] font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      {/* Select Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-transparent capitalize  placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm pr-3 pl-4 py-1 transition duration-300 ease focus:outline-none hover:border-slate-300 shadow-sm focus:shadow cursor-pointer flex justify-between items-center`}
      >
        <span className=" text-[15px] font-[400]">{getSelectedLabel()}</span>
        <RiArrowDownSLine
          className={` ${
            isOpen ? " rotate-180" : ""
          } transition-all duration-200`}
        />
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-10 w-full bg-white  border border-slate-200 rounded-sm p-2">
          {/* Search box */}
          <input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-2 px-3 py-1 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-300  "
          />

          {/* Scrollable options */}
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(option.value)}
                  className={`cursor-pointer px-3 py-2 slate-sm capitalize hover:bg-slate-100  ${
                    selected === option.value ? "bg-slate-100 " : ""
                  }`}
                >
                  {option.label || option.value}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">
                هیچ نتیجه‌ای یافت نشد
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form registration */}
      <input
        {...register}
        type="hidden"
        name={name}
        value={selected}
        readOnly
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export default Select;
