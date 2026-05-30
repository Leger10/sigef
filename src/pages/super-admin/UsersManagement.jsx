// src/pages/super-admin/UsersManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { 
  Search, Trash2, RefreshCw, AlertCircle, Loader2, 
  Layers, UserPlus, Crown, Edit, Ban, Unlock, UserCheck, ArrowLeftRight,
  Users, ChevronDown, ChevronUp, Calendar as CalendarIcon,
  Download, Eye, Building2, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const UsersManagement = ({ initialRoleFilter = 'all' }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cyclesMap, setCyclesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, user: null });
  const [assignCycleDialog, setAssignCycleDialog] = useState({ isOpen: false, user: null, targetCycleId: '' });
  const [changeRoleDialog, setChangeRoleDialog] = useState({ isOpen: false, user: null, newRole: '' });
  const [editDialog, setEditDialog] = useState({ isOpen: false, user: null });
  const [blockDialog, setBlockDialog] = useState({ isOpen: false, user: null });
  const [transferDialog, setTransferDialog] = useState({ isOpen: false, user: null, targetAdminId: '', targetCycleId: '' });
  const [viewDialog, setViewDialog] = useState({ isOpen: false, user: null });
  
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cycle_id: '',
    pro_status: false
  });

  const [targetAdminCycles, setTargetAdminCycles] = useState([]);

  const ROOT_SUPER_ADMIN_EMAIL = 'digihouse10@gmail.com';

  // Charger tous les cycles
  const loadAllCycles = async () => {
    try {
      const { data, error } = await supabase.from('cycles').select('id, name, admin_id');
      if (!error && data) {
        setCycles(data);
        const map = {};
        data.forEach(cycle => { map[cycle.id] = cycle.name; });
        setCyclesMap(map);
      }
    } catch (err) {
      console.error('Error loading cycles:', err);
    }
  };

  // Charger les admins pour le filtre et le transfert
  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('role', ['admin', 'super_admin'])
        .order('full_name');
      if (!error && data) setAdmins(data);
    } catch (err) {
      console.error('Error loading admins:', err);
    }
  };

  // Charger les cycles d'un admin spécifique (pour transfert)
  const loadAdminCycles = async (adminId) => {
    if (!adminId) return [];
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, description')
        .eq('admin_id', adminId)
        .eq('is_active', true);
      if (!error && data) return data;
      return [];
    } catch (err) {
      console.error('Error loading admin cycles:', err);
      return [];
    }
  };

  // Récupérer les utilisateurs avec leurs abonnements
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let usersQuery = supabase
        .from('users')
        .select('id, email, full_name, phone, role, pro_status, pro_expiry, cycle_id, admin_id, created_at, updated_at, is_blocked')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        usersQuery = usersQuery.eq('role', roleFilter);
      }

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const { data: cyclesData } = await supabase.from('cycles').select('id, name, admin_id');
      const cyclesMapData = new Map();
      if (cyclesData) cyclesData.forEach(c => cyclesMapData.set(c.id, { name: c.name, admin_id: c.admin_id }));

      const { data: adminsData } = await supabase.from('users').select('id, full_name, email').in('role', ['admin', 'super_admin']);
      const adminsMap = new Map();
      if (adminsData) adminsData.forEach(a => adminsMap.set(a.id, a));

      const enrichedUsers = await Promise.all((usersData || []).map(async (user) => {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*, plan:plan_id(id, name, duration_days, price)')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const latestTransaction = transactions?.[0];
        const plan = latestTransaction?.plan;
        let expiryDate = user.pro_expiry;
        if (!expiryDate && latestTransaction && plan) {
          expiryDate = new Date(latestTransaction.created_at);
          expiryDate.setDate(expiryDate.getDate() + (plan.duration_days || 30));
          expiryDate = expiryDate.toISOString();
        }
        
        const cycle = cyclesMapData.get(user.cycle_id);
        const admin = adminsMap.get(user.admin_id);
        return {
          ...user,
          cycle_name: cycle?.name || null,
          admin_name: admin?.full_name || admin?.email || null,
          is_assigned: user.admin_id !== null,
          has_assigned_cycles: false,
          subscription_end_date: expiryDate,
          subscription_plan: plan?.name || null,
          transaction_amount: latestTransaction?.amount || null,
          subscription_status: expiryDate ? (new Date(expiryDate) > new Date() ? 'active' : 'expired') : 'no_subscription',
          subscription_days_left: expiryDate ? Math.ceil((new Date(expiryDate) - new Date()) / (1000*60*60*24)) : null
        };
      }));

      for (const user of enrichedUsers.filter(u => u.role === 'admin')) {
        const { data: adminCycles } = await supabase
          .from('admin_cycles')
          .select('cycle_id')
          .eq('admin_id', user.id);
        user.has_assigned_cycles = adminCycles && adminCycles.length > 0;
      }

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('[UsersManagement] Error:', err);
      setError(err.message || 'Erreur lors du chargement');
      toast.error('Impossible de charger la liste des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const handleDelete = async () => {
    if (!deleteDialog.user) return;

    const userToDelete = deleteDialog.user;
    const currentUserEmail = currentUser?.email?.toLowerCase().trim();
    const rootEmail = ROOT_SUPER_ADMIN_EMAIL.toLowerCase().trim();
    const isRoot = currentUserEmail === rootEmail;

    // 1. Empêcher l'auto-suppression
    if (userToDelete.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      setDeleteDialog({ isOpen: false, user: null });
      return;
    }

    // 2. Vérification spécifique pour la suppression des super-admins
    if (userToDelete.role === 'super_admin') {
      if (!isRoot) {
        toast.error('Vous n’avez pas l’autorisation de supprimer un super administrateur.');
        setDeleteDialog({ isOpen: false, user: null });
        return;
      }
    }

    // 3. (Optionnel) Protection supplémentaire : empêcher qu'un autre super-admin supprime le root
    // (Déjà couvert par le cas précédent car le root est super_admin)
    if (userToDelete.email?.toLowerCase().trim() === rootEmail && !isRoot) {
      toast.error('Vous ne pouvez pas supprimer le super administrateur principal.');
      setDeleteDialog({ isOpen: false, user: null });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
      if (error) throw error;
      toast.success('Utilisateur supprimé');
      await fetchUsers();
      await loadAdmins();
      setDeleteDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignCycle = async () => {
    if (!assignCycleDialog.user || !assignCycleDialog.targetCycleId) {
      toast.error('Veuillez sélectionner un cycle');
      return;
    }
    setUpdating(true);
    try {
      const user = assignCycleDialog.user;
      const targetCycleId = assignCycleDialog.targetCycleId;
      const targetCycle = cycles.find(c => c.id === targetCycleId);
      
      if (user.role === 'admin') {
        const { error } = await supabase.from('admin_cycles').insert({ admin_id: user.id, cycle_id: targetCycleId });
        if (error) throw error;
        toast.success(`${user.full_name} assigné au cycle "${targetCycle?.name}"`);
      } else {
        const cycleAdminId = targetCycle?.admin_id;
        if (!cycleAdminId) {
          toast.error('Ce cycle n\'a pas d\'administrateur associé');
          return;
        }
        const { error } = await supabase
          .from('users')
          .update({ cycle_id: targetCycleId, admin_id: cycleAdminId })
          .eq('id', user.id);
        if (error) throw error;
        toast.success(`${user.full_name} assigné au cycle "${targetCycle?.name}"`);
      }
      setAssignCycleDialog({ isOpen: false, user: null, targetCycleId: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeRole = async () => {
    if (!changeRoleDialog.user || !changeRoleDialog.newRole) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('users').update({ role: changeRoleDialog.newRole }).eq('id', changeRoleDialog.user.id);
      if (error) throw error;
      const roleLabels = { admin: 'Administrateur', formateur: 'Formateur', apprenant: 'Apprenant', super_admin: 'Super Admin' };
      toast.success(`${changeRoleDialog.user.full_name} est maintenant ${roleLabels[changeRoleDialog.newRole]}`);
      if (changeRoleDialog.newRole === 'admin') toast.info('N\'oubliez pas d\'assigner des cycles', { duration: 5000 });
      setChangeRoleDialog({ isOpen: false, user: null, newRole: '' });
      fetchUsers();
      loadAdmins();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du changement de rôle');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (user, e) => {
    if (e) e.stopPropagation();
    console.log('Opening edit for:', user.email);
    setEditFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      cycle_id: user.cycle_id || '',
      pro_status: user.pro_status || false
    });
    setEditDialog({ isOpen: true, user });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editDialog.user) return;
    setUpdating(true);
    try {
      const updateData = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        cycle_id: editFormData.cycle_id || null,
        pro_status: editFormData.pro_status,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editDialog.user.id);
      if (error) throw error;
      toast.success('Utilisateur modifié');
      setEditDialog({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la modification');
    } finally {
      setUpdating(false);
    }
  };

  const toggleBlockUser = async () => {
    if (!blockDialog.user) return;
    setUpdating(true);
    try {
      const newStatus = !blockDialog.user.is_blocked;
      const { error } = await supabase.from('users').update({ is_blocked: newStatus }).eq('id', blockDialog.user.id);
      if (error) throw error;
      toast.success(newStatus ? 'Compte bloqué' : 'Compte débloqué');
      fetchUsers();
      setBlockDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du changement');
    } finally {
      setUpdating(false);
    }
  };

  const openTransferModal = (user) => {
    setTransferDialog({ isOpen: true, user, targetAdminId: '', targetCycleId: '' });
  };

  const handleTransfer = async () => {
    if (!transferDialog.user || !transferDialog.targetAdminId || !transferDialog.targetCycleId) {
      toast.error('Veuillez sélectionner un admin et un cycle cible');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.from('users').update({
        admin_id: transferDialog.targetAdminId,
        cycle_id: transferDialog.targetCycleId
      }).eq('id', transferDialog.user.id);
      if (error) throw error;
      toast.success(`${transferDialog.user.full_name} a été transféré`);
      setTransferDialog({ isOpen: false, user: null, targetAdminId: '', targetCycleId: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du transfert');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (transferDialog.targetAdminId) {
        const cyclesList = await loadAdminCycles(transferDialog.targetAdminId);
        setTargetAdminCycles(cyclesList);
      } else {
        setTargetAdminCycles([]);
      }
    };
    load();
  }, [transferDialog.targetAdminId]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate) - new Date()) / (1000*60*60*24));
  };

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin?.full_name || admin?.email || 'Non assigné';
  };

  const exportToExcel = () => {
    const exportData = filteredUsers.map(user => ({
      'Nom complet': user.full_name || '-',
      'Email': user.email,
      'Téléphone': user.phone || '-',
      'Rôle': user.role === 'apprenant' ? 'Apprenant' : user.role === 'formateur' ? 'Formateur' : user.role === 'admin' ? 'Admin' : 'Super Admin',
      'Centre': getAdminName(user.admin_id),
      'Cycle': user.cycle_name || '-',
      'Statut PRO': user.pro_status ? 'Oui' : 'Non',
      'Statut abonnement': user.subscription_status === 'active' ? 'Actif' : user.subscription_status === 'expired' ? 'Expiré' : 'Non abonné',
      'Jours restants': user.subscription_days_left || '-',
      'Date expiration': user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('fr-FR') : '-',
      'Date création': new Date(user.created_at).toLocaleDateString('fr-FR')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    XLSX.writeFile(wb, `utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export Excel réussi');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCycle = cycleFilter === 'all' || user.cycle_id === cycleFilter;
    const matchesAdmin = adminFilter === 'all' || user.admin_id === adminFilter;
    let matchesSubscription = true;
    if (subscriptionFilter === 'active') matchesSubscription = user.subscription_status === 'active';
    if (subscriptionFilter === 'expired') matchesSubscription = user.subscription_status === 'expired';
    if (subscriptionFilter === 'no_subscription') matchesSubscription = user.subscription_status === 'no_subscription';
    let matchesStatus = true;
    if (statusFilter === 'blocked') matchesStatus = user.is_blocked === true;
    if (statusFilter === 'active') matchesStatus = user.is_blocked === false;
    return matchesSearch && matchesCycle && matchesAdmin && matchesSubscription && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'subscription_end_date') { aVal = a.subscription_end_date || '9999-12-31'; bVal = b.subscription_end_date || '9999-12-31'; }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const stats = {
    total: filteredUsers.length,
    apprenants: filteredUsers.filter(u => u.role === 'apprenant').length,
    formateurs: filteredUsers.filter(u => u.role === 'formateur').length,
    admins: filteredUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    proActifs: filteredUsers.filter(u => u.pro_status === true).length,
    abonnementsActifs: filteredUsers.filter(u => u.subscription_status === 'active').length
  };

  // Chargement initial + souscription Realtime
  useEffect(() => {
    fetchUsers();
    loadAdmins();
    loadAllCycles();

    // Souscription Realtime pour détecter les changements sur la table users
    const subscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        console.log('Changement détecté sur users, rechargement...');
        fetchUsers();
        loadAdmins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roleFilter]); // Recharger quand le filtre de rôle change, mais la souscription reste active

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-6 bg-destructive/10 rounded-2xl"><h3 className="font-bold">Erreur</h3><p>{error}</p><Button variant="outline" onClick={fetchUsers} className="mt-2">Réessayer</Button></div>;

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
              <Users className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">Apprenants</p><p className="text-2xl font-bold text-green-600">{stats.apprenants}</p></div>
              <Users className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">Formateurs</p><p className="text-2xl font-bold text-purple-600">{stats.formateurs}</p></div>
              <Users className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">PRO Actifs</p><p className="text-2xl font-bold text-amber-600">{stats.proActifs}</p></div>
              <Crown className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">Abonnements actifs</p><p className="text-2xl font-bold text-emerald-600">{stats.abonnementsActifs}</p></div>
              <CalendarIcon className="h-8 w-8 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div><p className="text-xs text-muted-foreground">Admins</p><p className="text-2xl font-bold text-red-600">{stats.admins}</p></div>
              <Users className="h-8 w-8 text-red-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Rôle" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="apprenant">Apprenants</SelectItem><SelectItem value="formateur">Formateurs</SelectItem><SelectItem value="admin">Admins</SelectItem><SelectItem value="super_admin">Super Admins</SelectItem></SelectContent></Select>
            <Select value={adminFilter} onValueChange={setAdminFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Centre" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les centres</SelectItem>{admins.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}</SelectContent></Select>
            <Button variant="outline" onClick={exportToExcel} className="gap-2"><Download className="h-4 w-4" />Excel</Button>
            <Button variant="outline" onClick={fetchUsers} className="gap-2"><RefreshCw className="h-4 w-4" />Rafraîchir</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut abonnement" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="active">Actif</SelectItem><SelectItem value="expired">Expiré</SelectItem><SelectItem value="no_subscription">Non abonné</SelectItem></SelectContent></Select>
            <Select value={cycleFilter} onValueChange={setCycleFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Cycle" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut compte" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="active">Actifs</SelectItem><SelectItem value="blocked">Bloqués</SelectItem></SelectContent></Select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-black">
            <TableRow>
              <TableHead className="text-white cursor-pointer" onClick={() => handleSort('full_name')}>Nom & Email {sortField === 'full_name' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}</TableHead>
              <TableHead className="text-white">Centre</TableHead>
              <TableHead className="text-white">Rôle</TableHead>
              <TableHead className="text-white">Cycle</TableHead>
              <TableHead className="text-white">PRO</TableHead>
              <TableHead className="text-white cursor-pointer" onClick={() => handleSort('subscription_end_date')}>Expiration abonnement {sortField === 'subscription_end_date' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}</TableHead>
              <TableHead className="text-white">Statut</TableHead>
              <TableHead className="text-white text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Aucun utilisateur</TableCell></TableRow> :
              sortedUsers.map(user => {
                const daysLeft = getDaysLeft(user.subscription_end_date);
                return (
                  <TableRow key={user.id} className={user.is_blocked ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-normal"><Building2 className="h-3 w-3 mr-1" />{getAdminName(user.admin_id)}</Badge></TableCell>
                    <TableCell>
                      <Badge className={
                        user.role === 'apprenant' ? 'bg-green-500/10 text-green-600' :
                        user.role === 'formateur' ? 'bg-blue-500/10 text-blue-600' :
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-600' :
                        'bg-red-500/10 text-red-600'
                      }>
                        {user.role === 'apprenant' ? 'Apprenant' :
                         user.role === 'formateur' ? 'Formateur' :
                         user.role === 'admin' ? 'Admin' : 'Super Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {user.cycle_name || (user.role === 'admin' && !user.has_assigned_cycles ? 'Aucun cycle' : 'Non assigné')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.pro_status ? 
                        <Badge className="bg-amber-500 text-white"><Crown className="w-3 h-3 mr-1" />PRO</Badge> : 
                        <Badge variant="outline">Standard</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      {user.subscription_end_date ? 
                        <div>
                          <div className="flex items-center gap-1 text-sm font-mono"><CalendarIcon className="h-3 w-3" />{new Date(user.subscription_end_date).toLocaleDateString('fr-FR')}</div>
                          {daysLeft > 0 ? <p className="text-xs text-green-600">{daysLeft} jours restants</p> : 
                           daysLeft === 0 ? <p className="text-xs text-orange-600">Expire aujourd'hui</p> : 
                           <p className="text-xs text-red-600">Expiré</p>}
                        </div> : 
                        <span className="text-sm text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell>
                      {user.is_blocked ? 
                        <Badge className="bg-red-500 text-white">Bloqué</Badge> : 
                        <Badge className="bg-green-500 text-white">Actif</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" type="button" onClick={() => setViewDialog({ isOpen: true, user })}><Eye className="w-4 h-4" /></Button>
                        {/* <Button variant="ghost" size="sm" type="button" onClick={(e) => handleEdit(user, e)}><Edit className="w-4 h-4" /></Button> */}
                        <Button variant="ghost" size="sm" type="button" onClick={() => setChangeRoleDialog({ isOpen: true, user, newRole: user.role })}><UserCheck className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setAssignCycleDialog({ isOpen: true, user, targetCycleId: '' })}><Layers className="w-4 h-4" /></Button>
                        {user.role === 'apprenant' && (
                          <Button variant="ghost" size="sm" type="button" onClick={() => openTransferModal(user)}>
                            <ArrowLeftRight className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" type="button" onClick={() => setBlockDialog({ isOpen: true, user })}>
                          {user.is_blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setDeleteDialog({ isOpen: true, user })} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      {/* Dialog Vue détaillée */}
      <Dialog open={viewDialog.isOpen} onOpenChange={open => !open && setViewDialog({ isOpen: false, user: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Détails de l'utilisateur</DialogTitle><DialogDescription>Informations complètes</DialogDescription></DialogHeader>
          {viewDialog.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nom complet</Label><p>{viewDialog.user.full_name || '-'}</p></div>
                <div><Label>Email</Label><p>{viewDialog.user.email}</p></div>
                <div><Label>Téléphone</Label><p>{viewDialog.user.phone || '-'}</p></div>
                <div><Label>Rôle</Label><p>{viewDialog.user.role}</p></div>
                <div><Label>Centre</Label><p>{getAdminName(viewDialog.user.admin_id)}</p></div>
                <div><Label>Cycle</Label><p>{viewDialog.user.cycle_name || '-'}</p></div>
                <div><Label>Statut PRO</Label><p>{viewDialog.user.pro_status ? 'Oui' : 'Non'}</p></div>
                {viewDialog.user.subscription_end_date && (<><div><Label>Expiration abonnement</Label><p>{new Date(viewDialog.user.subscription_end_date).toLocaleDateString('fr-FR')}</p></div><div><Label>Jours restants</Label><p>{getDaysLeft(viewDialog.user.subscription_end_date)} jours</p></div></>)}
                <div><Label>Date création</Label><p>{new Date(viewDialog.user.created_at).toLocaleDateString()}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialog({ isOpen: false, user: null })}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Édition */}
      <Dialog open={editDialog.isOpen} onOpenChange={open => !open && setEditDialog({ isOpen: false, user: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier l'utilisateur</DialogTitle><DialogDescription>Modifier les informations de {editDialog.user?.full_name || editDialog.user?.email}</DialogDescription></DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2"><Label>Nom complet *</Label><Input value={editFormData.full_name} onChange={e => setEditFormData({...editFormData, full_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Cycle de formation</Label>
              <Select value={editFormData.cycle_id || ""} onValueChange={value => setEditFormData({...editFormData, cycle_id: value})}>
                <SelectTrigger><SelectValue placeholder="Aucun cycle" /></SelectTrigger>
                <SelectContent><SelectItem value="">Aucun cycle</SelectItem>{cycles.map(cycle => <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-pro_status" className="cursor-pointer">Abonnement PRO</Label>
              <input id="edit-pro_status" type="checkbox" checked={editFormData.pro_status} onChange={e => setEditFormData({...editFormData, pro_status: e.target.checked})} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog({ isOpen: false, user: null })}>Annuler</Button>
              <Button type="submit" disabled={updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Changement de rôle */}
      <Dialog open={changeRoleDialog.isOpen} onOpenChange={open => !open && setChangeRoleDialog({ isOpen: false, user: null, newRole: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Changer le rôle</DialogTitle><DialogDescription>Utilisateur: <strong>{changeRoleDialog.user?.full_name || changeRoleDialog.user?.email}</strong></DialogDescription></DialogHeader>
          <div className="py-4">
            <Label>Nouveau rôle</Label>
            <Select value={changeRoleDialog.newRole} onValueChange={v => setChangeRoleDialog({...changeRoleDialog, newRole: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent><SelectItem value="apprenant">Apprenant</SelectItem><SelectItem value="formateur">Formateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="super_admin">Super Administrateur</SelectItem></SelectContent>
            </Select>
            {changeRoleDialog.newRole === 'admin' && <p className="text-xs text-amber-600 mt-2">⚠️ N'oubliez pas d'assigner des cycles à ce nouvel administrateur.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialog({ isOpen: false, user: null, newRole: '' })}>Annuler</Button>
            <Button onClick={handleChangeRole} disabled={!changeRoleDialog.newRole || updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assignation cycle */}
      <Dialog open={assignCycleDialog.isOpen} onOpenChange={open => !open && setAssignCycleDialog({ isOpen: false, user: null, targetCycleId: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assigner à un cycle</DialogTitle><DialogDescription>{assignCycleDialog.user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}: <strong>{assignCycleDialog.user?.full_name || assignCycleDialog.user?.email}</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Choisir un cycle</Label>
              <Select value={assignCycleDialog.targetCycleId} onValueChange={v => setAssignCycleDialog({...assignCycleDialog, targetCycleId: v})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{cycles.map(cycle => <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>)}</SelectContent>
              </Select>
              {cycles.length === 0 && <p className="text-xs text-amber-600">Aucun cycle disponible. Créez d'abord un cycle.</p>}
              {assignCycleDialog.user?.role === 'admin' && <p className="text-xs text-muted-foreground">Un administrateur peut être assigné à plusieurs cycles.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignCycleDialog({ isOpen: false, user: null, targetCycleId: '' })}>Annuler</Button>
            <Button onClick={handleAssignCycle} disabled={!assignCycleDialog.targetCycleId || updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assigner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Transfert d'apprenant */}
      <Dialog open={transferDialog.isOpen} onOpenChange={open => !open && setTransferDialog({ isOpen: false, user: null, targetAdminId: '', targetCycleId: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transférer vers un autre admin</DialogTitle><DialogDescription>Transférer <strong>{transferDialog.user?.full_name || transferDialog.user?.email}</strong> vers un autre centre.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Admin cible *</Label>
              <Select value={transferDialog.targetAdminId} onValueChange={v => setTransferDialog({...transferDialog, targetAdminId: v, targetCycleId: ''})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{admins.filter(a => a.id !== transferDialog.user?.admin_id).map(admin => (<SelectItem key={admin.id} value={admin.id}>{admin.full_name || admin.email}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {transferDialog.targetAdminId && (
              <div className="space-y-2">
                <Label>Cycle cible *</Label>
                <Select value={transferDialog.targetCycleId} onValueChange={v => setTransferDialog({...transferDialog, targetCycleId: v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{targetAdminCycles.map(cycle => <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>)}</SelectContent>
                </Select>
                {targetAdminCycles.length === 0 && <p className="text-xs text-amber-600">Cet admin n'a pas encore de cycles.</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ isOpen: false, user: null, targetAdminId: '', targetCycleId: '' })}>Annuler</Button>
            <Button onClick={handleTransfer} disabled={!transferDialog.targetAdminId || !transferDialog.targetCycleId || updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Blocage */}
      <Dialog open={blockDialog.isOpen} onOpenChange={open => !open && setBlockDialog({ isOpen: false, user: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{blockDialog.user?.is_blocked ? 'Débloquer' : 'Bloquer'} l'utilisateur</DialogTitle><DialogDescription>{blockDialog.user?.is_blocked ? `Débloquer ${blockDialog.user?.full_name} ?` : `Bloquer ${blockDialog.user?.full_name} ?`}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ isOpen: false, user: null })}>Annuler</Button>
            <Button onClick={toggleBlockUser} disabled={updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={open => !open && setDeleteDialog({ isOpen: false, user: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Supprimer l'utilisateur</DialogTitle><DialogDescription>Supprimer définitivement <strong>{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong> ? Cette action est irréversible.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, user: null })}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={updating}>{updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;