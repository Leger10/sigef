// src/pages/admin/SubscriptionsManagement.jsx
import React, { useState, useEffect } from 'react';
import { Crown, AlertCircle, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SubscriptionsManagement = ({ cycleId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  
  const [proUsers, setProUsers] = useState([]);
  const [cyclesMap, setCyclesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Récupérer tous les cycles pour faire le mapping
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('cycles')
        .select('id, name');
      
      if (cyclesError) throw cyclesError;
      
      const cyclesMapData = {};
      (cyclesData || []).forEach(cycle => {
        cyclesMapData[cycle.id] = cycle.name;
      });
      setCyclesMap(cyclesMapData);

      // 2. Récupérer les utilisateurs PRO
      let query = supabase
        .from('users')
        .select('id, email, full_name, phone, pro_status, pro_expiry, cycle_id, admin_id, created_at')
        .eq('pro_status', true);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      if (!isSuperAdmin && currentUser) {
        query = query.eq('admin_id', currentUser.id);
      }

      const { data: usersData, error: usersError } = await query;

      if (usersError) throw usersError;

      // Ajouter le nom du cycle à chaque utilisateur
      const usersWithCycles = (usersData || []).map(user => ({
        ...user,
        cycle_name: cyclesMapData[user.cycle_id] || null
      }));

      setProUsers(usersWithCycles);
    } catch (err) {
      console.error('[SubscriptionsManagement] Error:', err);
      setError(err.message);
      toast.error('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cycleId, currentUser?.id, isSuperAdmin]);

  const getSubStatus = (expDate) => {
    if (!expDate) return { label: 'Inconnu', value: 'unknown', days: 0 };
    
    const now = new Date();
    const exp = new Date(expDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Expiré', value: 'expired', days: diffDays };
    if (diffDays <= 7) return { label: 'Expire bientôt', value: 'expiring', days: diffDays };
    return { label: 'Actif', value: 'active', days: diffDays };
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Actif</Badge>;
      case 'expiring':
        return <Badge className="bg-orange-500 text-white">Expire bientôt</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
            Réessayer
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Abonnés PRO
          </h2>
          <p className="text-sm text-gray-500">Utilisateurs avec accès premium</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-black hover:bg-black">
              <TableHead className="text-white font-semibold text-base">Apprenant</TableHead>
              <TableHead className="text-white font-semibold text-base">Cycle</TableHead>
              <TableHead className="text-white font-semibold text-base">Email</TableHead>
              <TableHead className="text-white font-semibold text-base">Téléphone</TableHead>
              <TableHead className="text-white font-semibold text-base">Expiration</TableHead>
              <TableHead className="text-white font-semibold text-base">Jours restants</TableHead>
              <TableHead className="text-white font-semibold text-base">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                </TableRow>
              ))
            ) : proUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  Aucun abonné PRO trouvé
                </TableCell>
              </TableRow>
            ) : (
              proUsers.map(user => {
                const status = getSubStatus(user.pro_expiry);
                return (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {user.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{user.cycle_name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      {user.pro_expiry ? new Date(user.pro_expiry).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {status.days > 0 ? (
                        <span className="font-medium text-green-600">{status.days} jours</span>
                      ) : status.days < 0 ? (
                        <span className="font-medium text-red-600">{Math.abs(status.days)} jours</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(status.value)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SubscriptionsManagement;