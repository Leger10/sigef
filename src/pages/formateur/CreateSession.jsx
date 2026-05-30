// src/pages/formateur/CreateSession.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Video, Calendar, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { notifyCycleApprenants, notifyAdminAndSuperAdmins } from '@/services/notificationService';

const CreateSession = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_date: '',
    session_time: '',
    duration: 60,
  });

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

  useEffect(() => {
    const fetchCycles = async () => {
      setLoadingCycles(true);
      try {
        const adminId = await getAdminId();
        if (!adminId) {
          setCycles([]);
          setLoadingCycles(false);
          return;
        }
        const { data, error } = await supabase
          .from('cycles')
          .select('id, name')
          .eq('admin_id', adminId)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setCycles(data || []);
        if (data && data.length > 0) setSelectedCycle(data[0].id);
        else setSelectedCycle('');
      } catch (error) {
        console.error('Error fetching cycles:', error);
        toast.error('Erreur lors du chargement des cycles');
      } finally {
        setLoadingCycles(false);
      }
    };
    fetchCycles();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) {
      toast.error('Veuillez sélectionner un cycle');
      return;
    }
    if (!formData.title || !formData.session_date || !formData.session_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!currentUser?.id) {
      toast.error('Vous devez être connecté');
      return;
    }
    const scheduledDateTime = new Date(`${formData.session_date}T${formData.session_time}`);
    if (scheduledDateTime <= new Date()) {
      toast.error('La date et l\'heure doivent être dans le futur');
      return;
    }

    const scheduledTime = scheduledDateTime.toISOString();
    const meetingUrl = `https://meet.jit.si/formation-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    setSubmitting(true);
    try {
      const sessionData = {
        title: formData.title,
        description: formData.description || null,
        cycle_id: selectedCycle,
        course_id: null,
        formateur_id: currentUser.id,
        scheduled_time: scheduledTime,
        duration: parseInt(formData.duration) || 60,
        meeting_url: meetingUrl,
        status: 'scheduled',
        allow_screen_share: true,
        allow_recording: true,
        is_recording: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('live_sessions')
        .insert(sessionData)
        .select();
      if (error) throw error;

      const newSession = data?.[0];
      if (newSession) {
        // Notifier les apprenants PRO du cycle
        const formattedDate = new Date(scheduledTime).toLocaleDateString('fr-FR');
        const formattedTime = new Date(scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        await notifyCycleApprenants(
          selectedCycle,
          '📅 Nouvelle session live',
          `${formData.title} – ${formattedDate} à ${formattedTime}`,
          'session_started',
          `/live-session/${newSession.id}`
        );

        // Notifier l'admin du cycle et les super admins
        await notifyAdminAndSuperAdmins(
          selectedCycle,
          null,
          `📅 Nouvelle session live créée par ${currentUser.full_name}`,
          `${formData.title} – ${formattedDate} à ${formattedTime}`,
          'info',
          `/admin/live-sessions`
        );
      }

      toast.success('Session live programmée avec succès');
      navigate('/formateur');
    } catch (error) {
      console.error('Erreur création session:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la programmation'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/formateur')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programmer un Live</h1>
          <p className="text-muted-foreground">Configurez une nouvelle visioconférence pour vos apprenants.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Informations Principales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Cycle de formation <span className="text-destructive">*</span></Label>
              {loadingCycles ? (
                <Skeleton className="h-10 w-full" />
              ) : cycles.length === 0 ? (
                <div className="p-3 text-sm text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                  ⚠️ Aucun cycle disponible pour votre centre. Veuillez contacter votre administrateur.
                </div>
              ) : (
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map(cycle => (
                      <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                La session sera visible par les apprenants de ce cycle
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre de la session <span className="text-destructive">*</span></Label>
              <Input id="title" name="title" placeholder="Ex: Révision du module 1" value={formData.title} onChange={handleInputChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optionnelle)</Label>
              <Textarea id="description" name="description" placeholder="Ordre du jour de la session..." className="min-h-[100px] resize-none" value={formData.description} onChange={handleInputChange} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="session_date">Date <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="session_date" name="session_date" type="date" className="pl-9" value={formData.session_date} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_time">Heure <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="session_time" name="session_time" type="time" className="pl-9" value={formData.session_time} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée estimée (minutes)</Label>
              <Input id="duration" name="duration" type="number" min="15" max="480" step="15" placeholder="60" value={formData.duration} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Informations sur la visioconférence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>🔗 Lien de réunion :</strong> Un lien unique sera généré automatiquement lors de la création.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>🎥 Enregistrement :</strong> Les sessions peuvent être enregistrées pour permettre aux apprenants absents de les revoir.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>👥 Participants :</strong> Tous les apprenants du cycle sélectionné pourront rejoindre la session.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/formateur')}>Annuler</Button>
          <Button type="submit" disabled={submitting || !selectedCycle || cycles.length === 0} className="min-w-[200px]">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Générer la salle et planifier
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSession;