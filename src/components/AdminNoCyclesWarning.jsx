// src/components/AdminNoCyclesWarning.jsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const AdminNoCyclesWarning = () => {
  const { currentUser, isAdmin } = useAuth();
  const [hasCycles, setHasCycles] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkCycles = async () => {
      if (!isAdmin || !currentUser) return;
      
      try {
        const { data: cyclesAsOwner } = await supabase
          .from('cycles')
          .select('id')
          .eq('admin_id', currentUser.id);
        
        const { data: assignedCycles } = await supabase
          .from('admin_cycles')
          .select('cycle_id')
          .eq('admin_id', currentUser.id);
        
        const hasAnyCycles = (cyclesAsOwner && cyclesAsOwner.length > 0) || 
                            (assignedCycles && assignedCycles.length > 0);
        
        setHasCycles(hasAnyCycles);
      } catch (error) {
        console.error('Error checking admin cycles:', error);
      }
    };
    
    checkCycles();
  }, [currentUser, isAdmin]);

  // Ne pas afficher si l'utilisateur a des cycles ou si le message a été fermé
  if (!isAdmin || hasCycles || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Configuration requise
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Votre compte administrateur n'est pas encore configuré. 
              Veuillez contacter le Super Administrateur pour qu'il vous assigne des cycles de formation.
            </p>
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDismissed(true)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
              >
                Compris
              </Button>
            </div>
          </div>
          <button 
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminNoCyclesWarning;