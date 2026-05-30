// src/pages/admin/ActivityTracking.jsx - Version avec numéro de téléphone
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Activity, AlertCircle, RefreshCw, Filter, Users, Calendar, Clock, UserCheck, Eye, Search, Layers, User, CreditCard, Crown, LogIn, LogOut, BookOpen, Video, Phone } from 'lucide-react';
import { toast } from 'sonner';

const ActivityTracking = ({ cycleId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [cyclesMap, setCyclesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const [searchTerm, setSearchTerm] = useState('');

  // Récupérer les utilisateurs de l'admin
  const fetchUsers = async () => {
    try {
      let usersQuery = supabase
        .from('users')
        .select('id, email, full_name, phone, role, pro_status, pro_expiry, cycle_id, admin_id, created_at')
        .in('role', ['apprenant', 'formateur'])
        .order('full_name', { ascending: true });

      // Filtrer par admin si ce n'est pas un super admin
      if (!isSuperAdmin && currentUser) {
        usersQuery = usersQuery.eq('admin_id', currentUser.id);
      }

      const { data: usersData, error: usersError } = await usersQuery;
      
      if (usersError) throw usersError;
      
      const usersMapData = {};
      (usersData || []).forEach(user => {
        usersMapData[user.id] = user;
      });
      setUsersMap(usersMapData);
      setUsers(usersData || []);
      
      return usersData || [];
    } catch (err) {
      console.error('[ActivityTracking] Error fetching users:', err);
      return [];
    }
  };

  // Récupérer les cycles pour le mapping
  const fetchCycles = async () => {
    try {
      let cyclesQuery = supabase.from('cycles').select('id, name');
      if (!isSuperAdmin && currentUser) {
        cyclesQuery = cyclesQuery.eq('admin_id', currentUser.id);
      }
      const { data: cyclesData, error: cyclesError } = await cyclesQuery;
      
      if (!cyclesError && cyclesData) {
        const map = {};
        cyclesData.forEach(cycle => {
          map[cycle.id] = cycle.name;
        });
        setCyclesMap(map);
      }
    } catch (err) {
      console.error('[ActivityTracking] Error fetching cycles:', err);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchCycles();
      const usersList = await fetchUsers();
      
      if (usersList.length === 0) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      // Récupérer les IDs des utilisateurs de l'admin
      const userIds = usersList.map(u => u.id);
      
      if (userIds.length === 0) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      // Récupérer les logs des utilisateurs de l'admin UNIQUEMENT
      let logsQuery = supabase
        .from('activity_logs')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(500);

      // Filtrer par date
      if (dateFilter !== 'all') {
        const daysAgo = parseInt(dateFilter);
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysAgo);
        logsQuery = logsQuery.gte('created_at', dateLimit.toISOString());
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        throw logsError;
      }

      let filteredLogs = logsData || [];

      // Filtrer par action
      if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
      }

      // Filtrer par utilisateur
      if (userFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.user_id === userFilter);
      }

      // Filtrer par recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
          const user = usersMap[log.user_id];
          return (
            (user?.full_name?.toLowerCase() || '').includes(searchLower) ||
            (user?.email?.toLowerCase() || '').includes(searchLower) ||
            (user?.phone?.toLowerCase() || '').includes(searchLower) ||
            (log.details?.toLowerCase() || '').includes(searchLower) ||
            (log.action?.toLowerCase() || '').includes(searchLower)
          );
        });
      }

      setLogs(filteredLogs);
      
    } catch (err) {
      console.error('[ActivityTracking] Error:', err);
      setError(err.message || 'Erreur lors du chargement des logs');
      toast.error('Impossible de charger les logs d\'activité');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [cycleId, isSuperAdmin, currentUser?.id, actionFilter, userFilter, dateFilter, searchTerm]);

  const getActionBadge = (action) => {
    const config = {
      login: { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Connexion', icon: <LogIn className="w-3 h-3 mr-1" /> },
      logout: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Déconnexion', icon: <LogOut className="w-3 h-3 mr-1" /> },
      payment: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Paiement', icon: <CreditCard className="w-3 h-3 mr-1" /> },
      subscription: { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Abonnement', icon: <Crown className="w-3 h-3 mr-1" /> },
      course_view: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Cours consulté', icon: <BookOpen className="w-3 h-3 mr-1" /> },
      quiz_complete: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Quiz complété', icon: <Activity className="w-3 h-3 mr-1" /> },
      quiz_start: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Début Quiz', icon: <Activity className="w-3 h-3 mr-1" /> },
      session_join: { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', label: 'Rejoint Session', icon: <Video className="w-3 h-3 mr-1" /> },
      session_leave: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Quitté Session', icon: <Video className="w-3 h-3 mr-1" /> },
      registration: { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Inscription', icon: <User className="w-3 h-3 mr-1" /> },
      login_failed: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Échec connexion', icon: <AlertCircle className="w-3 h-3 mr-1" /> }
    };
    
    const style = config[action] || { color: 'bg-secondary/20 text-secondary-foreground', label: action?.replace(/_/g, ' ') || '-' };
    return (
      <Badge className={style.color}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  const actions = [
    { value: 'all', label: 'Toutes les actions' },
    { value: 'registration', label: 'Inscription' },
    { value: 'login', label: 'Connexion' },
    { value: 'login_failed', label: 'Échec connexion' },
    { value: 'logout', label: 'Déconnexion' },
    { value: 'payment', label: 'Paiement' },
    { value: 'subscription', label: 'Abonnement' },
    { value: 'course_view', label: 'Visionnage cours' },
    { value: 'quiz_start', label: 'Début Quiz' },
    { value: 'quiz_complete', label: 'Quiz complété' },
    { value: 'session_join', label: 'Rejoint Session' },
    { value: 'session_leave', label: 'Quitté Session' }
  ];

  const dateOptions = [
    { value: '7', label: '7 derniers jours' },
    { value: '30', label: '30 derniers jours' },
    { value: '90', label: '90 derniers jours' },
    { value: 'all', label: 'Toutes les dates' }
  ];

  const stats = {
    total: logs.length,
    uniqueUsers: new Set(logs.map(l => l.user_id)).size,
    totalUsers: users.length,
    proUsers: users.filter(u => u.pro_status === true).length,
    standardUsers: users.filter(u => u.pro_status !== true).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Erreur de chargement</h3>
            <p className="text-sm opacity-90">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="mt-2">
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total activités</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs PRO</p>
                <p className="text-2xl font-bold text-green-600">{stats.proUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                <p className="text-2xl font-bold text-amber-600">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par utilisateur, téléphone ou détail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrer par action" />
            </SelectTrigger>
            <SelectContent>
              {actions.map(action => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email} {user.pro_status ? '(PRO)' : '(Standard)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Tableau des logs */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Date & Heure</TableHead>
                <TableHead className="text-white">Utilisateur</TableHead>
                <TableHead className="text-white">Téléphone</TableHead>  {/* ✅ Nouvelle colonne */}
                <TableHead className="text-white">Cycle</TableHead>
                <TableHead className="text-white">Statut</TableHead>
                <TableHead className="text-white">Action</TableHead>
                <TableHead className="text-white">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    Aucune activité trouvée pour les utilisateurs de votre centre.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => {
                  const user = usersMap[log.user_id];
                  const isPro = user?.pro_status;
                  const isExpired = isPro && user?.pro_expiry && new Date(user.pro_expiry) < new Date();
                  const cycleName = user?.cycle_id ? cyclesMap[user.cycle_id] : 'Non assigné';
                  
                  return (
                    <TableRow key={log.id || index} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(log.created_at).toLocaleDateString('fr-FR')}</span>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user?.full_name || 'Utilisateur inconnu'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email || log.user_id?.substring(0, 8)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{user?.phone || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          <Layers className="w-3 h-3 mr-1" />
                          {cycleName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isPro ? (
                          <Badge className={`border-none ${isExpired ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            <UserCheck className="w-3 h-3 mr-1" /> PRO
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal text-muted-foreground">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md">
                        {log.details || log.action || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ActivityTracking;