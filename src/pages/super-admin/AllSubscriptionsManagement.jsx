// src/pages/super-admin/AllSubscriptionsManagement.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Crown, Loader2, Users, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { toast } from 'sonner';

const AllSubscriptionsManagement = () => {
  const [proUsers, setProUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les utilisateurs PRO
      let usersQuery = supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          pro_status,
          pro_expiry,
          created_at,
          cycle_id,
          admin_id
        `)
        .eq('pro_status', true);

      if (statusFilter === 'active') {
        usersQuery = usersQuery.gt('pro_expiry', new Date().toISOString());
      } else if (statusFilter === 'expired') {
        usersQuery = usersQuery.lt('pro_expiry', new Date().toISOString());
      }

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      // Récupérer les noms des cycles et admins
      const userIds = usersData?.map(u => u.id) || [];
      const adminIds = usersData?.map(u => u.admin_id).filter(Boolean) || [];
      const cycleIds = usersData?.map(u => u.cycle_id).filter(Boolean) || [];

      // Récupérer les cycles
      const { data: cyclesData } = await supabase
        .from('cycles')
        .select('id, name')
        .in('id', cycleIds);

      // Récupérer les admins
      const { data: adminsData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', adminIds);

      const cyclesMap = {};
      (cyclesData || []).forEach(c => cyclesMap[c.id] = c.name);
      
      const adminsMap = {};
      (adminsData || []).forEach(a => adminsMap[a.id] = a.full_name || a.email);

      const enrichedUsers = (usersData || []).map(user => ({
        ...user,
        cycle_name: cyclesMap[user.cycle_id] || null,
        admin_name: adminsMap[user.admin_id] || null
      }));

      setProUsers(enrichedUsers);

      // 2. Récupérer les transactions récentes
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          *,
          user:user_id(id, email, full_name),
          plan:plan_id(name, price)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: transactionsData, error: transactionsError } = await transactionsQuery;
      if (!transactionsError) {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (expiryDate, status = null) => {
    if (status === 'pending') {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">En attente</Badge>;
    }
    if (status === 'approved') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approuvé</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Rejeté</Badge>;
    }
    
    if (!expiryDate) return <Badge variant="outline">Inconnu</Badge>;
    
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <Badge variant="destructive">Expiré</Badge>;
    if (diffDays <= 7) return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Expire bientôt</Badge>;
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actif</Badge>;
  };

  const getTransactionStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approuvé</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredProUsers = proUsers.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.cycle_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(transaction =>
    transaction.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistiques
  const stats = {
    totalPro: proUsers.length,
    activePro: proUsers.filter(u => u.pro_expiry && new Date(u.pro_expiry) > new Date()).length,
    expiredPro: proUsers.filter(u => u.pro_expiry && new Date(u.pro_expiry) < new Date()).length,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    totalRevenue: transactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            Gestion des Abonnements PRO
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Supervision globale de tous les abonnements et transactions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PRO</p>
                <p className="text-2xl font-bold">{stats.totalPro}</p>
              </div>
              <Crown className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePro}</p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingTransactions}</p>
              </div>
              <Wallet className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalRevenue.toLocaleString()} FCFA</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par utilisateur, email ou cycle..." 
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="expired">Expirés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">Utilisateurs PRO</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white">Utilisateur</TableHead>
                    <TableHead className="text-white">Email</TableHead>
                    <TableHead className="text-white">Téléphone</TableHead>
                    <TableHead className="text-white">Cycle</TableHead>
                    <TableHead className="text-white">Admin</TableHead>
                    <TableHead className="text-white">Expiration</TableHead>
                    <TableHead className="text-white">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Aucun utilisateur PRO trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProUsers.map(user => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>{user.cycle_name || '-'}</TableCell>
                        <TableCell>{user.admin_name || '-'}</TableCell>
                        <TableCell>
                          {user.pro_expiry ? new Date(user.pro_expiry).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.pro_expiry)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white">Utilisateur</TableHead>
                    <TableHead className="text-white">Forfait</TableHead>
                    <TableHead className="text-white">Montant</TableHead>
                    <TableHead className="text-white">Méthode</TableHead>
                    <TableHead className="text-white">Référence</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Aucune transaction trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <TableRow key={transaction.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.user?.full_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{transaction.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{transaction.plan?.name || '-'}</TableCell>
                        <TableCell className="font-bold">{transaction.amount?.toLocaleString()} FCFA</TableCell>
                        <TableCell>{transaction.payment_method || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{transaction.reference || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllSubscriptionsManagement;