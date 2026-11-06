import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // still checking localStorage, avoid a flash of the login page
  if (!user) return <Navigate to="/login" replace />;

  return children;
}