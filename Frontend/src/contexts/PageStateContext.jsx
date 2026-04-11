import React, { createContext, useContext, useState } from "react";

// Context creation
const PageStateContext = createContext();

// Custom hook to use the context
// eslint-disable-next-line react-refresh/only-export-components
export const usePageState = () => {
  const context = useContext(PageStateContext);
  if (!context) {
    throw new Error('usePageState must be used within a PageStateProvider');
  }
  return context;
};

// Provider component to wrap around your page
export const PageStateProvider = ({ children }) => {
  const [type, setType] = useState("supplier");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const contextValue = {
    type,
    setType,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
  };

  return (
    <PageStateContext.Provider value={contextValue}>
      {children}
    </PageStateContext.Provider>
  );
};
