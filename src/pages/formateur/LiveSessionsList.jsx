// src/pages/formateur/LiveSessionsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.jsx';
import { Video, Calendar, Clock, Plus, Trash2, Users, Edit, User, Crown, Phone, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { notifyCycleApprenants } from '@/services/notificationService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LiveSessionsList = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour le modal des participants
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [exporting, setExporting] = useState(null); // 'excel' ou 'pdf'

  const getAdminId = async () => {
    if (currentUser?.admin_id) return currentUser.admin_id;
    const { data, error } = await supabase
      .from('users')
      .select('admin_id')
      .eq('id', currentUser?.id)
      .single();
    if (error || !data?.admin_id) return null;
    return data.admin_id;
  };

  // Fonction pour déterminer le statut réel d'une session
  const getRealStatus = (session) => {
    if (session.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const scheduled = new Date(session.scheduled_time);
    const endTime = new Date(scheduled.getTime() + (session.duration || 60) * 60000);
    if (now < scheduled) return 'scheduled';
    if (now >= scheduled && now <= endTime) return 'live';
    return 'ended';
  };

  // Récupération des cycles
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const adminId = await getAdminId();
        if (!adminId) { setCycles([]); return; }
        const { data, error } = await supabase
          .from('cycles')
          .select('id, name')
          .eq('admin_id', adminId)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setCycles(data || []);
      } catch (err) {
        console.error('Error fetching cycles:', err);
        toast.error('Erreur lors du chargement des cycles');
      }
    };
    fetchCycles();
  }, [currentUser]);

  // Récupération des sessions
  const fetchSessions = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('live_sessions')
        .select('*')
        .eq('formateur_id', currentUser.id)
        .order('scheduled_time', { ascending: false });
      if (selectedCycle !== 'all') query = query.eq('cycle_id', selectedCycle);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      const sessionsWithData = await Promise.all((data || []).map(async (session) => {
        let cycleName = null;
        if (session.cycle_id) {
          const { data: cycleData } = await supabase
            .from('cycles')
            .select('name')
            .eq('id', session.cycle_id)
            .single();
          if (cycleData) cycleName = cycleData.name;
        }
        let participantCount = 0;
        try {
          const { count } = await supabase
            .from('live_session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('status', 'connected');
          participantCount = count || 0;
        } catch {}
        const realStatus = getRealStatus(session);
        return { ...session, cycle_name: cycleName, participantCount, realStatus };
      }));
      setSessions(sessionsWithData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error.message);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, selectedCycle, statusFilter]);

  // Récupération des participants pour une session (avec téléphone)
  const fetchParticipants = async (session) => {
    setLoadingParticipants(true);
    setSelectedSession(session);
    try {
      const { data, error } = await supabase
        .from('live_session_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          left_at,
          users!inner (
            id,
            full_name,
            email,
            phone,
            pro_status,
            pro_expiry
          )
        `)
        .eq('session_id', session.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(p => ({
        ...p,
        user: p.users,
        isProActive: p.users.pro_status === true && (!p.users.pro_expiry || new Date(p.users.pro_expiry) > new Date())
      }));
      setParticipants(formatted);
      setParticipantsModalOpen(true);
    } catch (err) {
      console.error('Erreur chargement participants:', err);
      toast.error('Impossible de charger les participants');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleDelete = async (session) => {
    if (!window.confirm('Supprimer définitivement cette session ?')) return;
    try {
      await notifyCycleApprenants(
        session.cycle_id,
        '❌ Session annulée',
        `La session "${session.title}" a été annulée.`,
        'cancelled',
        null
      );
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', session.id);
      if (error) throw error;
      setSessions(sessions.filter(s => s.id !== session.id));
      toast.success('Session supprimée');
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (session) => {
    const status = session.realStatus || session.status;
    switch(status) {
      case 'live': 
        return <Badge className="bg-green-500 text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" /> En cours</Badge>;
      case 'scheduled': 
        return <Badge className="bg-primary text-white">Planifiée</Badge>;
      case 'ended': 
        return <Badge variant="secondary">Terminée</Badge>;
      case 'cancelled': 
        return <Badge variant="destructive">Annulée</Badge>;
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // --- Export Excel ---
  const exportParticipantsToExcel = () => {
    setExporting('excel');
    try {
      const data = participants.map(p => ({
        'Nom complet': p.user?.full_name || 'Anonyme',
        'Email': p.user?.email || '-',
        'Téléphone': p.user?.phone || '-',
        'Statut PRO': p.isProActive ? 'PRO Actif' : (p.user?.pro_status ? 'PRO Expiré' : 'Standard'),
        'Statut session': p.status === 'connected' ? 'Connecté' : 'Déconnecté',
        'Connexion': p.joined_at ? new Date(p.joined_at).toLocaleString() : '-',
        'Déconnexion': p.left_at ? new Date(p.left_at).toLocaleString() : '-',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');
      XLSX.writeFile(wb, `participants_${selectedSession?.title}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Export Excel réussi');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’export Excel');
    } finally {
      setExporting(null);
    }
  };

  // --- Export PDF ---
  const exportParticipantsToPDF = () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(`Participants - ${selectedSession?.title}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 14, 25);
      
      const tableColumn = ['Nom complet', 'Email', 'Téléphone', 'Statut PRO', 'Statut session', 'Connexion', 'Déconnexion'];
      const tableRows = participants.map(p => [
        p.user?.full_name || 'Anonyme',
        p.user?.email || '-',
        p.user?.phone || '-',
        p.isProActive ? 'PRO Actif' : (p.user?.pro_status ? 'PRO Expiré' : 'Standard'),
        p.status === 'connected' ? 'Connecté' : 'Déconnecté',
        p.joined_at ? new Date(p.joined_at).toLocaleString() : '-',
        p.left_at ? new Date(p.left_at).toLocaleString() : '-',
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35, left: 10, right: 10 }
      });
      
      doc.save(`participants_${selectedSession?.title}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Export PDF réussi');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’export PDF');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="bg-card rounded-2xl border overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border-b">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Erreur: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visioconférences & Lives</h2>
          <p className="text-muted-foreground">Planifiez et animez vos sessions vidéo en direct.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild><Link to="/formateur/session-recordings">Voir les enregistrements</Link></Button>
          <Button asChild><Link to="/formateur/create-session"><Plus className="h-4 w-4 mr-2" /> Programmer</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-64">
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger><SelectValue placeholder="Tous les cycles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cycles</SelectItem>
                {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="live">En direct</SelectItem>
                <SelectItem value="scheduled">Planifiées</SelectItem>
                <SelectItem value="ended">Terminées</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Planification</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-center">Participants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Video className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">Aucune session trouvée</p>
                    <p className="text-sm mb-4">Modifiez vos filtres ou planifiez une nouvelle session.</p>
                    <Button variant="outline" asChild><Link to="/formateur/create-session">Programmer un live</Link></Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map(session => {
                const realStatus = session.realStatus || session.status;
                const isLive = realStatus === 'live';
                const isScheduled = realStatus === 'scheduled';
                const isEnded = realStatus === 'ended';
                const isCancelled = realStatus === 'cancelled';
                
                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <p className="font-semibold">{session.title}</p>
                      {session.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{session.description}</p>}
                    </TableCell>
                    <TableCell>{session.cycle_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(session.scheduled_time).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(session)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-sm font-medium"
                        onClick={() => fetchParticipants(session)}
                      >
                        <Users className="h-3.5 w-3.5" /> {session.participantCount || 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(isLive || isScheduled) && (
                          <Button size="sm" asChild>
                            <Link to={`/formateur/live-session/${session.id}`}>
                              {isLive ? 'Rejoindre' : 'Démarrer'}
                            </Link>
                          </Button>
                        )}
                        {!isCancelled && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate(`/formateur/edit-session/${session.id}`)} 
                            title={isEnded ? "Ajouter un replay" : "Modifier"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {(isEnded || isCancelled) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(session)} 
                            className="text-destructive hover:bg-destructive/10" 
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal des participants avec téléphone et exports */}
      <Dialog open={participantsModalOpen} onOpenChange={setParticipantsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participants – {selectedSession?.title}
            </DialogTitle>
            <DialogDescription>
              Liste des apprenants ayant rejoint cette session (avec numéro de téléphone).
            </DialogDescription>
          </DialogHeader>
          
          {/* Boutons d'export */}
          {!loadingParticipants && participants.length > 0 && (
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={exportParticipantsToExcel}
                disabled={exporting === 'excel'}
                className="gap-2"
              >
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportParticipantsToPDF}
                disabled={exporting === 'pdf'}
                className="gap-2"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />}
                PDF
              </Button>
            </div>
          )}

          {loadingParticipants ? (
            <div className="py-8 text-center">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : participants.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun participant pour cette session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Connexion</TableHead>
                    <TableHead>Déconnexion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {p.user?.full_name || 'Anonyme'}
                          {p.isProActive && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20">
                              <Crown className="h-3 w-3 mr-1" /> PRO
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{p.user?.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.phone || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={p.status === 'connected' ? 'bg-green-500' : 'bg-gray-500'}>
                          {p.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.joined_at ? new Date(p.joined_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.left_at ? new Date(p.left_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setParticipantsModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveSessionsList;