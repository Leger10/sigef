import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Users, UserCheck, Crown, DollarSign, TrendingUp, 
  Calendar, Activity, Shield, Layers, ArrowUp, ArrowDown, Filter 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#1a56db', '#7e3af2', '#10b981', '#f59e0b', '#ef4444'];

const GlobalStats = ({ detailed = false }) => {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('all');
  const [selectedAdminName, setSelectedAdminName] = useState('Tous les centres');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalFormateurs: 0,
    totalApprenants: 0,
    activePro: 0,
    totalRevenue: 0,
    monthlyRevenue: [],
    usersByCycle: [],
    usersByRole: [],
    recentActivities: []
  });

  // Charger la liste des administrateurs (centres)
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('role', ['admin', 'super_admin'])
        .order('full_name');
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, [selectedAdminId]);

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les apprenants filtrés par admin si nécessaire
      let apprenantIds = null;
      if (selectedAdminId !== 'all') {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id')
          .eq('admin_id', selectedAdminId)
          .eq('role', 'apprenant');
        if (!usersError && usersData) {
          apprenantIds = usersData.map(u => u.id);
        }
      }

      // 2. Récupérer les transactions APPROVED, filtrées par apprenants
      let transactionsQuery = supabase
        .from('transactions')
        .select('amount, created_at, user_id')
        .eq('status', 'approved');
      
      if (apprenantIds && apprenantIds.length > 0) {
        transactionsQuery = transactionsQuery.in('user_id', apprenantIds);
      } else if (selectedAdminId !== 'all' && apprenantIds?.length === 0) {
        // Admin sans aucun apprenant → aucune transaction
        setStats({
          totalUsers: 0,
          totalAdmins: 0,
          totalFormateurs: 0,
          totalApprenants: 0,
          activePro: 0,
          totalRevenue: 0,
          monthlyRevenue: [],
          usersByCycle: [],
          usersByRole: [],
          recentActivities: []
        });
        setLoading(false);
        return;
      }

      const { data: transactionsData, error: transError } = await transactionsQuery;
      if (transError) throw transError;
      const approvedTransactions = transactionsData || [];
      const totalRevenue = approvedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // 3. Revenus mensuels (12 derniers mois)
      const monthlyRevenue = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        monthlyRevenue[monthStr] = 0;
      }

      approvedTransactions.forEach(t => {
        const d = new Date(t.created_at);
        const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        if (monthlyRevenue[monthStr] !== undefined) {
          monthlyRevenue[monthStr] += t.amount || 0;
        }
      });

      const monthlyRevenueArray = Object.keys(monthlyRevenue).map(k => ({
        month: k,
        revenue: monthlyRevenue[k]
      }));

      // 4. Statistiques globales (utilisateurs, etc.) – elles ne sont pas filtrées par admin
      //    (sauf si on souhaite aussi filtrer les compteurs, mais la demande ne le précise pas)
      const [usersRes, proRes] = await Promise.all([
        supabase.from('users').select('role, cycle_id', { count: 'exact' }),
        supabase.from('users').select('*', { count: 'exact' }).eq('pro_status', true)
      ]);

      const users = usersRes.data || [];
      const totalUsers = users.length;
      const totalAdmins = users.filter(u => u.role === 'admin').length;
      const totalFormateurs = users.filter(u => u.role === 'formateur').length;
      const totalApprenants = users.filter(u => u.role === 'apprenant').length;
      const activePro = proRes.count || 0;

      // Répartition par cycle (tous cycles)
      const cycles = await supabase.from('cycles').select('id, name');
      const cyclesData = cycles.data || [];
      const usersByCycle = cyclesData.map(cycle => ({
        name: cycle.name,
        value: users.filter(u => u.cycle_id === cycle.id).length
      })).filter(c => c.value > 0);

      // Répartition par rôle
      const usersByRole = [
        { name: 'Apprenants', value: totalApprenants, color: COLORS[0] },
        { name: 'Formateurs', value: totalFormateurs, color: COLORS[1] },
        { name: 'Admins', value: totalAdmins, color: COLORS[2] }
      ];

      // Activités récentes – inclure explicitement le numéro de téléphone
      const { data: recentActivities } = await supabase
        .from('activity_logs')
        .select('*, user:user_id(id, full_name, email, phone)')  // ✅ ajout de phone
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalUsers,
        totalAdmins,
        totalFormateurs,
        totalApprenants,
        activePro,
        totalRevenue,
        monthlyRevenue: monthlyRevenueArray,
        usersByCycle,
        usersByRole,
        recentActivities: recentActivities || []
      });

      // Mettre à jour le nom de l'admin affiché
      if (selectedAdminId !== 'all') {
        const admin = admins.find(a => a.id === selectedAdminId);
        setSelectedAdminName(admin?.full_name || admin?.email || 'Centre sélectionné');
      } else {
        setSelectedAdminName('Tous les centres');
      }

    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  // Vue simplifiée (pour le dashboard)
  if (!detailed) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold">Statistiques globales</h3>
            <p className="text-sm text-muted-foreground">
              {selectedAdminName} – {stats.totalRevenue.toLocaleString()} FCFA de chiffre d'affaires
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrer par centre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les centres</SelectItem>
                {admins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id}>{admin.full_name || admin.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">Total Utilisateurs</p><p className="text-3xl font-bold">{stats.totalUsers}</p></div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">Abonnés PRO</p><p className="text-3xl font-bold">{stats.activePro}</p></div>
                <Crown className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p><p className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p></div>
                <DollarSign className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">Formateurs</p><p className="text-3xl font-bold">{stats.totalFormateurs}</p></div>
                <UserCheck className="h-8 w-8 text-secondary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Évolution des revenus</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                    <Line type="monotone" dataKey="revenue" stroke="#1a56db" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Répartition des utilisateurs</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.usersByRole} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {stats.usersByRole.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Vue détaillée (avec les mêmes filtres)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Statistiques détaillées</h2>
          <p className="text-sm text-muted-foreground">Filtre actif : {selectedAdminName}</p>
        </div>
        <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Filtrer par centre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les centres</SelectItem>
            {admins.map(admin => <SelectItem key={admin.id} value={admin.id}>{admin.full_name || admin.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cartes des KPIs (inchangées mais avec valeurs filtrées) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.totalUsers}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Shield className="h-5 w-5 text-blue-500" /></div><div><p className="text-xs text-muted-foreground">Admins</p><p className="text-xl font-bold">{stats.totalAdmins}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><UserCheck className="h-5 w-5 text-green-500" /></div><div><p className="text-xs text-muted-foreground">Formateurs</p><p className="text-xl font-bold">{stats.totalFormateurs}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><Users className="h-5 w-5 text-purple-500" /></div><div><p className="text-xs text-muted-foreground">Apprenants</p><p className="text-xl font-bold">{stats.totalApprenants}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-amber-500/10 rounded-lg"><Crown className="h-5 w-5 text-amber-500" /></div><div><p className="text-xs text-muted-foreground">PRO Actifs</p><p className="text-xl font-bold">{stats.activePro}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenus mensuels (FCFA)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                  <Bar dataKey="revenue" fill="#1a56db" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Répartition par cycle</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {stats.usersByCycle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.usersByCycle} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {stats.usersByCycle.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée disponible</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Activités récentes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Téléphone</TableHead>   {/* ✅ Nouvelle colonne */}
                <TableHead>Action</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentActivities.map(activity => (
                <TableRow key={activity.id}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(activity.created_at).toLocaleString()}</TableCell>
                  <TableCell>{activity.user?.full_name || activity.user?.email || 'Système'}</TableCell>
                  <TableCell>{activity.user?.phone || '-'}</TableCell>   {/* ✅ Affichage du téléphone */}
                  <TableCell><Badge variant="outline" className="capitalize">{activity.action?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="max-w-md truncate">{activity.details || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalStats;