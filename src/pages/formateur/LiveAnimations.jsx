
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Video, Calendar, Clock, Plus, ExternalLink, PlayCircle, Trash2, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const LiveAnimations = () => {
  const { formateurId, programId } = useParams();
  const navigate = useNavigate();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const records = await supabase.from('program_cycles').getFullList({
          filter: `program_id = "${programId}"`,
          sort: 'order',
          $autoCancel: false
        });
        setCycles(records);
        if (records.length > 0) {
          setSelectedCycle(records[0].id);
        }
      } catch (error) {
        console.error('Error fetching cycles:', error);
        toast.error('Erreur lors du chargement des cycles');
      } finally {
        setLoadingCycles(false);
      }
    };

    if (programId) fetchCycles();
  }, [programId]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!selectedCycle) return;
      
      setLoadingSessions(true);
      try {
        const records = await supabase.from('program_sessions').getFullList({
          filter: `program_id = "${programId}" && cycle_id = "${selectedCycle}"`,
          sort: '-start_time', // Using start_time as per schema, or fallback to created
          $autoCancel: false
        });
        setSessions(records);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast.error('Erreur lors du chargement des sessions');
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [programId, selectedCycle]);

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible.')) {
      return;
    }

    try {
      await supabase.from('program_sessions').delete(id, { $autoCancel: false });
      setSessions(sessions.filter(s => s.id !== id));
      toast.success('Session supprimée avec succès');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const activeCycleDetails = cycles.find(c => c.id === selectedCycle);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Animations Live</h2>
          <p className="text-muted-foreground">Gérez vos sessions en direct, webinaires et débats.</p>
        </div>
        <Button asChild>
          <Link to={`/formateur/${formateurId}/program/${programId}/create-session`}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Session
          </Link>
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="w-full sm:w-72">
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Filtrer par Cycle</label>
              {loadingCycles ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="w-full bg-muted/50">
                    <SelectValue placeholder="Sélectionnez un cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map(cycle => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {activeCycleDetails && (
              <div className="flex-1 bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center gap-3 mt-6 sm:mt-0">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-primary">{activeCycleDetails.title}</p>
                  <p className="text-muted-foreground">
                    Du {new Date(activeCycleDetails.start_date).toLocaleDateString()} au {new Date(activeCycleDetails.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Date & Heure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Liens</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingSessions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !selectedCycle ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Veuillez sélectionner un cycle pour voir les sessions.
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Video className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">Aucune session trouvée</p>
                    <p className="text-sm mb-4">Ce cycle ne contient pas encore de sessions live.</p>
                    <Button variant="outline" asChild>
                      <Link to={`/formateur/${formateurId}/program/${programId}/create-session`}>
                        Créer la première session
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map(session => (
                <TableRow key={session.id} className="group">
                  <TableCell>
                    <div className="font-medium text-foreground">{session.title}</div>
                    {session.is_pro_only && (
                      <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-0">PRO ONLY</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> 
                        {session.session_date ? new Date(session.session_date).toLocaleDateString() : new Date(session.start_time).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                        <Clock className="h-3.5 w-3.5" /> 
                        {session.session_time || 'Heure non définie'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-background">
                      {session.type || 'Live'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {(session.zoom_link || session.session_url) ? (
                        <a href={session.zoom_link || session.session_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Rejoindre
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Pas de lien
                        </span>
                      )}
                      {(session.replay_url || session.recording_url) && (
                        <a href={session.replay_url || session.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                          <PlayCircle className="h-3 w-3" /> Replay
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" title="Modifier" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Supprimer" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(session.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LiveAnimations;
