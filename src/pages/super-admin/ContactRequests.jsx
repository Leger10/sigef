import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Mail, Phone, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ContactRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) {
      toast.error('Erreur mise à jour');
    } else {
      toast.success('Statut mis à jour');
      fetchRequests();
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">En attente</Badge>;
      case 'contacted': return <Badge variant="outline" className="bg-blue-500/20 text-blue-600">Contacté</Badge>;
      case 'closed': return <Badge variant="outline" className="bg-green-500/20 text-green-600">Clôturé</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Demandes de contact</h2>
        <Button onClick={fetchRequests} variant="outline">Actualiser</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Pack / Option</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{req.full_name}</TableCell>
                  <TableCell>{req.email}</TableCell>
                  <TableCell><Badge variant="outline">{req.pack_name}</Badge></TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRequest(req)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.location.href = `mailto:${req.email}`}>
                      <Mail className="h-4 w-4" />
                    </Button>
                    {req.phone && (
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = `tel:${req.phone}`}>
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                    {req.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(req.id, 'contacted')}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3">
              <p><strong>Nom :</strong> {selectedRequest.full_name}</p>
              <p><strong>Email :</strong> {selectedRequest.email}</p>
              <p><strong>Téléphone :</strong> {selectedRequest.phone || 'Non renseigné'}</p>
              <p><strong>Pack :</strong> {selectedRequest.pack_name}</p>
              <p><strong>Message :</strong> {selectedRequest.message || 'Aucun message'}</p>
              <p><strong>Statut :</strong> {getStatusBadge(selectedRequest.status)}</p>
              <p><strong>Date :</strong> {new Date(selectedRequest.created_at).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactRequests;