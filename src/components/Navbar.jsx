import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div>
        <strong>Studio Attendance</strong>
      </div>
      <nav className="nav-links">
        {!user && <Link to="/login">Login</Link>}
        {user?.role === "employee" && <Link to="/employee">Employee</Link>}
        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        {user && (
          <button className="link-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
