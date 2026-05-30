// src/pages/formateur/LiveSessionRecordings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Video, ArrowLeft, Play, HardDrive, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const LiveSessionRecordings = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('formateur_id', currentUser?.id)
          .eq('status', 'ended')
          .not('recording_url', 'is', null)
          .order('updated_at', { ascending: false }); // ✅ Remplacement de actual_end par updated_at

        if (error) throw error;

        setRecordings(data || []);
      } catch (error) {
        console.error('Error fetching recordings:', error);
        toast.error('Erreur lors du chargement des enregistrements');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.id) {
      fetchRecordings();
    }
  }, [currentUser?.id]);

  const formatDuration = (minutes) => {
    if (!minutes) return 'Inconnu';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/formateur')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Enregistrements</h2>
          <p className="text-muted-foreground">Archive de vos sessions vidéo terminées.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <HardDrive className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">Aucun enregistrement</p>
                    <p className="text-sm">Les enregistrements apparaîtront ici après la fin de vos sessions live.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recordings.map(recording => (
                <TableRow key={recording.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-semibold">{recording.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(recording.updated_at || recording.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDuration(recording.duration)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {recording.recording_url && (
                        <>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Play className="h-4 w-4 mr-2" /> Visionner
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Replay : {recording.title}</DialogTitle>
                              </DialogHeader>
                              <div className="aspect-video bg-black w-full flex items-center justify-center">
                                <video 
                                  src={recording.recording_url} 
                                  controls 
                                  autoPlay 
                                  className="w-full h-full"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={recording.recording_url} download target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
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

export default LiveSessionRecordings;