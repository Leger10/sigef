// src/pages/formateur/LiveSessionRoom.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Calendar, Clock, Video, AlertCircle, Lock, Crown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

// Convertit une URL de partage en URL d'intégration (embed)
const getEmbedUrl = (url) => {
  if (!url) return null;

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(youtubeRegex);
  if (match) {
    const videoId = match[1];
    return `https://www.youtube-nocookie.com/embed/${videoId}?origin=${window.location.origin}&rel=0&modestbranding=1`;
  }

  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  const loomRegex = /loom\.com\/share\/([a-f0-9]+)/;
  const loomMatch = url.match(loomRegex);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  if (url.includes('/embed/') || url.includes('player.') || url.includes('iframe')) {
    return url;
  }

  return null;
};

const LiveSessionRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [error, setError] = useState(null);
  const [userProStatus, setUserProStatus] = useState(false);

  useEffect(() => {
    const fetchSessionAndCheckAccess = async () => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('live_sessions')
          .select('*, cycle:cycle_id(*)')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('Session non trouvée');

        if (!isAuthenticated || !currentUser) {
          toast.error('Veuillez vous connecter pour accéder à la session');
          navigate('/login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('cycle_id, pro_status, pro_expiry, role')
          .eq('id', currentUser.id)
          .single();
        if (userError) throw userError;

        const userCycleId = userData?.cycle_id;
        const hasActivePro = userData?.pro_status === true &&
          (!userData?.pro_expiry || new Date(userData.pro_expiry) > new Date());
        setUserProStatus(hasActivePro);

        const isFormateur = sessionData.formateur_id === currentUser.id;

        // Vérification du cycle
        if (!isFormateur && userData.role !== 'admin') {
          if (sessionData.cycle_id && userCycleId !== sessionData.cycle_id) {
            setAccessDenied(true);
            setAccessReason("Vous n'êtes pas inscrit au cycle de cette formation.");
            setLoading(false);
            return;
          }
        }

        // Vérification PRO pour les sessions en direct ou à venir
        const now = new Date();
        const start = new Date(sessionData.scheduled_time);
        const isLiveOrUpcoming = now <= new Date(start.getTime() + (sessionData.duration || 60) * 60000);

        if (!isFormateur && userData.role !== 'admin' && isLiveOrUpcoming && !hasActivePro) {
          setAccessDenied(true);
          setAccessReason("Seuls les abonnés PRO peuvent assister aux sessions live.");
          setLoading(false);
          return;
        }

        setSession(sessionData);

        if (isLiveOrUpcoming && !isFormateur) {
          await supabase
            .from('live_session_participants')
            .upsert({
              session_id: sessionId,
              user_id: currentUser.id,
              joined_at: new Date().toISOString(),
              status: 'connected'
            }, { onConflict: 'session_id,user_id' });
        }
      } catch (err) {
        console.error('Erreur chargement session:', err);
        setError(err.message || 'Erreur de chargement');
        toast.error('Impossible de charger la session');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndCheckAccess();
  }, [sessionId, currentUser, isAuthenticated, navigate]);

  const getSessionStatus = () => {
    if (!session) return 'loading';
    const now = new Date();
    const start = new Date(session.scheduled_time);
    const end = new Date(start.getTime() + (session.duration || 60) * 60000);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'ended';
  };

  const status = getSessionStatus();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Session indisponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error || 'Session introuvable'}</p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" /> Accès restreint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <Crown className="h-12 w-12 text-amber-500" />
              </div>
              <p className="text-muted-foreground mb-4">{accessReason}</p>
              {accessReason.includes("PRO") && (
                <Button className="mb-3 w-full" asChild>
                  <a href="/subscription">S'abonner à PRO</a>
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------- REPLAY (session terminée) ----------
  const isEnded = status === 'ended' || session.status === 'ended';
  const hasRecording = session.recording_url && session.recording_url.trim() !== '';
  const canViewReplay = hasRecording && (
    session.visibility === 'all' ||
    (session.visibility === 'pro_only' && userProStatus) ||
    session.formateur_id === currentUser?.id
  );

  if (isEnded && hasRecording && canViewReplay) {
    const embedUrl = getEmbedUrl(session.recording_url);
    return (
      <div className="min-h-screen flex flex-col">
        <Helmet><title>Revoir le Live - {session.title}</title></Helmet>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(session.scheduled_time).toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(session.scheduled_time).toLocaleTimeString()}</div>
                <Badge variant="outline" className="gap-1">
                  {session.visibility === 'all' ? 'Visible par tous' : 'Réservé PRO'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {embedUrl ? (
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden mb-4">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="Replay de la session"
                  />
                </div>
              ) : (
                <div className="text-center p-6 bg-muted/20 rounded-lg">
                  <p className="text-muted-foreground mb-3">
                    La vidéo ne peut pas être intégrée directement.
                  </p>
                  <Button asChild variant="outline">
                    <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Revoir le Live en externe
                    </a>
                  </Button>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isEnded && hasRecording && !canViewReplay) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" /> Replay réservé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <Crown className="h-12 w-12 text-amber-500" />
              </div>
              <p className="text-muted-foreground mb-4">
                Ce replay est réservé aux abonnés PRO.
              </p>
              <Button className="mb-3 w-full" asChild>
                <a href="/subscription">S'abonner à PRO</a>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isEnded && !hasRecording) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Video className="h-5 w-5 text-muted-foreground" /> Session terminée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette session est terminée et aucun replay n'est encore disponible.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------- SESSION EN DIRECT OU À VENIR ----------
  const meetingUrl = session.meeting_url || `https://meet.jit.si/formation-${session.id}`;
  const isLive = status === 'live' || session.status === 'live';
  const isUpcoming = status === 'upcoming';
  const isFormateur = session.formateur_id === currentUser?.id;
  const canJoinLive = (isLive || isUpcoming) && (userProStatus || isFormateur);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>{session.title} - Salle de visioconférence</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between flex-wrap gap-4">
              {session.title}
              {isLive && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">EN DIRECT</span>
              )}
              {isUpcoming && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">À venir</span>
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(session.scheduled_time).toLocaleDateString()}</div>
              <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(session.scheduled_time).toLocaleTimeString()}</div>
              <div className="flex items-center gap-1"><Video className="h-4 w-4" /> Durée : {session.duration} min</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isUpcoming && (
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600 text-sm">
                La session débutera à l'heure indiquée.
              </div>
            )}
            {!isLive && !isUpcoming && session.status !== 'live' && (
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600 text-sm">
                Cette session n'est pas encore commencée ou est terminée.
              </div>
            )}

            {(isLive || isUpcoming) && canJoinLive && (
              <div className="text-center">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => window.open(meetingUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-5 w-5" />
                  {isLive ? 'Rejoindre la réunion (nouvel onglet)' : 'Accéder à la salle d\'attente'}
                </Button>
                {/* Le lien direct n'est plus affiché pour éviter le partage non autorisé */}
              </div>
            )}

            {(isLive || isUpcoming) && !canJoinLive && (
              <div className="text-center p-4 bg-amber-500/10 rounded-lg">
                <Lock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-600 font-medium">Accès réservé aux abonnés PRO</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate('/subscription')}>
                  S'abonner à PRO
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Quitter
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default LiveSessionRoom;