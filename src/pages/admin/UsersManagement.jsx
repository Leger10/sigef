// src/pages/admin/UsersManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, Crown, ShieldAlert, RefreshCw, AlertCircle, 
  Loader2, Layers, UserPlus, Download, FileText, FileSpreadsheet,
  Calendar, Clock, Mail, Phone, Eye, Edit, X, CheckCircle, AlertTriangle,
  Users, UserCheck, UserX, Ban, Unlock, Shield, Power, PowerOff, RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Fonction utilitaire pour nettoyer le nom du cycle (enlève les préfixes bizarres)
const cleanCycleName = (name) => {
  if (!name) return 'Non assigné';
  // Supprime les caractères non alphabétiques au début jusqu'à rencontrer une lettre
  const cleaned = name.replace(/^[^a-zA-ZÀ-ÿ]+/, '');
  return cleaned || name;
};

const UsersManagement = ({ cycleId: propCycleId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cyclesMap, setCyclesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalApprenants, setTotalApprenants] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cycleFilter, setCycleFilter] = useState(propCycleId || 'all');
  const [proFilter, setProFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('apprenant');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, user: null });
  const [assignDialog, setAssignDialog] = useState({ isOpen: false, user: null, targetCycleId: '' });
  const [viewDialog, setViewDialog] = useState({ isOpen: false, user: null });
  const [blockDialog, setBlockDialog] = useState({ isOpen: false, user: null });
  const [renewDialog, setRenewDialog] = useState({ isOpen: false, user: null, durationMonths: 1 });
  const [reactivateDialog, setReactivateDialog] = useState({ isOpen: false, user: null, durationMonths: 1 });
  const [editDialog, setEditDialog] = useState({ isOpen: false, user: null });
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' });

  const fetchAdminCycles = async () => {
    try {
      const { data: myCycles, error: myCyclesError } = await supabase
        .from('cycles')
        .select('id, name')
        .eq('admin_id', currentUser?.id);
      
      const { data: defaultCycles, error: defaultCyclesError } = await supabase
        .from('cycles')
        .select('id, name')
        .eq('is_default', true);
      
      const allCycles = [...(myCycles || []), ...(defaultCycles || [])];
      const uniqueCycles = Array.from(new Map(allCycles.map(c => [c.id, c])).values());
      
      setCycles(uniqueCycles);
      
      const map = {};
      uniqueCycles.forEach(cycle => {
        map[cycle.id] = cycle.name;
      });
      setCyclesMap(map);
      
      return uniqueCycles;
    } catch (err) {
      console.error('Error fetching admin cycles:', err);
      return [];
    }
  };

  const getSubscriptionDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const endDate = new Date(expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const getSubscriptionStatus = (expiryDate) => {
    if (!expiryDate) return 'no_subscription';
    const daysLeft = getSubscriptionDaysLeft(expiryDate);
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 7) return 'expiring_soon';
    return 'active';
  };

  const handleDeactivateSubscription = async (user) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          pro_status: false,
          pro_expiry: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Abonnement PRO de ${user.full_name} désactivé`);
      fetchUsers();
      setViewDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error('Error deactivating subscription:', err);
      toast.error('Erreur lors de la désactivation');
    } finally {
      setUpdating(false);
    }
  };

  const handleReactivateSubscription = async (user, durationMonths) => {
    setUpdating(true);
    try {
      const daysToAdd = durationMonths * 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysToAdd);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          pro_status: true,
          pro_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Abonnement PRO de ${user.full_name} réactivé pour ${durationMonths} mois`);
      fetchUsers();
      setReactivateDialog({ isOpen: false, user: null, durationMonths: 1 });
      setViewDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      toast.error('Erreur lors de la réactivation');
    } finally {
      setUpdating(false);
    }
  };

  const handleRenewSubscription = async (user, durationMonths) => {
    setUpdating(true);
    try {
      const daysToAdd = durationMonths * 30;
      const currentExpiry = user.pro_expiry ? new Date(user.pro_expiry) : new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + daysToAdd);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          pro_status: true,
          pro_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Abonnement PRO de ${user.full_name} renouvelé pour ${durationMonths} mois supplémentaires`);
      fetchUsers();
      setRenewDialog({ isOpen: false, user: null, durationMonths: 1 });
      setViewDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error('Error renewing subscription:', err);
      toast.error('Erreur lors du renouvellement');
    } finally {
      setUpdating(false);
    }
  };

  const handleActivateSubscription = async (user, durationMonths) => {
    setUpdating(true);
    try {
      const daysToAdd = durationMonths * 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysToAdd);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          pro_status: true,
          pro_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Abonnement PRO de ${user.full_name} activé pour ${durationMonths} mois`);
      fetchUsers();
      setReactivateDialog({ isOpen: false, user: null, durationMonths: 1 });
      setViewDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error('Error activating subscription:', err);
      toast.error('Erreur lors de l\'activation');
    } finally {
      setUpdating(false);
    }
  };

  const toggleBlockUser = async (user) => {
    setUpdating(user.id);
    try {
      const newStatus = !user.is_blocked;
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: newStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success(newStatus ? 'Compte bloqué' : 'Compte débloqué');
      fetchUsers();
    } catch (err) {
      console.error('Error toggling block:', err);
      toast.error('Erreur lors du changement');
    } finally {
      setUpdating(null);
      setBlockDialog({ isOpen: false, user: null });
    }
  };

  const handleUpdateUser = async () => {
    if (!editDialog.user) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', editDialog.user.id);
      if (error) throw error;
      toast.success('Utilisateur mis à jour avec succès');
      fetchUsers();
      setEditDialog({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const adminCycles = await fetchAdminCycles();
      const adminCycleIds = adminCycles.map(c => c.id);
      
      let usersQuery = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        usersQuery = usersQuery.eq('role', roleFilter);
      } else {
        usersQuery = usersQuery.eq('role', 'apprenant');
      }

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const filteredByCycles = (usersData || []).filter(user => {
        if (user.cycle_id && adminCycleIds.includes(user.cycle_id)) return true;
        if (user.admin_id === currentUser?.id) return true;
        if (isSuperAdmin) return true;
        return false;
      });

      const enrichedUsers = filteredByCycles.map(user => {
        const expiryDate = user.pro_expiry;
        const subscriptionStatus = getSubscriptionStatus(expiryDate);
        const daysLeft = getSubscriptionDaysLeft(expiryDate);
        
        return {
          ...user,
          cycle_name: cyclesMap[user.cycle_id] || null,
          is_assigned: user.admin_id !== null,
          subscription_status: subscriptionStatus,
          subscription_days_left: daysLeft,
          subscription_end_date: expiryDate,
          is_blocked: user.is_blocked || false,
          is_pro_activated: user.pro_status === true
        };
      });

      setUsers(enrichedUsers);
      
      const total = enrichedUsers.filter(u => u.role === 'apprenant').length;
      setTotalApprenants(total);
      
    } catch (err) {
      console.error('[UsersManagement] Error:', err);
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
      toast.error('Impossible de charger la liste des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial + souscription Realtime
  useEffect(() => {
    if (currentUser?.id) {
      fetchUsers();

      const subscription = supabase
        .channel('users-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          console.log('Changement détecté sur users, rechargement...');
          fetchUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [roleFilter, cycleFilter, currentUser?.id, isSuperAdmin]);

  const handleDelete = async () => {
    if (!deleteDialog.user) return;
    
    const userToDelete = deleteDialog.user;
    
    if (userToDelete.role === 'super_admin' || userToDelete.role === 'admin') {
      toast.error('Vous n’avez pas l’autorisation de supprimer ce compte.');
      setDeleteDialog({ isOpen: false, user: null });
      return;
    }
    
    if (userToDelete.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      setDeleteDialog({ isOpen: false, user: null });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      toast.success('Utilisateur supprimé avec succès.');
      fetchUsers();
    } catch (err) {
      console.error('[UsersManagement] Delete error:', err);
      toast.error('Impossible de supprimer l\'utilisateur.');
    } finally {
      setDeleteDialog({ isOpen: false, user: null });
    }
  };

  const handleAssign = async () => {
    if (!assignDialog.user || !assignDialog.targetCycleId) {
      toast.error('Veuillez sélectionner un cycle');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          cycle_id: assignDialog.targetCycleId,
          admin_id: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignDialog.user.id);

      if (error) throw error;

      toast.success(`${assignDialog.user.full_name} a été assigné au cycle avec succès.`);
      setAssignDialog({ isOpen: false, user: null, targetCycleId: '' });
      fetchUsers();
    } catch (err) {
      console.error('[UsersManagement] Assign error:', err);
      toast.error('Erreur lors de l\'assignation');
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const exportData = filteredUsers.map(user => ({
        // 'Matricule': user.matricule || '-',
        'Nom complet': user.full_name || '-',
        'Email': user.email,
        'Téléphone': user.phone || '-',
        'Cycle': cleanCycleName(user.cycle_name) || 'Non assigné',
        'Statut PRO': user.pro_status ? 'PRO Actif' : 'PRO Désactivé',
        'Statut abonnement': user.subscription_status === 'active' ? 'Actif' :
                            user.subscription_status === 'expiring_soon' ? 'Expire bientôt' :
                            user.subscription_status === 'expired' ? 'Expiré' : 'Non abonné',
        'Date expiration': user.subscription_end_date ? 
          new Date(user.subscription_end_date).toLocaleDateString('fr-FR') : '-',
        'Jours restants': user.subscription_days_left ? `${user.subscription_days_left} jours` : '-',
        'Statut compte': user.is_blocked ? 'Bloqué' : 'Actif',
        'Date création': new Date(user.created_at).toLocaleDateString('fr-FR')
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
        { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
      XLSX.writeFile(wb, `utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Export Excel réussi');
    } catch (error) {
      console.error('Erreur export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      // Titre
      doc.setFontSize(16);
      doc.text('Liste des utilisateurs', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 14, 25);
      doc.text(`Total: ${filteredUsers.length} utilisateur(s)`, 14, 32);
      
      // Colonnes : on retire "Matricule"
      const headers = [
        'Nom complet', 'Email', 'Téléphone', 'Cycle',
        'PRO', 'Statut abonnement', 'Date expiration', 'Statut compte'
      ];
      
      const rows = filteredUsers.map(user => [
        user.full_name?.substring(0, 30) || '-',
        user.email?.substring(0, 35) || '-',
        user.phone || '-',
        cleanCycleName(user.cycle_name) || 'Non assigné',
        user.pro_status ? 'PRO' : 'Standard',
        user.subscription_status === 'active' ? 'Actif' : 
          user.subscription_status === 'expiring_soon' ? 'Expire bientôt' :
          user.subscription_status === 'expired' ? 'Expiré' : 'Non abonné',
        user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('fr-FR') : '-',
        user.is_blocked ? 'Bloqué' : 'Actif'
      ]);
      
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 40 }, // Nom complet
          1: { cellWidth: 50 }, // Email
          2: { cellWidth: 25 }, // Téléphone
          3: { cellWidth: 35 }, // Cycle (nettoyé)
          4: { cellWidth: 15 }, // PRO
          5: { cellWidth: 30 }, // Statut abonnement
          6: { cellWidth: 25 }, // Date expiration
          7: { cellWidth: 20 }  // Statut compte
        },
        margin: { left: 10, right: 10 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`utilisateurs_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Export PDF réussi');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('Erreur lors de l\'export PDF : ' + (error.message || 'Vérifiez jspdf-autotable'));
    } finally {
      setExporting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCycle = cycleFilter === 'all' || user.cycle_id === cycleFilter;
    
    let matchesPro = true;
    if (proFilter === 'pro') matchesPro = user.pro_status === true;
    if (proFilter === 'standard') matchesPro = !user.pro_status;

    let matchesStatus = true;
    if (statusFilter === 'assigned') matchesStatus = user.is_assigned === true;
    if (statusFilter === 'unassigned') matchesStatus = user.is_assigned === false;
    if (statusFilter === 'blocked') matchesStatus = user.is_blocked === true;
    if (statusFilter === 'active_account') matchesStatus = user.is_blocked === false;

    let matchesSubscription = true;
    if (subscriptionFilter === 'active') matchesSubscription = user.subscription_status === 'active';
    if (subscriptionFilter === 'expiring_soon') matchesSubscription = user.subscription_status === 'expiring_soon';
    if (subscriptionFilter === 'expired') matchesSubscription = user.subscription_status === 'expired';
    if (subscriptionFilter === 'no_subscription') matchesSubscription = user.subscription_status === 'no_subscription';
    if (subscriptionFilter === 'deactivated') matchesSubscription = user.pro_status === false && user.subscription_end_date === null;

    return matchesSearch && matchesCycle && matchesPro && matchesStatus && matchesSubscription;
  });

  const getSubscriptionBadge = (user) => {
    const status = user.subscription_status;
    const daysLeft = user.subscription_days_left;
    
    if (!user.pro_status && !user.subscription_end_date) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">Désactivé</Badge>;
    }
    
    if (!user.subscription_end_date && user.pro_status === false) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">Non abonné</Badge>;
    }
    
    if (status === 'active') {
      return <Badge className="bg-green-500 text-white border-none">Actif ({daysLeft}j)</Badge>;
    }
    
    if (status === 'expiring_soon') {
      return <Badge className="bg-orange-500 text-white border-none">Expire dans {daysLeft}j</Badge>;
    }
    
    if (status === 'expired') {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    
    return <Badge variant="outline">-</Badge>;
  };

  const roleOptions = isSuperAdmin 
    ? [
        { value: 'apprenant', label: 'Apprenants' },
        { value: 'formateur', label: 'Formateurs' },
        { value: 'admin', label: 'Administrateurs' },
      ]
    : [
        { value: 'apprenant', label: 'Apprenants' },
        { value: 'formateur', label: 'Formateurs' },
      ];

  const statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'assigned', label: 'Assignés' },
    { value: 'unassigned', label: 'Non assignés' },
    { value: 'active_account', label: 'Comptes actifs' },
    { value: 'blocked', label: 'Comptes bloqués' },
  ];

  const stats = {
    total: filteredUsers.length,
    activeSubscriptions: filteredUsers.filter(u => u.subscription_status === 'active').length,
    expiringSoon: filteredUsers.filter(u => u.subscription_status === 'expiring_soon').length,
    expired: filteredUsers.filter(u => u.subscription_status === 'expired').length,
    noSubscription: filteredUsers.filter(u => u.subscription_status === 'no_subscription').length,
    deactivated: filteredUsers.filter(u => !u.pro_status && !u.subscription_end_date).length,
    proUsers: users.filter(u => u.pro_status === true).length,
    blockedUsers: users.filter(u => u.is_blocked === true).length
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Erreur de chargement</h3>
            <p className="text-sm opacity-90">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchUsers} className="mt-2">
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('all'); setSubscriptionFilter('all'); setProFilter('all'); setStatusFilter('all'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Total Apprenants</p><p className="text-2xl font-bold">{stats.total}</p></div>
              <Users className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('active'); setSubscriptionFilter('active'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Abonnements Actifs</p><p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p></div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('expiring'); setSubscriptionFilter('expiring_soon'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Expire bientôt</p><p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p></div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('expired'); setSubscriptionFilter('expired'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Expirés</p><p className="text-2xl font-bold text-red-600">{stats.expired}</p></div>
              <X className="h-8 w-8 text-red-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deuxième ligne de stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('pro'); setProFilter('pro'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">PRO Actifs</p><p className="text-2xl font-bold text-amber-600">{stats.proUsers}</p></div>
              <Crown className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('no_subscription'); setSubscriptionFilter('no_subscription'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Non abonnés</p><p className="text-2xl font-bold text-gray-600">{stats.noSubscription}</p></div>
              <UserX className="h-8 w-8 text-gray-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('deactivated'); setSubscriptionFilter('deactivated'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Désactivés</p><p className="text-2xl font-bold text-purple-600">{stats.deactivated}</p></div>
              <PowerOff className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 cursor-pointer hover:shadow-md transition-all" onClick={() => { setActiveTab('blocked'); setStatusFilter('blocked'); }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Comptes bloqués</p><p className="text-2xl font-bold text-pink-600">{stats.blockedUsers}</p></div>
              <Ban className="h-8 w-8 text-pink-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {(stats.expiringSoon > 0 || stats.expired > 0) && (
        <div className="space-y-2">
          {stats.expiringSoon > 0 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /><span className="text-sm text-orange-600">{stats.expiringSoon} abonnement(s) expirent dans moins de 7 jours</span></div>
              <Button variant="outline" size="sm" onClick={() => { setSubscriptionFilter('expiring_soon'); setActiveTab('expiring'); }} className="border-orange-500 text-orange-600 hover:bg-orange-500/10">Voir</Button>
            </div>
          )}
          {stats.expired > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2"><X className="w-5 h-5 text-red-500" /><span className="text-sm text-red-600">{stats.expired} abonnement(s) ont expiré</span></div>
              <Button variant="outline" size="sm" onClick={() => { setSubscriptionFilter('expired'); setActiveTab('expired'); }} className="border-red-500 text-red-600 hover:bg-red-500/10">Voir</Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl border shadow-sm items-start xl:items-center">
        <div>
          <h2 className="text-xl font-bold">Gestion des Utilisateurs</h2>
          <p className="text-sm text-muted-foreground">Total apprenants: <span className="font-bold text-primary">{totalApprenants}</span> | Affichés: {filteredUsers.length} utilisateur(s)</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <Button variant="outline" size="icon" onClick={fetchUsers} title="Rafraîchir"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={exporting} className="gap-2"><FileSpreadsheet className="w-4 h-4 text-green-600" />Excel</Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={exporting} className="gap-2"><FileText className="w-4 h-4 text-red-600" />PDF</Button>
          <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[140px] bg-background"><SelectValue placeholder="Rôle" /></SelectTrigger><SelectContent>{roleOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Chercher par nom, email, téléphone, matricule..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-background" /></div>
          {cycles.length > 0 && (<Select value={cycleFilter} onValueChange={setCycleFilter}><SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Tous les cycles" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les cycles</SelectItem>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>)}
          {roleFilter === 'apprenant' && (
            <>
              <Select value={proFilter} onValueChange={setProFilter}><SelectTrigger className="w-[140px] bg-background"><SelectValue placeholder="Statut PRO" /></SelectTrigger><SelectContent><SelectItem value="all">Tous statuts</SelectItem><SelectItem value="pro">Abonnés PRO</SelectItem><SelectItem value="standard">Standard</SelectItem></SelectContent></Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}><SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Statut abonnement" /></SelectTrigger><SelectContent><SelectItem value="all">Tous abonnements</SelectItem><SelectItem value="active">Actif</SelectItem><SelectItem value="expiring_soon">Expire bientôt</SelectItem><SelectItem value="expired">Expiré</SelectItem><SelectItem value="no_subscription">Non abonné</SelectItem><SelectItem value="deactivated">Désactivé</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Statut compte" /></SelectTrigger><SelectContent>{statusOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
            </>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                {/* <TableHead className="text-white">Matricule</TableHead> */}
                <TableHead className="text-white">Nom & Email</TableHead>
                <TableHead className="text-white">Téléphone</TableHead>
                <TableHead className="text-white">Cycle</TableHead>
                <TableHead className="text-white">Statut PRO</TableHead>
                <TableHead className="text-white">Abonnement</TableHead>
                <TableHead className="text-white">Date expiration</TableHead>
                <TableHead className="text-white">Statut</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Aucun utilisateur ne correspond à vos critères.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => {
                  const isPro = user.pro_status;
                  const isProExpired = isPro && user.subscription_status === 'expired';
                  const isDeactivated = !user.pro_status && !user.subscription_end_date;
                  const daysLeft = user.subscription_days_left;
                  const isBlocked = user.is_blocked;
                  
                  return (
                    <TableRow key={user.id} className={`hover:bg-muted/30 ${isBlocked ? 'opacity-60 bg-red-500/5' : ''}`}>
                      <TableCell className="font-mono text-sm">{user.matricule || '-'}</TableCell>
                      <TableCell>
                        <p className="font-bold">{user.full_name || 'Utilisateur'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-mono">{user.phone}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{cleanCycleName(user.cycle_name) || 'Non assigné'}</Badge>
                      </TableCell>
                      <TableCell>
                        {isPro ? (
                          <Badge className={`border-none ${isProExpired ? 'bg-destructive/10 text-destructive' : 'bg-amber-500 text-white'}`}>
                            <Crown className="w-3 h-3 mr-1" /> {isProExpired ? 'PRO Expiré' : 'PRO Actif'}
                          </Badge>
                        ) : isDeactivated ? (
                          <Badge className="bg-gray-500 text-white border-none">
                            <PowerOff className="w-3 h-3 mr-1" /> Désactivé
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal text-muted-foreground">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getSubscriptionBadge(user)}</TableCell>
                      <TableCell>
                        {user.subscription_end_date ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-mono"><Calendar className="w-3 h-3 text-muted-foreground" /><span>{new Date(user.subscription_end_date).toLocaleDateString('fr-FR')}</span></div>
                            {daysLeft !== null && daysLeft > 0 && (<p className={`text-xs flex items-center gap-1 ${daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}><Clock className="w-3 h-3" />{daysLeft} jours restants</p>)}
                            {daysLeft !== null && daysLeft < 0 && (<p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Expiré depuis {Math.abs(daysLeft)} jours</p>)}
                          </div>
                        ) : <span className="text-sm text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {isBlocked ? <Badge className="bg-red-500 text-white">Bloqué</Badge> : <Badge className="bg-green-500 text-white">Actif</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" onClick={() => setViewDialog({ isOpen: true, user })} className="text-blue-500 hover:bg-blue-500/10" title="Voir détails"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setAssignDialog({ isOpen: true, user, targetCycleId: '' })} className="text-primary hover:bg-primary/10" title="Assigner à un cycle" disabled={user.is_assigned}><UserPlus className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setBlockDialog({ isOpen: true, user })} className={isBlocked ? "text-green-500 hover:bg-green-500/10" : "text-destructive hover:bg-destructive/10"} title={isBlocked ? "Débloquer" : "Bloquer"}>{isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}</Button>
                          {isDeactivated && (<Button variant="ghost" size="sm" onClick={() => setReactivateDialog({ isOpen: true, user, durationMonths: 1 })} className="text-green-500 hover:bg-green-500/10" title="Réactiver l'abonnement"><RefreshCcw className="w-4 h-4" /></Button>)}
                          <Button variant="ghost" size="sm" onClick={() => { setEditForm({ full_name: user.full_name || '', email: user.email || '', phone: user.phone || '' }); setEditDialog({ isOpen: true, user }); }} className="text-blue-500 hover:bg-blue-500/10" title="Modifier"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ isOpen: true, user })} title="Supprimer"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog Vue détaillée */}
      <Dialog open={viewDialog.isOpen} onOpenChange={(open) => !open && setViewDialog({ isOpen: false, user: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Détails de l'utilisateur</DialogTitle><DialogDescription>Informations complètes sur l'utilisateur</DialogDescription></DialogHeader>
          {viewDialog.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* <div><Label className="text-muted-foreground">Matricule</Label><p className="font-medium">{viewDialog.user.matricule || '-'}</p></div> */}
                <div><Label className="text-muted-foreground">Nom complet</Label><p className="font-medium">{viewDialog.user.full_name || '-'}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{viewDialog.user.email}</p></div>
                <div><Label className="text-muted-foreground">Téléphone</Label><p className="font-medium">{viewDialog.user.phone || '-'}</p></div>
                <div><Label className="text-muted-foreground">Cycle</Label><p className="font-medium">{cleanCycleName(viewDialog.user.cycle_name) || 'Non assigné'}</p></div>
                <div><Label className="text-muted-foreground">Statut PRO</Label><p className="font-medium">{viewDialog.user.pro_status ? 'Actif' : (!viewDialog.user.pro_status && !viewDialog.user.subscription_end_date ? 'Désactivé' : 'Inactif')}</p></div>
                {viewDialog.user.pro_expiry && (<div><Label className="text-muted-foreground">Expiration PRO</Label><p className="font-medium">{new Date(viewDialog.user.pro_expiry).toLocaleDateString('fr-FR')}</p></div>)}
                <div><Label className="text-muted-foreground">Statut abonnement</Label><p className="font-medium">{viewDialog.user.subscription_status === 'active' ? 'Actif' : viewDialog.user.subscription_status === 'expiring_soon' ? 'Expire bientôt' : viewDialog.user.subscription_status === 'expired' ? 'Expiré' : (!viewDialog.user.pro_status && !viewDialog.user.subscription_end_date ? 'Désactivé' : 'Non abonné')}</p></div>
                {viewDialog.user.subscription_end_date && (<><div><Label className="text-muted-foreground">Date expiration abonnement</Label><p className="font-medium">{new Date(viewDialog.user.subscription_end_date).toLocaleDateString('fr-FR')}</p></div><div><Label className="text-muted-foreground">Jours restants</Label><p className={`font-medium ${viewDialog.user.subscription_days_left <= 7 ? 'text-orange-600' : 'text-green-600'}`}>{viewDialog.user.subscription_days_left > 0 ? `${viewDialog.user.subscription_days_left} jours` : viewDialog.user.subscription_days_left === 0 ? 'Expire aujourd\'hui' : `Expiré depuis ${Math.abs(viewDialog.user.subscription_days_left)} jours`}</p></div></>)}
                <div><Label className="text-muted-foreground">Statut compte</Label><p className="font-medium">{viewDialog.user.is_blocked ? 'Bloqué' : 'Actif'}</p></div>
                <div><Label className="text-muted-foreground">Date création</Label><p className="font-medium">{new Date(viewDialog.user.created_at).toLocaleDateString('fr-FR')}</p></div>
              </div>
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
                {(viewDialog.user.subscription_status === 'expired' || viewDialog.user.subscription_status === 'expiring_soon') && (<Button onClick={() => { setRenewDialog({ isOpen: true, user: viewDialog.user, durationMonths: 1 }); setViewDialog({ isOpen: false, user: null }); }} className="bg-orange-500 hover:bg-orange-600"><RefreshCcw className="w-4 h-4 mr-2" />Renouveler l'abonnement</Button>)}
                {!viewDialog.user.pro_status && !viewDialog.user.subscription_end_date && (<Button onClick={() => { setReactivateDialog({ isOpen: true, user: viewDialog.user, durationMonths: 1 }); setViewDialog({ isOpen: false, user: null }); }} className="bg-green-500 hover:bg-green-600"><Power className="w-4 h-4 mr-2" />Réactiver l'abonnement</Button>)}
                {viewDialog.user.pro_status && viewDialog.user.subscription_status === 'active' && (<Button variant="destructive" onClick={() => handleDeactivateSubscription(viewDialog.user)} disabled={updating}>{updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PowerOff className="w-4 h-4 mr-2" />}Désactiver l'abonnement</Button>)}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialog({ isOpen: false, user: null })}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Réactivation - choix libre des mois */}
      <Dialog open={reactivateDialog.isOpen} onOpenChange={(open) => !open && setReactivateDialog({ isOpen: false, user: null, durationMonths: 1 })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Power className="w-5 h-5 text-green-500" />Réactiver l'abonnement PRO</DialogTitle><DialogDescription>Choisissez la durée de réactivation pour <strong>{reactivateDialog.user?.full_name || reactivateDialog.user?.email}</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Durée de l'abonnement (en mois)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                step="1"
                value={reactivateDialog.durationMonths}
                onChange={(e) => setReactivateDialog({...reactivateDialog, durationMonths: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-muted-foreground">
                L'utilisateur aura accès pendant {reactivateDialog.durationMonths} mois.
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-sm text-green-600 flex items-center gap-2"><Power className="w-4 h-4" />L'utilisateur retrouvera l'accès à tous les contenus PRO.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialog({ isOpen: false, user: null, durationMonths: 1 })}>Annuler</Button>
            <Button onClick={() => handleReactivateSubscription(reactivateDialog.user, reactivateDialog.durationMonths)} disabled={updating} className="bg-green-500 hover:bg-green-600">
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Réactiver ({reactivateDialog.durationMonths} mois)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Renouvellement - choix libre des mois */}
      <Dialog open={renewDialog.isOpen} onOpenChange={(open) => !open && setRenewDialog({ isOpen: false, user: null, durationMonths: 1 })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCcw className="w-5 h-5 text-orange-500" />Renouveler l'abonnement PRO</DialogTitle><DialogDescription>Choisissez la durée de renouvellement pour <strong>{renewDialog.user?.full_name || renewDialog.user?.email}</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Durée du renouvellement (en mois)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                step="1"
                value={renewDialog.durationMonths}
                onChange={(e) => setRenewDialog({...renewDialog, durationMonths: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-muted-foreground">
                Ajoute {renewDialog.durationMonths} mois à la date d'expiration actuelle.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialog({ isOpen: false, user: null, durationMonths: 1 })}>Annuler</Button>
            <Button onClick={() => handleRenewSubscription(renewDialog.user, renewDialog.durationMonths)} disabled={updating} className="bg-orange-500 hover:bg-orange-600">
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Renouveler ({renewDialog.durationMonths} mois)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assignation */}
      <Dialog open={assignDialog.isOpen} onOpenChange={(open) => !open && setAssignDialog({ isOpen: false, user: null, targetCycleId: '' })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> Assigner à un cycle</DialogTitle><DialogDescription>Assigner <strong>{assignDialog.user?.full_name || assignDialog.user?.email}</strong> à un cycle.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label>Choisir un cycle</Label><Select value={assignDialog.targetCycleId} onValueChange={(v) => setAssignDialog({...assignDialog, targetCycleId: v})}><SelectTrigger><SelectValue placeholder="Sélectionner un cycle" /></SelectTrigger><SelectContent>{cycles.map(cycle => (<SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>))}</SelectContent></Select>{cycles.length === 0 && (<p className="text-xs text-amber-600 mt-1">Aucun cycle disponible. Créez d'abord un cycle dans l'onglet "Cycles".</p>)}</div></div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialog({ isOpen: false, user: null, targetCycleId: '' })}>Annuler</Button><Button onClick={handleAssign} disabled={!assignDialog.targetCycleId}>Assigner</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Blocage */}
      <Dialog open={blockDialog.isOpen} onOpenChange={(open) => !open && setBlockDialog({ isOpen: false, user: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{blockDialog.user?.is_blocked ? 'Débloquer' : 'Bloquer'} l'utilisateur</DialogTitle><DialogDescription>{blockDialog.user?.is_blocked ? `Débloquer ${blockDialog.user?.full_name || blockDialog.user?.email} ?` : `Bloquer ${blockDialog.user?.full_name || blockDialog.user?.email} ?`}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setBlockDialog({ isOpen: false, user: null })}>Annuler</Button><Button onClick={() => toggleBlockUser(blockDialog.user)}>Confirmer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, user: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="w-5 h-5" /> Confirmer la suppression</DialogTitle><DialogDescription>Vous êtes sur le point de supprimer définitivement le compte de <strong>{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong>. Cette action est irréversible.</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, user: null })}>Annuler</Button><Button variant="destructive" onClick={handleDelete}>Oui, supprimer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Édition Utilisateur */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, user: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-primary" />Modifier l'utilisateur</DialogTitle><DialogDescription>Modifiez les informations de <strong>{editDialog.user?.full_name}</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nom complet</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialog({ isOpen: false, user: null })}>Annuler</Button><Button onClick={handleUpdateUser} disabled={updating}>{updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;