import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscription } from './useSubscription.js';

export const useAccess = () => {
  const { isAuthenticated, currentUser, isPro } = useAuth();

  const checkAccess = (item, isEnrolled = false) => {
    // 1. Admin/Super Admin always have access
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      return { hasAccess: true, reason: 'admin_override' };
    }

    // 2. Creator always has access
    if (item?.created_by === currentUser?.id) {
      return { hasAccess: true, reason: 'creator_override' };
    }

    // 3. Public items are accessible to everyone (even unauthenticated)
    if (item?.is_public === true) {
      return { hasAccess: true, reason: 'public_access' };
    }

    // 4. If not public, must be authenticated
    if (!isAuthenticated) {
      return { hasAccess: false, reason: 'auth_required' };
    }

    // 5. Enrolled users have access to program content
    if (isEnrolled) {
      return { hasAccess: true, reason: 'enrolled_access' };
    }

    // 6. Pro users have access to all non-enrolled private content
    if (isPro) {
      return { hasAccess: true, reason: 'pro_access' };
    }

    // Default denial
    return { hasAccess: false, reason: 'pro_required' };
  };

  return { checkAccess };
};