// src/pages/admin/SubscriptionRequests.jsx
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Eye, DollarSign, Calendar, User, Mail, Phone, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import subscriptionService from '@/services/subscriptionService.js';

const SubscriptionRequests = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await subscriptionService.getPendingSubscriptions(currentUser?.id);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchRequests();
    }
  }, [currentUser?.id]);

  const handleValidate = async (request) => {
    setProcessing(true);
    try {
      await subscriptionService.validateSubscription(request.id, currentUser.id);
      toast.success(`Abonnement validé pour ${request.users?.full_name || request.users?.email}`);
      fetchRequests();
      setIsViewDialogOpen(false);
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request) => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }
    
    setProcessing(true);
    try {
      await subscriptionService.rejectSubscription(request.id, currentUser.id, rejectReason);
      toast.success(`Demande rejetée pour ${request.users?.full_name || request.users?.email}`);
      fetchRequests();
      setIsViewDialogOpen(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-500 text-white border-none"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'active':
        return <Badge className="bg-green-500 text-white border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Actif</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: requests.length,
    totalAmount: requests.reduce((sum, r) => sum + (r.amount || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Demandes en attente</p>
                <p className="text-3xl font-bold text-orange-600">{stats.total}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Montant total à valider</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()} FCFA</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Action requise</p>
                <p className="text-sm font-medium text-blue-600">Validez les paiements pour activer les comptes PRO</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Demandes d'abonnement PRO</h2>
          <p className="text-sm text-muted-foreground">
            Validez les paiements des apprenants pour activer leur abonnement
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Apprenant</TableHead>
                <TableHead>Forfait</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date demande</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucune demande d'abonnement en attente
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.users?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{request.users?.email}</p>
                        {request.users?.phone && (
                          <p className="text-xs text-muted-foreground">{request.users.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.subscription_plans?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Durée: {subscriptionService.formatDuration(request.subscription_plans?.duration_days)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-green-600">{request.amount?.toLocaleString()} FCFA</p>
                      {request.subscription_plans?.discount_percentage > 0 && (
                        <p className="text-xs text-green-500">-{request.subscription_plans.discount_percentage}%</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsViewDialogOpen(true);
                        }}
                        className="text-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de validation */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validation d'abonnement</DialogTitle>
            <DialogDescription>
              Vérifiez les informations et validez ou rejetez la demande
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/20 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold">Informations apprenant</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedRequest.users?.full_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedRequest.users?.email}</span>
                  </div>
                  {selectedRequest.users?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedRequest.users.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold">Détails de l'abonnement</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forfait:</span>
                    <span className="font-medium">{selectedRequest.subscription_plans?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Durée:</span>
                    <span>{subscriptionService.formatDuration(selectedRequest.subscription_plans?.duration_days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant payé:</span>
                    <span className="font-bold text-green-600">{selectedRequest.amount?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date de la demande:</span>
                    <span>{new Date(selectedRequest.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Période d'abonnement:</span>
                    <span>
                      {new Date(selectedRequest.start_date).toLocaleDateString('fr-FR')} → {new Date(selectedRequest.end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRequest.payment_proof_url && (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Justificatif de paiement</h3>
                  <a 
                    href={selectedRequest.payment_proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le justificatif
                  </a>
                </div>
              )}

              <div className="space-y-2">
                <Label>Raison du rejet (si applicable)</Label>
                <Textarea 
                  placeholder="Indiquez la raison du rejet..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsViewDialogOpen(false);
                setRejectReason('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReject(selectedRequest)}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Rejeter
            </Button>
            <Button 
              onClick={() => handleValidate(selectedRequest)}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionRequests;