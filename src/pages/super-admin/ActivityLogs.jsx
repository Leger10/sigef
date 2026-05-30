// src/pages/super-admin/ActivityLogs.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, RefreshCw, Calendar, User, Activity, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [admins, setAdmins] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [tableExists, setTableExists] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });

  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('role', ['admin', 'super_admin'])
        .order('full_name');
      setAdmins(data || []);
    };
    fetchAdmins();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Vérifier si la table existe
      const { error: checkError } = await supabase.from('activity_logs').select('id', { count: 'exact', head: true });
      if (checkError && checkError.message?.includes('does not exist')) {
        setTableExists(false);
        setLogs([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('activity_logs')
        .select('*, user:user_id(id, full_name, email, role)')
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') query = query.eq('action', actionFilter);

      if (adminFilter !== 'all') {
        const { data: usersData } = await supabase
          .from('users')
          .select('id')
          .eq('admin_id', adminFilter);
        const userIds = usersData?.map(u => u.id) || [];
        if (userIds.length === 0) {
          setLogs([]);
          setStats({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });
          setLoading(false);
          return;
        }
        query = query.in('user_id', userIds);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate;
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            startDate = new Date(now.setDate(now.getDate() - 1));
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = null;
        }
        if (startDate) query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
      // Mettre à jour les actions disponibles
      const actions = [...new Set(data?.map(l => l.action) || [])];
      setAvailableActions(actions);

      // Calculer stats basiques
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      setStats({
        total: data?.length || 0,
        today: data?.filter(l => new Date(l.created_at) >= today).length || 0,
        thisWeek: data?.filter(l => new Date(l.created_at) >= weekAgo).length || 0,
        thisMonth: data?.filter(l => new Date(l.created_at) >= monthAgo).length || 0,
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      if (error.message?.includes('does not exist')) setTableExists(false);
      else toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateFilter, adminFilter]);

  const getActionBadge = (action) => {
    const styles = {
      login: 'bg-blue-500/10 text-blue-600',
      logout: 'bg-gray-500/10 text-gray-600',
      payment: 'bg-green-500/10 text-green-600',
      subscription: 'bg-purple-500/10 text-purple-600',
      course_view: 'bg-cyan-500/10 text-cyan-600',
      quiz_complete: 'bg-amber-500/10 text-amber-600',
      session_join: 'bg-indigo-500/10 text-indigo-600',
      user_create: 'bg-emerald-500/10 text-emerald-600',
      user_update: 'bg-orange-500/10 text-orange-600',
      user_delete: 'bg-red-500/10 text-red-600',
    };
    const displayName = action?.replace(/_/g, ' ') || action;
    return <Badge variant="secondary" className={styles[action] || 'bg-muted'}>{displayName}</Badge>;
  };

  const filteredLogs = logs.filter(log =>
    log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
        <h3 className="text-lg font-medium">Table des logs non disponible</h3>
        <p className="text-sm text-muted-foreground mt-2">La table 'activity_logs' n'existe pas encore dans la base de données.</p>
        <p className="text-xs text-muted-foreground mt-1">Les logs seront visibles après sa création.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Journal d'Activité</h2>
          <p className="text-muted-foreground text-sm mt-1">Surveillance des actions sur la plateforme</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div><Activity className="h-8 w-8 text-primary opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Aujourd'hui</p><p className="text-2xl font-bold">{stats.today}</p></div><Calendar className="h-8 w-8 text-blue-500 opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Cette semaine</p><p className="text-2xl font-bold">{stats.thisWeek}</p></div><Calendar className="h-8 w-8 text-green-500 opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Ce mois</p><p className="text-2xl font-bold">{stats.thisMonth}</p></div><Calendar className="h-8 w-8 text-purple-500 opacity-50" /></div></CardContent></Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les centres" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tous les centres</SelectItem>{admins.map(a => <SelectItem key={a.id} value={a.id}><Building2 className="h-3 w-3 inline mr-2" />{a.full_name || a.email}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par action" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Toutes les actions</SelectItem>{availableActions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Période" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Toutes les dates</SelectItem><SelectItem value="today">Aujourd'hui</SelectItem><SelectItem value="yesterday">Hier</SelectItem><SelectItem value="week">7 derniers jours</SelectItem><SelectItem value="month">30 derniers jours</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date & Heure</TableHead><TableHead>Utilisateur</TableHead><TableHead>Action</TableHead><TableHead>Détails</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Aucune activité trouvée</TableCell></TableRow>
              ) : (
                filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{log.user?.full_name || log.user?.email || 'Système'}</p>
                      {log.user?.email && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-sm">{log.details || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
};

export default ActivityLogs;