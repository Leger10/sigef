// src/pages/admin/GlobalStats.jsx
import React, { useState, useEffect } from 'react';
import { Users, Crown, DollarSign, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const COLORS = ['hsl(221, 83%, 33%)', 'hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(349, 89%, 52%)', 'hsl(280, 65%, 60%)'];

const GlobalStats = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // KPIs
  const [totalUsers, setTotalUsers] = useState(0);
  const [activePro, setActivePro] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeTrainers, setActiveTrainers] = useState(0);

  // Chart Data
  const [usersByCycle, setUsersByCycle] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [subsByStatus, setSubsByStatus] = useState([]);
  
  // Table Data
  const [topTrainers, setTopTrainers] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('Fetching global statistics...');
      setLoading(true);
      try {
        let query = supabase;
        
        // Récupérer l'admin_id pour filtrer (si pas super_admin)
        const adminFilter = !isSuperAdmin ? { admin_id: currentUser?.id } : null;

        // Total Users (apprenants de l'admin)
        let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
        if (adminFilter) {
          usersQuery = usersQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { count: totalUsersCount, error: usersError } = await usersQuery;
        if (!usersError) setTotalUsers(totalUsersCount || 0);

        // Active PRO Users
        let proQuery = supabase.from('users').select('*', { count: 'exact', head: true })
          .eq('pro_status', true);
        if (adminFilter) {
          proQuery = proQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { count: proCount, error: proError } = await proQuery;
        if (!proError) setActivePro(proCount || 0);

        // Active Trainers (formateurs de l'admin)
        let trainersQuery = supabase.from('users').select('*', { count: 'exact', head: true })
          .eq('role', 'formateur');
        if (adminFilter) {
          trainersQuery = trainersQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { count: trainersCount, error: trainersError } = await trainersQuery;
        if (!trainersError) setActiveTrainers(trainersCount || 0);

        // Total Revenue (transactions complétées)
        let revenueQuery = supabase.from('transactions').select('amount')
          .eq('status', 'completed');
        const { data: revenueData, error: revenueError } = await revenueQuery;
        if (!revenueError && revenueData) {
          const revenue = revenueData.reduce((sum, p) => sum + (p.amount || 0), 0);
          setTotalRevenue(revenue);
        }

        // Cycles de l'admin
        let cyclesQuery = supabase.from('cycles').select('*');
        if (adminFilter) {
          cyclesQuery = cyclesQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { data: cycles, error: cyclesError } = await cyclesQuery;
        if (cyclesError) throw cyclesError;

        // Users par cycle
        let usersListQuery = supabase.from('users').select('cycle_id');
        if (adminFilter) {
          usersListQuery = usersListQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { data: usersList, error: usersListError } = await usersListQuery;
        
        if (!usersListError && usersList && cycles) {
          const cycleCounts = {};
          usersList.forEach(u => { 
            if (u.cycle_id) cycleCounts[u.cycle_id] = (cycleCounts[u.cycle_id] || 0) + 1; 
          });
          
          const pieData = cycles.map(c => ({ 
            name: c.name, 
            value: cycleCounts[c.id] || 0 
          })).filter(d => d.value > 0);
          setUsersByCycle(pieData);
        }

        // Monthly Revenue
        const { data: monthlyPayments, error: monthlyError } = await supabase
          .from('transactions')
          .select('amount, created_at')
          .eq('status', 'completed');

        if (!monthlyError && monthlyPayments) {
          const monthlyRevenue = {};
          const now = new Date();
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            monthlyRevenue[monthStr] = 0;
          }

          monthlyPayments.forEach(p => {
            const d = new Date(p.created_at);
            const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            if (monthlyRevenue[monthStr] !== undefined) {
              monthlyRevenue[monthStr] += (p.amount || 0);
            }
          });

          setRevenueByMonth(Object.keys(monthlyRevenue).map(k => ({ 
            name: k, 
            revenue: monthlyRevenue[k] 
          })));
        }

        // Subscriptions by status
        let subsQuery = supabase.from('subscriptions').select('status');
        if (adminFilter) {
          // Récupérer les user_ids des apprenants de l'admin
          const { data: usersIds, error: usersIdsError } = await supabase
            .from('users')
            .select('id')
            .eq('admin_id', adminFilter.admin_id);
          
          if (!usersIdsError && usersIds) {
            const userIds = usersIds.map(u => u.id);
            subsQuery = subsQuery.in('user_id', userIds);
          }
        }
        const { data: subscriptions, error: subsError } = await subsQuery;
        
        if (!subsError && subscriptions) {
          const statusCounts = { active: 0, expired: 0, pending: 0 };
          subscriptions.forEach(s => {
            const status = s.status;
            if (statusCounts[status] !== undefined) statusCounts[status]++;
            else if (status === 'completed') statusCounts.active++;
          });
          setSubsByStatus([
            { name: 'Actifs', count: statusCounts.active },
            { name: 'En attente', count: statusCounts.pending },
            { name: 'Expirés', count: statusCounts.expired }
          ]);
        }

        // Top Trainers
        let trainersListQuery = supabase.from('users').select('id, full_name, email')
          .eq('role', 'formateur');
        if (adminFilter) {
          trainersListQuery = trainersListQuery.eq('admin_id', adminFilter.admin_id);
        }
        const { data: formateurs, error: formateursError } = await trainersListQuery;
        
        if (!formateursError && formateurs) {
          const trainerStats = [];
          
          for (const trainer of formateurs) {
            const { count: coursesCount } = await supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .eq('formateur_id', trainer.id);
            
            const { count: sessionsCount } = await supabase
              .from('live_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('formateur_id', trainer.id);
            
            trainerStats.push({
              id: trainer.id,
              name: trainer.full_name || trainer.email,
              coursesCount: coursesCount || 0,
              sessionsCount: sessionsCount || 0,
              studentsCount: Math.floor(Math.random() * 50) + 10 // TODO: Remplacer par vrai calcul
            });
          }
          
          trainerStats.sort((a, b) => (b.coursesCount + b.sessionsCount) - (a.coursesCount + a.sessionsCount));
          setTopTrainers(trainerStats.slice(0, 5));
        }
        
        console.log('Statistics loaded successfully');
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error(error.message || 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser?.id, isSuperAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Utilisateurs</p>
              <p className="text-2xl font-bold tabular-nums">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Abonnés PRO</p>
              <p className="text-2xl font-bold tabular-nums">{activePro}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-md">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Revenu Estimé</p>
              <p className="text-2xl font-bold tabular-nums">{totalRevenue.toLocaleString()} XOF</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Formateurs Actifs</p>
              <p className="text-2xl font-bold tabular-nums">{activeTrainers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Revenus sur 12 mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }} formatter={(value) => [`${value.toLocaleString()} XOF`, 'Revenu']} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Répartition par Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {usersByCycle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={usersByCycle} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                      {usersByCycle.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-medium">Aucune donnée disponible</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Statut des Abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subsByStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={13} fontWeight="600" tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="count" name="Nombre" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {subsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Actifs' ? 'hsl(var(--primary))' : entry.name === 'En attente' ? 'hsl(var(--secondary))' : 'hsl(var(--destructive))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Trainers Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Top 5 Formateurs par Activité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold text-center">Cours Publiés</TableHead>
                  <TableHead className="font-semibold text-center">Sessions Animées</TableHead>
                  <TableHead className="font-semibold text-center">Apprenants Touchés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTrainers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-medium">Aucun formateur actif</TableCell>
                  </TableRow>
                ) : (
                  topTrainers.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell className="font-bold">{trainer.name}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">{trainer.coursesCount}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">{trainer.sessionsCount}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">{trainer.studentsCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalStats;
