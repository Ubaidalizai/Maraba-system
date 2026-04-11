import React from "react";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";
import AppHeader from "./AppHeader";
import { Outlet } from "react-router-dom";
import { useSidebar, SidebarProvider } from "./../contexts/SidebarContext";

const LayoutContent = () => {
  const { isExpanded, isHoverd, isMobileOpen } = useSidebar();

  return (
    <div className=" relative min-h-screen overflow-hidden mx-auto w-full max-w-[var(--breakpoint-2xl)]">
      {/* Header outside scrollable region but within right-spaced wrapper */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded || isHoverd ? "lg:mr-[290px]" : "lg:mr-[102px]"
        } ${isMobileOpen ? "mr-0" : ""}`}
      >
        <AppHeader />
      </div>

      {/* Scroll container sized under the header height; only content scrolls */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded || isHoverd ? "lg:mr-[290px]" : "lg:mr-[102px]"
        } ${isMobileOpen ? "mr-0" : ""}`}
      >
        <div className="h-[calc(100vh-64px)] lg:h-[calc(100vh-72px)] overflow-y-auto overflow-x-auto no-scrollbar">
          <div className="p-4 mx-auto  md:p-6">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Fixed right sidebar and backdrop for mobile */}
      <AppSidebar />
      <Backdrop />
    </div>
  );
};
function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}

export default AppLayout;
