import React, { createContext, useContext, useState } from "react";

// Context for sidebar open/close state
const SidebarContext = createContext();

// Provider to wrap your app and manage sidebar state
export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle sidebar open/close
  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Hook to use sidebar state and toggle function
export const useSidebar = () => useContext(SidebarContext);
