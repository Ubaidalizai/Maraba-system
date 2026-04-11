import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { Bounce, ToastContainer } from "react-toastify";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { PageStateProvider } from "./contexts/PageStateContext";
import "./index.css";
import AccountDetails from "./pages/AccountDetails";
import Accounts from "./pages/Accounts";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import Purchases from "./pages/Purchases";
import Reports from "./pages/Reports";
import Sales from "./pages/Sales";
import SaleBill from "./pages/SaleBill";
import PrintSimple from "./pages/PrintSimple";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 1,
      refetchOnWindowFocus: true,
    },
  },
});
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PageStateProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/income" element={<Income />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:id" element={<AccountDetails />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/invoice/:id" element={<SaleBill />} />
                <Route path="/print" element={<PrintSimple />} />
              </Route>

              {/* Redirect to dashboard for any unmatched routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored" // ✅ this line
              transition={Bounce}
            />
          </Router>
        </PageStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
