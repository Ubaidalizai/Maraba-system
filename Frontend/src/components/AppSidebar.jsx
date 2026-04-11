import { BiMoneyWithdraw } from "react-icons/bi";
import { AiOutlineHome } from "react-icons/ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  BanknotesIcon,
  CubeIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { ChartBarIcon, ShieldCheckIcon, ShoppingCartIcon } from "lucide-react";
import { GiProfit } from "react-icons/gi";
import {
  MdAccountBalanceWallet,
  MdOutlineAccountBalance,
} from "react-icons/md";
import { RiLogoutBoxLine } from "react-icons/ri";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { BACKEND_BASE_URL } from "../services/apiConfig";
import { useClickOutSide } from "../hooks/useClickOutSide";

const navItem = [
  { name: "داشبورد", path: "/", icon: <AiOutlineHome /> },
  {
    name: "موجودی",
    path: "/inventory",
    icon: <CubeIcon className=" text-[20px]" />,
  },
  {
    name: "خریدها",
    path: "/purchases",
    icon: <ShoppingCartIcon className=" text-[20px]" />,
  },
  {
    name: "فروش‌ها",
    path: "/sales",
    icon: <CurrencyDollarIcon className=" text-[20px]" />,
  },
  // Finance group items will be rendered together below
  {
    name: "مالی",
    icon: <MdAccountBalanceWallet className=" text-sm" />,
    subItems: [
      {
        name: "هزینه‌ها",
        path: "/expenses",
        icon: <BiMoneyWithdraw className=" text-sm" />,
      },
      {
        name: "حساب ها",
        path: "/accounts",
        icon: <MdOutlineAccountBalance className=" text-sm" />,
      },
      {
        name: "درآمد ",
        path: "/income",
        icon: (
          <svg
            className="w-[14px]"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6v12a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2z" />
            <path d="M10 16h6" />
            <path d="M13 11m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M4 8h3" />
            <path d="M4 12h3" />
            <path d="M4 16h3" />
          </svg>
        ),
      },
    ],
  },
  {
    name: "گزارش‌ها",
    path: "/reports",
    icon: <ChartBarIcon className=" text-[20px]" />,
  },
  {
    name: "پنل مدیریت",
    path: "/admin",
    icon: <ShieldCheckIcon className=" text-[20px]" />,
  },
];

function AppSidebar() {
  const { isMobileOpen, isExpanded, isHoverd, setIsHoverd } = useSidebar();
  const [openSubmenu, setOpenSubmenu] = useState({ type: "", index: 0 });
  const [subMenuHeight, setSubMenuHeight] = useState({});
  const subMenuRefs = useRef({});
  const { logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const ref = useClickOutSide(() => setShowUserMenu(false));
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("خروج موفقیت‌آمیز بود");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(error.message || "خطا در خروج از سیستم");
    }
  };
  const location = useLocation();
  const isActive = useCallback(
    (path) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let subMenuMatched = false;
    ["main", "other"].forEach((menuType) => {
      const items = menuType === "main" ? navItem : [];

      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType,
                index,
              });
              subMenuMatched = true;
            }
          });
        }
      });
    });
    if (!subMenuMatched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key].scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubMenuToggle = (index, menuType) => {
    setOpenSubmenu((prevOpenSubMenu) => {
      if (
        prevOpenSubMenu &&
        prevOpenSubMenu.type === menuType &&
        prevOpenSubMenu.index === index
      )
        return null;
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items, menuType) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubMenuToggle(index, menuType)}
              className={`menu-item group relative  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHoverd ? "justify-start" : "justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size transition-all duration-300  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHoverd) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHoverd) && (
                <HiChevronDown
                  className={`ml-auto absolute left-0  w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "menu-item-arrow-active"
                      : "menu-item-arrow-inactive"
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <NavLink
                to={nav.path}
                className={`menu-item group  ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                } ${
                  !isExpanded && !isHoverd ? "justify-start" : "justify-start"
                }`}
              >
                <span
                  className={`menu-item-icon-size transition-all duration-300  ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHoverd || isMobileOpen) && (
                  <span className="menu-item-text  ">{nav.name}</span>
                )}
              </NavLink>
            )
          )}
          {nav.subItems && (isExpanded || isHoverd || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <NavLink
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      <span>{subItem.icon}</span>
                      <span> {subItem.name}</span>
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <aside
      className={`  absolute top-0 flex flex-col px-5 right-0    dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHoverd
            ? "w-[290px]"
            : "w-[102px]"
        }
        
        ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0`}
      style={{
        boxShadow: "-4px 0 8px var(--shadow)",
        background:
          "linear-gradient(135deg, var(--primary-brown), var(--primary-brown-dark))",
      }}
      onMouseEnter={() => !isExpanded && setIsHoverd(true)}
      onMouseLeave={() => setIsHoverd(false)}
    >
      <div
        className={`pt-10 pb-8 lg:py-8 flex ${
          !isExpanded && !isHoverd ? "lg:justify-center" : " justify-start"
        } `}
      >
        <Link to="/" className=" w-full">
          {isExpanded || isHoverd || isMobileOpen ? (
            <div className=" w-full  text-center">
              <h1 className=" md:font-bold font-medium text-white md:text-[16px] text-[14px] w-full">
                اصغری خرما فروشی{" "}
              </h1>
              <p
                className="text-sm"
                style={{
                  color: "var(--amber-light)",
                  marginTop: "var(--space-1)",
                }}
              >
                تجارت و توزیع
              </p>
            </div>
          ) : (
            <img src="log.png" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>
      <div className="flex flex-col flex-grow overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>{renderMenuItems(navItem, "main")}</div>
          </div>
        </nav>
      </div>
      <div className="h-auto border-t border-slate-200/20 py-3 px-2">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {user?.image && user.image !== "default-user.jpg" ? (
              <img
                src={`${BACKEND_BASE_URL}/public/images/users/${user.image}`}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="flex-1 text-right min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "کاربر مدیر"}
              </p>
              <p className="text-xs text-white/70 truncate">
                {user?.email || ""}
              </p>
            </div>
          </button>

          {/* User dropdown menu */}
          {showUserMenu && (
            <div
              ref={ref}
              className="absolute bottom-full left-0 mb-2 w-48 rounded-md shadow-lg z-50"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="py-1">
                <div
                  className="px-4 py-2 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-dark)" }}
                  >
                    {user?.name || user?.email || "کاربر"}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-medium)" }}
                  >
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 hover:bg-slate-100 py-2 text-sm transition-colors duration-200"
                >
                  <RiLogoutBoxLine className="text-[18px] text-black" />
                  خروج از سیستم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AppSidebar;
