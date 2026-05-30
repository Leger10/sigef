// src/pages/DashboardPage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

const DashboardPage = () => {
  const { currentUser, isApprenant, isFormateur, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[DashboardPage] Routing user...', { 
      role: currentUser?.role,
      isSuperAdmin, 
      isAdmin, 
      isFormateur, 
      isApprenant 
    });

    if (currentUser) {
      if (isSuperAdmin) {
        navigate('/super-admin', { replace: true });
      } else if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isFormateur) {
        navigate('/formateur', { replace: true });
      } else if (isApprenant) {
        navigate('/apprenant', { replace: true });
      }
    }
  }, [currentUser, isApprenant, isFormateur, isAdmin, isSuperAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Redirection vers votre espace...</p>
      </div>
    </div>
  );
};

export default DashboardPage;
