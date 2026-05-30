// src/pages/SessionReport.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Clock, Users, MessageSquare, Activity, Lock, Eye } from 'lucide-react';
import { toast } from 'sonner';

const SessionReport = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!sessionId || !currentUser) return;

      setLoading(true);
      setError(null);

      try {
        // 1. Récupérer la session
        const { data: sessionData, error: sessionError } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw new Error('Session introuvable');
        setSession(sessionData);

        // 2. Vérifier les droits : formateur de la session ou admin
        const isFormateur = sessionData.formateur_id === currentUser.id;
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

        if (!isFormateur && !isAdmin) {
          setError("Vous n'avez pas les droits pour consulter ce rapport.");
          setLoading(false);
          return;
        }
        setIsAuthorized(true);

        // 3. Récupérer les messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('live_session_messages')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (!messagesError) setMessages(messagesData || []);

        // 4. Récupérer les questions/réponses
        const { data: qaData, error: qaError } = await supabase
          .from('session_qa')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .order('votes', { ascending: false });

        if (!qaError) setQuestions(qaData || []);

        // 5. Récupérer les participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('live_session_participants')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: true });

        if (!participantsError) setParticipants(participantsData || []);

        // 6. Calculer les statistiques
        const start = sessionData.actual_start ? new Date(sessionData.actual_start) : new Date(sessionData.scheduled_time);
        const end = sessionData.actual_end ? new Date(sessionData.actual_end) : new Date();
        let durationSeconds = Math.floor((end - start) / 1000);
        if (durationSeconds < 0) durationSeconds = 0;

        setStats({
          duration_seconds: durationSeconds,
          total_participants: new Set(participantsData?.map(p => p.user_id) || []).size,
          peak_participants: participantsData?.length || 0,
          total_messages: messagesData?.length || 0,
          total_screen_shares: participantsData?.filter(p => p.is_screen_sharing).length || 0,
        });

      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message || 'Erreur de chargement du rapport');
        toast.error('Impossible de charger le rapport');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [sessionId, currentUser]);

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const handleExport = () => {
    const lines = [
      `RAPPORT DE SESSION: ${session?.title}`,
      `Date: ${new Date(session?.actual_start || session?.scheduled_time).toLocaleString()}`,
      `Durée: ${formatDuration(stats?.duration_seconds)}`,
      `Participants uniques: ${stats?.total_participants}`,
      `Messages envoyés: ${stats?.total_messages}`,
      `Visibilité du replay: ${session?.visibility === 'all' ? 'Visible par tous' : 'Réservé aux abonnés PRO'}`,
      ``,
      `--- MESSAGES CHAT ---`
    ];
    
    messages.forEach(m => {
      if (m.message_type === 'text') {
        lines.push(`[${new Date(m.created_at).toLocaleTimeString()}] ${m.user?.full_name || 'Anonyme'}: ${m.message}`);
      }
    });

    lines.push(``, `--- QUESTIONS & REPONSES ---`);
    questions.forEach(q => {
      lines.push(`Q: ${q.question} (par ${q.user?.full_name || 'Anonyme'}, ${q.votes} votes)`);
      if (q.is_answered) lines.push(`R: ${q.answer}`);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_session_${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport exporté au format TXT');
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-6 text-center">
        <div className="bg-destructive/10 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  if (!session || !isAuthorized) return null;

  // Préparer les données pour le graphique d'activité du chat
  const chartData = messages.reduce((acc, curr) => {
    const time = new Date(curr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existing = acc.find(item => item.time === time);
    if (existing) existing.messages += 1;
    else acc.push({ time, messages: 1 });
    return acc;
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Rapport de Session</h1>
            <p className="text-muted-foreground">
              {session.title} • {new Date(session.scheduled_time).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            {session.visibility === 'all' ? 'Visible par tous' : 'Réservé PRO'}
          </Badge>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="text-3xl font-bold">{formatDuration(stats?.duration_seconds)}</h3>
            <p className="text-sm text-muted-foreground">Durée Totale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="text-3xl font-bold">{stats?.total_participants}</h3>
            <p className="text-sm text-muted-foreground">Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="text-3xl font-bold">{stats?.total_messages}</h3>
            <p className="text-sm text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="text-3xl font-bold">{stats?.total_screen_shares}</h3>
            <p className="text-sm text-muted-foreground">Partages d'écran</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="participants">Participants ({participants.length})</TabsTrigger>
          <TabsTrigger value="chat">Chat ({messages.filter(m => m.message_type === 'text').length})</TabsTrigger>
          <TabsTrigger value="qa">Q&A ({questions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Rejoint le</TableHead>
                  <TableHead>Quitté le</TableHead>
                  <TableHead className="text-right">Écran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Aucun participant enregistré</TableCell>
                  </TableRow>
                ) : (
                  participants.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.user?.full_name || 'Anonyme'}</TableCell>
                      <TableCell><Badge variant="outline">{p.role || 'apprenant'}</Badge></TableCell>
                      <TableCell>{p.joined_at ? new Date(p.joined_at).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{p.left_at ? new Date(p.left_at).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell className="text-right">{p.is_screen_sharing ? '✓' : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {chartData.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Activité du Chat (messages par minute)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messages" fill="#1a56db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chat">
          <Card className="p-4 max-h-[600px] overflow-y-auto">
            {messages.filter(m => m.message_type === 'text').length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun message</p>
            ) : (
              messages.filter(m => m.message_type === 'text').map(m => (
                <div key={m.id} className="pb-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{m.user?.full_name || 'Anonyme'}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</span>
                    {m.is_pinned && <Badge variant="secondary" className="text-xs">Épinglé</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="qa">
          <Card className="p-4 max-h-[600px] overflow-y-auto">
            {questions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune question posée</p>
            ) : (
              questions.map(q => (
                <div key={q.id} className="p-4 rounded-lg bg-muted/10 border mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Q: {q.question}</p>
                      <p className="text-xs text-muted-foreground">Par {q.user?.full_name || 'Anonyme'} • {q.votes} votes</p>
                    </div>
                    <Badge variant={q.is_answered ? "outline" : "secondary"}>
                      {q.is_answered ? 'Répondu' : 'En attente'}
                    </Badge>
                  </div>
                  {q.is_answered && (
                    <div className="mt-2 pl-4 border-l-2 border-primary">
                      <p className="text-sm font-semibold">R: {q.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionReport;