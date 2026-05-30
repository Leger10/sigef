// src/pages/admin/PaymentsManagement.jsx - Version avec statistiques
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Eye, CheckCircle, XCircle, Loader2, RefreshCw, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const PaymentsManagement = ({ cycleId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [plansMap, setPlansMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Statistiques
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalSubscriptions: 0
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les utilisateurs de l'admin
      let usersQuery = supabase
        .from('users')
        .select('id, email, full_name')
        .eq('admin_id', currentUser?.id);
      
      const { data: usersData } = await usersQuery;
      const usersMapData = {};
      (usersData || []).forEach(user => {
        usersMapData[user.id] = user;
      });
      setUsersMap(usersMapData);
      
      const userIds = Object.keys(usersMapData);
      
      if (userIds.length === 0) {
        setTransactions([]);
        resetStats();
        setLoading(false);
        return;
      }
      
      // 2. Récupérer les transactions des utilisateurs
      let transactionsQuery = supabase
        .from('transactions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });
      
      // Filtrer par cycle si fourni
      if (cycleId) {
        // La table transactions n'a pas de colonne cycle_id, donc on filtre via les utilisateurs
        // On peut filtrer après récupération ou utiliser une jointure
        // Pour simplifier, on récupère d'abord les users du cycle
        const { data: cycleUsers } = await supabase
          .from('users')
          .select('id')
          .eq('cycle_id', cycleId);
        
        const cycleUserIds = cycleUsers?.map(u => u.id) || [];
        if (cycleUserIds.length > 0) {
          transactionsQuery = transactionsQuery.in('user_id', cycleUserIds);
        } else {
          setTransactions([]);
          resetStats();
          setLoading(false);
          return;
        }
      }
      
      const { data: transactionsData, error: transError } = await transactionsQuery;
      
      if (transError) throw transError;
      
      // 3. Récupérer les plans
      const planIds = [...new Set((transactionsData || []).map(t => t.plan_id).filter(Boolean))];
      if (planIds.length > 0) {
        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('id, name, price, duration_days')
          .in('id', planIds);
        
        const plansMapData = {};
        (plansData || []).forEach(plan => {
          plansMapData[plan.id] = plan;
        });
        setPlansMap(plansMapData);
      }
      
      setTransactions(transactionsData || []);
      
      // Calculer les statistiques
      let totalAmount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      (transactionsData || []).forEach(t => {
        totalAmount += (t.amount || 0);
        if (t.status === 'pending') pendingCount++;
        else if (t.status === 'approved') approvedCount++;
        else if (t.status === 'rejected') rejectedCount++;
      });
      
      setStats({
        totalAmount,
        totalCount: transactionsData?.length || 0,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalSubscriptions: approvedCount // ou nombre d'abonnements actifs
      });
      
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erreur lors du chargement');
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
      totalSubscriptions: 0
    });
  };

  useEffect(() => {
    fetchPayments();
  }, [currentUser?.id, cycleId]);

  const calculateExpiryDate = (durationDays) => {
    const date = new Date();
    date.setDate(date.getDate() + durationDays);
    return date.toISOString();
  };

  const handleValidate = async (transaction) => {
    setProcessing(true);
    try {
      const plan = plansMap[transaction.plan_id];
      const durationDays = plan?.duration_days || 30;
      const expiryDate = calculateExpiryDate(durationDays);
      
      const { error: transError } = await supabase
        .from('transactions')
        .update({
          status: 'approved',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (transError) throw transError;

      const { error: userError } = await supabase
        .from('users')
        .update({
          pro_status: true,
          pro_expiry: expiryDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id);

      if (userError) throw userError;

      toast.success(`Paiement validé - Abonnement PRO activé pour ${durationDays} jours`);
      fetchPayments();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error validating payment:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (transaction) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'rejected',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Paiement rejeté');
      fetchPayments();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Validé</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Montant total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalAmount.toLocaleString()} FCFA
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Paiements validés</p>
                <p className="text-2xl font-bold text-green-600">{stats.approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingCount}</p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Abonnements actifs</p>
                <p className="text-2xl font-bold text-purple-600">{stats.approvedCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
          <p className="text-muted-foreground">
            {pendingCount} paiement(s) en attente de validation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Apprenant</TableHead>
                <TableHead className="text-white">Forfait</TableHead>
                <TableHead className="text-white">Montant</TableHead>
                <TableHead className="text-white">Téléphone</TableHead>
                <TableHead className="text-white">Référence</TableHead>
                <TableHead className="text-white">Statut</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucun paiement trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map(transaction => {
                  const user = usersMap[transaction.user_id];
                  const plan = plansMap[transaction.plan_id];
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <p className="font-medium">{user?.full_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </TableCell>
                      <TableCell>{plan?.name || '-'}</TableCell>
                      <TableCell className="font-bold">{transaction.amount?.toLocaleString()} FCFA</TableCell>
                      <TableCell>{transaction.apprenant_phone || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{transaction.reference || '-'}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setSelectedPayment(transaction);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Détails */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du paiement</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Apprenant</p>
                  <p className="font-medium">{usersMap[selectedPayment.user_id]?.full_name}</p>
                  <p className="text-sm">{usersMap[selectedPayment.user_id]?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forfait</p>
                  <p className="font-medium">{plansMap[selectedPayment.plan_id]?.name}</p>
                  <p className="text-sm">{plansMap[selectedPayment.plan_id]?.duration_days} jours</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="text-2xl font-bold text-primary">{selectedPayment.amount?.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p>{selectedPayment.apprenant_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-mono text-sm">{selectedPayment.reference || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>

              {selectedPayment.proof_image && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preuve de paiement</p>
                  <img 
                    src={selectedPayment.proof_image} 
                    alt="Preuve" 
                    className="max-h-64 rounded-lg border"
                  />
                </div>
              )}

              {selectedPayment.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleReject(selectedPayment)}
                    disabled={processing}
                  >
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Rejeter
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleValidate(selectedPayment)}
                    disabled={processing}
                  >
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Valider le paiement
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManagement;