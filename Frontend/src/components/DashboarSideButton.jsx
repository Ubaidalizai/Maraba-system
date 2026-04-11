import { cloneElement, Fragment } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BiChevronRight } from "react-icons/bi";

const btnAnimation = {
  hidden: { opacity: 0, y: -10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const containerAnimation = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.18,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};

function DashboardSideButton({
  icon,
  title,
  to,
  sidebarOpen,
  otherOptions,
  setOpen,
  isOpen,
  isHover,
}) {
  const location = useLocation();
  const isActive = location.pathname === to;
  const Navigate = useNavigate();
  const handleClick = () => {
    if (otherOptions) setOpen((prev) => (prev === title ? null : title));
  };

  return otherOptions ? (
    <Fragment>
      <button
        onClick={handleClick}
        className="text-sm text-[var(--amber-light)] font-medium px-4 py-2 text-right hover:bg-primary-brown-light hover:text-white transition-all duration-200 peer group relative text- cursor-pointer w-full mx-auto rounded-sm flex items-center gap-x-2"
      >
        <span>
          {cloneElement(icon, { className: "w-[20px] hover:text-white" })}
        </span>
        <span
          className={` md:text-[14px] text-[12px] group-hover:block  ${
            sidebarOpen || isHover ? "block" : "hidden"
          }`}
        >
          {title}
        </span>
        {otherOptions && (
          <span className="hidden group-hover:block absolute left-2 top-2/4 -translate-y-2/4">
            <BiChevronRight
              className={`text-xl text-slate-100 ${
                isOpen ? "rotate-90" : ""
              } transition-all duration-300`}
            />
          </span>
        )}
      </button>

      <AnimatePresence>
        {otherOptions && isOpen && (
          <div className="w-full pl-3 flex justify-end bg-transparent">
            <motion.div
              layout
              variants={containerAnimation}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex relative w-[90%] flex-col gap-y-1"
            >
              {otherOptions.map((el, index) => (
                <NavLink
                  key={index}
                  to={el.href}
                  className={`peer group cursor-pointer lg:w-[90%] w-full mx-auto rounded-sm flex items-center gap-x-1 p-2 font-poppins text-[10px] hover:bg-accent-900 dark:hover:bg-primary-700 hover:bg-primary-brown-light hover:text-white transition-all duration-200 ${
                    el.href === location.pathname
                      ? "bg-primary-brown-light text-white"
                      : "bg-transparent text-[var(--amber-light)] border-transparent"
                  }`}
                >
                  <motion.span
                    variants={btnAnimation}
                    className="flex gap-x-2 "
                  >
                    <motion.span className="flex justify-center ">
                      {cloneElement(el.icon, {
                        className: `w-[16px] h-[16px]  text-[var(--amber-light)] hover:text-white ${
                          el.href === location.pathname
                            ? "bg-primary-brown-light text-white"
                            : "bg-transparent text-[var(--amber-light)] border-transparent"
                        }  `,
                      })}
                    </motion.span>
                    <span
                      className={`text- text-[12px] font-[600] text-[var(--amber-light)] hover:text-white ${
                        isOpen && (isHover || sidebarOpen) ? "block" : "hidden"
                      } ${
                        el.href === location.pathname
                          ? "bg-primary-brown-light text-white"
                          : "bg-transparent text-[var(--amber-light)] border-transparent"
                      }`}
                    >
                      {el.name}
                    </span>
                  </motion.span>
                </NavLink>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Fragment>
  ) : (
    <button
      onClick={() => {
        Navigate(to);
        if (setOpen) setOpen(null);
      }}
      className={`text-sm font-medium px-4 py-2 text-right hover:bg-primary-brown-light hover:border-[var(--amber)]  transition-all duration-200 peer group relative hover:text-white cursor-pointer w-full mx-auto rounded-sm flex items-center gap-x-2 ${
        isActive
          ? "bg-primary-brown-light text-white"
          : "bg-transparent text-[var(--amber-light)] border-transparent"
      }`}
    >
      <span>{cloneElement(icon, { className: "w-[20px]" })}</span>
      <span
        className={`${
          isHover || sidebarOpen ? "block" : "hidden"
        } md:text-[14px] text-[12px] group-hover:block`}
      >
        {title}
      </span>
    </button>
  );
}

export default DashboardSideButton;
