import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export const useAdminRedirect = () => {
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) return;

    // Super admin : ne rediriger que s'il essaie d'accéder à /admin ou /dashboard
    if (isSuperAdmin) {
      if (location.pathname === '/admin' || location.pathname === '/dashboard') {
        navigate('/super-admin');
      }
      return;
    }

    // Admin normal : vérifier les cycles
    if (isAdmin && currentUser) {
      const checkCycles = async () => {
        try {
          const { data: cyclesAsOwner } = await supabase
            .from('cycles')
            .select('id')
            .eq('admin_id', currentUser.id)
            .eq('is_active', true);
          const { data: assignedCycles } = await supabase
            .from('admin_cycles')
            .select('cycle_id')
            .eq('admin_id', currentUser.id);
          const hasCycles = (cyclesAsOwner?.length > 0) || (assignedCycles?.length > 0);
          if (!hasCycles && location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error checking admin cycles:', error);
        }
      };
      checkCycles();
    }
  }, [currentUser, isAdmin, isSuperAdmin, navigate, location.pathname]);
};