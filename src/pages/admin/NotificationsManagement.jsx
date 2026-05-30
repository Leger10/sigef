// src/pages/admin/NotificationsManagement.jsx
import React, { useState, useEffect } from 'react';
import { BellRing, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const NotificationsManagement = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    console.log('[NotificationsManagement] Fetching notifications...');

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      // Si ce n'est pas super_admin, filtrer par admin_id
      if (!isSuperAdmin && currentUser) {
        // Récupérer d'abord les cycles de l'admin pour filtrer les notifications
        const { data: cycles, error: cyclesError } = await supabase
          .from('cycles')
          .select('id')
          .eq('admin_id', currentUser.id);

        if (cyclesError) throw cyclesError;

        const cycleIds = cycles?.map(c => c.id) || [];
        
        if (cycleIds.length > 0) {
          query = query.in('recipients_cycle', cycleIds);
        } else {
          // Si aucun cycle, retourner vide
          setNotifications([]);
          setIsLoading(false);
          return;
        }
      }

      const { data: notificationsData, error: notificationsError } = await query;

      if (notificationsError) throw notificationsError;

      console.log(`[NotificationsManagement] Fetched ${notificationsData?.length || 0} notifications`);
      setNotifications(notificationsData || []);
    } catch (err) {
      console.error('[NotificationsManagement] Error fetching notifications:', err);
      setError(err.message || 'Erreur lors du chargement des notifications');
      toast.error('Impossible de charger l\'historique des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser?.id, isSuperAdmin]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'sent':
        return <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-success/10 text-success">Envoyé</span>;
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-secondary/10 text-secondary">En attente</span>;
      case 'failed':
        return <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-destructive/10 text-destructive">Échoué</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-muted text-muted-foreground">{status || 'Envoyé'}</span>;
    }
  };

  const getAudienceLabel = (type) => {
    switch(type) {
      case 'all': return 'Tous';
      case 'pro_only': return 'PRO uniquement';
      case 'non_pro': return 'Non-PRO';
      case 'by_cycle': return 'Par cycle';
      case 'by_user': return 'Utilisateur spécifique';
      default: return type || 'Tous';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Erreur de chargement</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <BellRing className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Historique des Notifications</h2>
          <p className="text-sm text-muted-foreground">Consultez les notifications envoyées aux utilisateurs.</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date d'envoi</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Aucune notification envoyée.
                </TableCell>
              </TableRow>
            ) : (
              notifications.map(notif => (
                <TableRow key={notif.id}>
                  <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                    {new Date(notif.sent_at || notif.created_at).toLocaleString('fr-FR', { 
                      dateStyle: 'short', 
                      timeStyle: 'short' 
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{notif.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {notif.message}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-1 bg-secondary/10 text-secondary-foreground text-xs font-bold rounded uppercase">
                      {getAudienceLabel(notif.recipients_type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(notif.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default NotificationsManagement;
