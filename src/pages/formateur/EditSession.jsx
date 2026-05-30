// src/pages/formateur/EditSession.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Video, Calendar, Clock, ArrowLeft, Save, Loader2, Play, Upload, X, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { notifyCycleApprenants, notifyAdminAndSuperAdmins } from '@/services/notificationService';

const BUCKET_NAME = 'sessions';

const EditSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [session, setSession] = useState(null);

  const [formData, setFormData] = useState({
    cycle_id: '',
    title: '',
    description: '',
    session_date: '',
    session_time: '',
    duration: 60,
    max_participants: '',
    allow_screen_share: true,
    allow_recording: true,
    status: 'scheduled',
    recording_url: '',
    visibility: 'pro_only',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let adminId = currentUser?.admin_id;
        if (!adminId) {
          const { data: userData } = await supabase
            .from('users')
            .select('admin_id')
            .eq('id', currentUser?.id)
            .single();
          adminId = userData?.admin_id;
        }
        let cyclesQuery = supabase.from('cycles').select('id, name').eq('is_active', true);
        if (adminId) cyclesQuery = cyclesQuery.eq('admin_id', adminId);
        const { data: cyclesData, error: cyclesError } = await cyclesQuery.order('name');
        if (cyclesError) throw cyclesError;
        setCycles(cyclesData || []);

        const { data: sessionData, error: sessionError } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (sessionError) throw sessionError;
        setSession(sessionData);

        const scheduledDate = sessionData.scheduled_time ? new Date(sessionData.scheduled_time) : null;
        setFormData({
          cycle_id: sessionData.cycle_id || '',
          title: sessionData.title || '',
          description: sessionData.description || '',
          session_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : '',
          session_time: scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : '',
          duration: sessionData.duration || 60,
          max_participants: sessionData.max_participants || '',
          allow_screen_share: sessionData.allow_screen_share !== false,
          allow_recording: sessionData.allow_recording !== false,
          status: sessionData.status || 'scheduled',
          recording_url: sessionData.recording_url || '',
          visibility: sessionData.visibility || 'pro_only',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    if (sessionId && currentUser) fetchData();
  }, [sessionId, currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? Number(value) : '') : value
    }));
  };

  const handleCheckedChange = (name, checked) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const uploadRecording = async (file) => {
    if (!file) return null;
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez MP4, WebM ou MOV.');
      return null;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 200 Mo. Privilégiez un lien YouTube ou Vimeo.');
      return null;
    }

    setUploading(true);
    setUploadProgress(0);
    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
    const filePath = `session-recordings/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erreur d'upload: ${error.message || 'Vérifiez la connexion ou la taille du fichier'}`);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const startSession = async () => {
    setStarting(true);
    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      
      await notifyCycleApprenants(
        formData.cycle_id,
        '🔴 Session live démarrée',
        `${formData.title} a commencé ! Rejoignez maintenant.`,
        'live_started',
        `/live-session/${sessionId}`
      );

      // Notifier l'admin du cycle et les super admins
      await notifyAdminAndSuperAdmins(
        formData.cycle_id,
        null,
        `🔴 Session live démarrée par ${currentUser.full_name}`,
        `${formData.title} est en direct !`,
        'live_started',
        `/live-session/${sessionId}`
      );
      
      toast.success('Session démarrée !');
      navigate(`/live-session/${sessionId}`);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Erreur au démarrage de la session');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cycle_id) {
      toast.error('Veuillez sélectionner un cycle');
      return;
    }
    if (!formData.title || !formData.session_date || !formData.session_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const oldScheduledTime = session.scheduled_time;
      const newScheduledTime = new Date(`${formData.session_date}T${formData.session_time}`).toISOString();
      const oldTitle = session.title;
      const newTitle = formData.title;

      const { error } = await supabase
        .from('live_sessions')
        .update({
          cycle_id: formData.cycle_id,
          title: newTitle,
          description: formData.description,
          scheduled_time: newScheduledTime,
          duration: formData.duration,
          max_participants: formData.max_participants || null,
          allow_screen_share: formData.allow_screen_share,
          allow_recording: formData.allow_recording,
          status: formData.status,
          recording_url: formData.recording_url || null,
          visibility: formData.visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      if (error) throw error;

      // Notifier si nouveau replay ajouté
      if (formData.recording_url && !session.recording_url) {
        await notifyCycleApprenants(
          formData.cycle_id,
          '📹 Replay disponible',
          `Le replay de "${newTitle}" est maintenant accessible (${formData.visibility === 'pro_only' ? 'réservé aux abonnés PRO' : 'visible à tous'}).`,
          'info',
          `/live-session/${sessionId}`
        );

        // Notifier l'admin du cycle et les super admins
        await notifyAdminAndSuperAdmins(
          formData.cycle_id,
          null,
          `📹 Replay ajouté par ${currentUser.full_name}`,
          `Session "${newTitle}" – replay disponible (${formData.visibility === 'pro_only' ? 'PRO only' : 'visible à tous'})`,
          'info',
          `/live-session/${sessionId}`
        );
      }

      if (oldScheduledTime !== newScheduledTime || oldTitle !== newTitle) {
        const formattedDate = new Date(newScheduledTime).toLocaleDateString('fr-FR');
        const formattedTime = new Date(newScheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        await notifyCycleApprenants(
          formData.cycle_id,
          '🔄 Session mise à jour',
          `${newTitle} – nouvelle date : ${formattedDate} à ${formattedTime}`,
          'info',
          `/live-session/${sessionId}`
        );
      }

      toast.success('Session mise à jour avec succès');
      navigate('/formateur/live-sessions');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold">Session non trouvée</h2>
        <Button className="mt-4" onClick={() => navigate('/formateur/live-sessions')}>
          Retour aux sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/formateur/live-sessions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier la Session</h1>
            <p className="text-muted-foreground">Modifiez les paramètres et ajoutez le lien replay après la session.</p>
          </div>
        </div>
        {formData.status === 'scheduled' && (
          <Button 
            onClick={startSession} 
            className="bg-green-600 hover:bg-green-700"
            disabled={starting}
          >
            {starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Démarrer la session
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Informations de la session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de la session</Label>
                  <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycle_id">Cycle de formation</Label>
                  <Select value={formData.cycle_id} onValueChange={(v) => setFormData({...formData, cycle_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map(cycle => (
                        <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Planification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session_date">Date</Label>
                    <Input id="session_date" name="session_date" type="date" value={formData.session_date} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_time">Heure</Label>
                    <Input id="session_time" name="session_time" type="time" value={formData.session_time} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (minutes)</Label>
                  <Input id="duration" name="duration" type="number" min="15" max="480" step="15" value={formData.duration} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Nombre max de participants (optionnel)</Label>
                  <Input id="max_participants" name="max_participants" type="number" min="1" value={formData.max_participants} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_screen_share">Autoriser le partage d'écran</Label>
                  <Checkbox id="allow_screen_share" checked={formData.allow_screen_share} onCheckedChange={(c) => handleCheckedChange('allow_screen_share', c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_recording">Autoriser l'enregistrement</Label>
                  <Checkbox id="allow_recording" checked={formData.allow_recording} onCheckedChange={(c) => handleCheckedChange('allow_recording', c)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Replay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-500/10 rounded-lg flex items-start gap-2 text-sm text-blue-400">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Pour économiser les ressources, privilégiez un lien YouTube ou Vimeo plutôt que l'upload de vidéos lourdes.</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recording_url">Lien externe (YouTube, Vimeo, Dropbox, etc.)</Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recording_url"
                      name="recording_url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="pl-9"
                      value={formData.recording_url}
                      onChange={handleInputChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exemples : lien YouTube, Vimeo, Loom, ou tout autre lecteur vidéo en ligne.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                  <Label>Ou uploader une vidéo (max 200 Mo)</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('video-upload').click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Choisir un fichier
                      </Button>
                      <input
                        id="video-upload"
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await uploadRecording(file);
                            if (url) {
                              setFormData(prev => ({ ...prev, recording_url: url }));
                              toast.success('Vidéo uploadée avec succès !');
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                      {uploading && (
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                    {formData.recording_url && (formData.recording_url.startsWith('https://') || formData.recording_url.includes('supabase.co')) && (
                      <div className="mt-2 p-2 bg-muted/30 rounded flex items-center justify-between">
                        <span className="text-xs truncate flex-1">{formData.recording_url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, recording_url: '' }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilité du replay</Label>
                  <Select value={formData.visibility} onValueChange={(v) => setFormData({...formData, visibility: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro_only">Réservé aux apprenants PRO</SelectItem>
                      <SelectItem value="all">Visible par tous les apprenants</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.visibility === 'pro_only' 
                      ? 'Seuls les apprenants avec un abonnement PRO actif pourront voir ce replay.' 
                      : 'Tous les apprenants (même sans abonnement PRO) pourront voir ce replay.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Planifiée</SelectItem>
                      <SelectItem value="live">En direct</SelectItem>
                      <SelectItem value="ended">Terminée</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/formateur/live-sessions')}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditSession;