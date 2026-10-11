import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextStore.js";
import { normalizeRole } from "../constants/roles.js";

/**
 * Route guard checking Layer 1 role permissions.
 * If user's role is not within allowedRoles, redirects to /unauthorized.
 */
const RoleRoute = ({ allowedRoles = [], children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(currentUser.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
