// src/pages/PaymentHistoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { ArrowLeft, Clock, History, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PaymentHistoryPage = () => {
  const { apprenantId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.id !== apprenantId) {
      navigate('/dashboard');
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, user:user_id(*)')
          .eq('user_id', apprenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [apprenantId, currentUser?.id, navigate]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <Badge className="bg-success/10 text-success">Validé</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-500">En attente</Badge>;
      case 'failed': return <Badge className="bg-destructive/10 text-destructive">Rejeté</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4 pb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Historique des transactions</h1>
          <p className="text-muted-foreground">Suivez vos paiements d'abonnement</p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">Aucune transaction</p>
                  <p className="text-sm text-muted-foreground">Vous n'avez pas encore effectué de paiement</p>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold">{payment.amount} FCFA</TableCell>
                  <TableCell>{payment.payment_method || '-'}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setIsModalOpen(true); }}>
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du paiement</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                {getStatusBadge(selectedPayment.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-bold text-lg">{selectedPayment.amount} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono text-sm">{selectedPayment.reference || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Méthode</span>
                <span>{selectedPayment.payment_method || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selectedPayment.created_at).toLocaleString()}</span>
              </div>
              {selectedPayment.proof_image && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preuve</p>
                  <img src={selectedPayment.proof_image} alt="Preuve" className="max-h-48 rounded-lg" />
                </div>
              )}
              {selectedPayment.status === 'pending' && (
                <div className="p-4 bg-amber-500/10 rounded-lg flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <p className="text-sm">En attente de validation par l'administrateur</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentHistoryPage;
