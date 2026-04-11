import { createContext, useContext, useEffect, useState } from "react";

const SidebarContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("Th context is outside the area");
  return context;
};
export const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHoverd, setIsHoverd] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  useEffect(function () {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((pre) => !pre);
  };
  const toggleMobileSidebar = () => {
    setIsMobileOpen((pre) => !pre);
  };
  const toggleSubMenu = (item) => {
    setOpenSubMenu((pre) => (pre === item ? null : item));
  };
  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobile,
        isMobileOpen,
        isHoverd,
        activeItem,
        openSubMenu,
        toggleMobileSidebar,
        toggleSidebar,
        toggleSubMenu,
        setIsHoverd,
        setActiveItem,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
