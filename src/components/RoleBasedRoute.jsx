import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const RoleBasedRoute = ({ allowedRoles }) => {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    console.log('[RoleBasedRoute] User not authenticated. Redirecting to login.');
    return <Navigate to="/login" replace />;
  }

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    console.log(`[RoleBasedRoute] Access denied. User role '${currentUser?.role}' not in allowed roles: ${allowedRoles.join(', ')}`);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleBasedRoute;
