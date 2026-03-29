import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import EmployeeHomePage from "./pages/EmployeeHomePage";
import AttendancePage from "./pages/AttendancePage";
import AdminPage from "./pages/AdminPage";

function RootRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/employee"
          element={
            <ProtectedRoute role="employee">
              <EmployeeHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute role="employee">
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
