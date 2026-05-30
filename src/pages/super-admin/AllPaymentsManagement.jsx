// src/pages/super-admin/AllPaymentsManagement.jsx - Version corrigée (super admin voit tout)
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Search, Eye, RefreshCw, DollarSign, CreditCard, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AllPaymentsManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [cycles, setCycles] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });

  // Charger la liste des cycles pour le filtre
  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setCycles(data || []);
    } catch (err) {
      console.error('Error fetching cycles:', err);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // 1. Récupérer TOUTES les transactions (sans jointure)
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: transactionsData, error: transError } = await query;
      if (transError) throw transError;

      if (!transactionsData || transactionsData.length === 0) {
        setPayments([]);
        resetStats();
        setLoading(false);
        return;
      }

      // 2. Récupérer les IDs des utilisateurs et des plans
      const userIds = [...new Set(transactionsData.map(t => t.user_id).filter(Boolean))];
      const planIds = [...new Set(transactionsData.map(t => t.plan_id).filter(Boolean))];

      // 3. Récupérer les informations des utilisateurs (email, nom, cycle_id, admin_id)
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, cycle_id, admin_id')
          .in('id', userIds);
        if (!usersError && usersData) {
          usersData.forEach(u => { usersMap[u.id] = u; });
        }
      }

      // 4. Récupérer les noms des admins (pour l'affichage du centre)
      const adminIds = [...new Set(Object.values(usersMap).map(u => u.admin_id).filter(Boolean))];
      let adminsMap = {};
      if (adminIds.length > 0) {
        const { data: adminsData, error: adminsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', adminIds);
        if (!adminsError && adminsData) {
          adminsData.forEach(a => { adminsMap[a.id] = a; });
        }
      }

      // 5. Récupérer les informations des plans
      let plansMap = {};
      if (planIds.length > 0) {
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('id, name, duration_days, price')
          .in('id', planIds);
        if (!plansError && plansData) {
          plansData.forEach(p => { plansMap[p.id] = p; });
        }
      }

      // 6. Assembler les données enrichies
      let enrichedPayments = transactionsData.map(t => {
        const user = usersMap[t.user_id] || null;
        const admin = user ? adminsMap[user.admin_id] : null;
        const plan = plansMap[t.plan_id] || null;
        const cycle = cycles.find(c => c.id === user?.cycle_id) || null;
        return {
          ...t,
          user: user,
          admin_name: admin?.full_name || admin?.email || 'N/A',
          cycle_name: cycle?.name || 'Non assigné',
          plan: plan
        };
      });

      // 7. Filtrer par cycle (si nécessaire)
      if (cycleFilter !== 'all') {
        enrichedPayments = enrichedPayments.filter(p => p.user?.cycle_id === cycleFilter);
      }

      setPayments(enrichedPayments);

      // Calcul des stats
      let totalAmount = 0, pendingCount = 0, approvedCount = 0, rejectedCount = 0;
      enrichedPayments.forEach(p => {
        totalAmount += (p.amount || 0);
        if (p.status === 'pending') pendingCount++;
        else if (p.status === 'approved') approvedCount++;
        else if (p.status === 'rejected') rejectedCount++;
      });
      setStats({
        totalAmount,
        totalCount: enrichedPayments.length,
        pendingCount,
        approvedCount,
        rejectedCount,
      });

    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const resetStats = () => {
    setStats({
      totalAmount: 0,
      totalCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    });
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, cycleFilter]);

  const handleValidate = async (payment) => {
    setProcessing(true);
    try {
      const plan = payment.plan;
      const durationDays = plan?.duration_days || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);
      
      const { error: transError } = await supabase
        .from('transactions')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', payment.id);
      if (transError) throw transError;

      const { error: userError } = await supabase
        .from('users')
        .update({
          pro_status: true,
          pro_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.user_id);
      if (userError) throw userError;

      toast.success(`Paiement validé - Abonnement PRO activé pour ${durationDays} jours`);
      fetchPayments();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (payment) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'rejected', approved_at: new Date().toISOString() })
        .eq('id', payment.id);
      if (error) throw error;
      toast.success('Paiement rejeté');
      fetchPayments();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Validé</Badge>;
      case 'pending':  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">En attente</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejeté</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(p => 
    p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Montant total</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalAmount.toLocaleString()} FCFA</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Transactions totales</p><p className="text-2xl font-bold text-green-600">{stats.totalCount}</p></div>
              <CreditCard className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">En attente</p><p className="text-2xl font-bold text-amber-600">{stats.pendingCount}</p></div>
              <Clock className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Validés</p><p className="text-2xl font-bold text-purple-600">{stats.approvedCount}</p></div>
              <CheckCircle className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div><h2 className="text-2xl font-bold">Gestion des Paiements</h2><p className="text-sm text-muted-foreground">{stats.pendingCount} en attente | Total: {filteredPayments.length} transactions</p></div>
        <Button variant="outline" size="sm" onClick={fetchPayments}><RefreshCw className="w-4 h-4 mr-2" />Actualiser</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="approved">Validés</SelectItem><SelectItem value="rejected">Rejetés</SelectItem></SelectContent></Select>
        <Select value={cycleFilter} onValueChange={setCycleFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par cycle" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les cycles</SelectItem>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow><TableHead className="text-white">Apprenant</TableHead><TableHead className="text-white">Centre</TableHead><TableHead className="text-white">Cycle</TableHead><TableHead className="text-white">Forfait</TableHead><TableHead className="text-white">Montant</TableHead><TableHead className="text-white">Référence</TableHead><TableHead className="text-white">Méthode</TableHead><TableHead className="text-white">Statut</TableHead><TableHead className="text-white">Date</TableHead><TableHead className="text-white text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-12">Aucun paiement trouvé.</TableCell></TableRow> :
                filteredPayments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><div><p className="font-medium">{p.user?.full_name || '-'}</p><p className="text-xs text-muted-foreground">{p.user?.email}</p></div></TableCell>
                    <TableCell className="text-sm">{p.admin_name}</TableCell>
                    <TableCell className="text-sm">{p.cycle_name}</TableCell>
                    <TableCell>{p.plan?.name || '-'}</TableCell>
                    <TableCell className="font-bold">{p.amount?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="font-mono text-sm">{p.reference || '-'}</TableCell>
                    <TableCell>{p.payment_method || '-'}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setSelectedPayment(p); setIsModalOpen(true); }}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Détails */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Détails du paiement</DialogTitle></DialogHeader>
          {selectedPayment && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Apprenant</p><p className="font-medium">{selectedPayment.user?.full_name}</p><p className="text-sm">{selectedPayment.user?.email}</p></div>
                <div><p className="text-sm text-muted-foreground">Centre</p><p className="font-medium">{selectedPayment.admin_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Cycle</p><p className="font-medium">{selectedPayment.cycle_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Forfait</p><p className="font-medium">{selectedPayment.plan?.name}</p><p className="text-sm">{selectedPayment.plan?.duration_days} jours</p></div>
                <div><p className="text-sm text-muted-foreground">Montant</p><p className="text-2xl font-bold text-primary">{selectedPayment.amount?.toLocaleString()} FCFA</p></div>
                <div><p className="text-sm text-muted-foreground">Référence</p><p className="font-mono text-sm">{selectedPayment.reference || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Méthode</p><p>{selectedPayment.payment_method || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Téléphone</p><p>{selectedPayment.apprenant_phone || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Statut</p>{getStatusBadge(selectedPayment.status)}</div>
              </div>
              {selectedPayment.proof_image && <div><p className="text-sm text-muted-foreground mb-2">Preuve</p><img src={selectedPayment.proof_image} alt="Preuve" className="max-h-64 rounded-lg border" /></div>}
              {selectedPayment.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(selectedPayment)} disabled={processing}>{processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Rejeter</Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleValidate(selectedPayment)} disabled={processing}>{processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Valider</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllPaymentsManagement;