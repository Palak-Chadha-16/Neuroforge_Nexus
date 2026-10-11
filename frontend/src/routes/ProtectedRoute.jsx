import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextStore.js";

const ProtectedRoute = ({ children }) => {
  const { currentUser, authReady } = useAuth();

  if (!authReady) {
    return <div>Checking authentication...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;