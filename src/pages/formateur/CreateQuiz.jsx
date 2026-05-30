// src/pages/formateur/CreateQuiz.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { notifyCycleApprenants, notifyAdminAndSuperAdmins } from '@/services/notificationService';

const CreateQuiz = () => {
  const { cycleId: paramCycleId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(paramCycleId || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time_limit: null,
    passing_score: 70,
    max_attempts: 1,
    is_published: true,
    show_correct_answers: true,
    randomize_questions: false,
    pro_only: false,
  });

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        let adminId = currentUser?.admin_id;
        if (!adminId && currentUser?.id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('admin_id')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (userError) throw userError;
          adminId = userData?.admin_id;
        }

        if (!adminId) {
          setCycles([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('cycles')
          .select('id, name')
          .eq('is_active', true)
          .eq('admin_id', adminId)
          .order('name');

        if (error) throw error;

        setCycles(data || []);
        if (!paramCycleId && data && data.length > 0) {
          setSelectedCycle(data[0].id);
        } else if (paramCycleId && data.some(c => c.id === paramCycleId)) {
          setSelectedCycle(paramCycleId);
        } else {
          setSelectedCycle('');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erreur lors du chargement des cycles');
        setCycles([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.id) fetchCycles();
    else setLoading(false);
  }, [currentUser, paramCycleId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? parseInt(value) : null) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) {
      toast.error('Veuillez sélectionner un cycle');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Le titre du quiz est obligatoire');
      return;
    }

    setSubmitting(true);
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert({
          cycle_id: selectedCycle,
          title: formData.title,
          description: formData.description,
          time_limit: formData.time_limit,
          passing_score: formData.passing_score,
          max_attempts: formData.max_attempts,
          is_published: formData.is_published,
          show_correct_answers: formData.show_correct_answers,
          randomize_questions: formData.randomize_questions,
          pro_only: formData.pro_only,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      const cycle = cycles.find(c => c.id === selectedCycle);
      const cycleName = cycle?.name || 'ce cycle';

      await notifyCycleApprenants(
        selectedCycle,
        '📝 Nouveau quiz disponible',
        `Le quiz "${formData.title}" a été ajouté au cycle ${cycleName}.`,
        'quiz',
        `/quiz/${quiz.id}`
      );

      await notifyAdminAndSuperAdmins(
        selectedCycle,
        null,
        `📝 Nouveau quiz créé par ${currentUser.full_name || currentUser.email}`,
        `Quiz "${formData.title}" ajouté au cycle ${cycleName}.`,
        'quiz',
        `/admin/quiz-management`
      );

      toast.success('Quiz créé avec succès');
      navigate(`/formateur/add-quiz-questions/${quiz.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la création du quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Chargement des cycles...</p>
      </div>
    );
  }

  if (cycles.length === 0 && !loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-muted-foreground">Vous n'êtes rattaché à aucun cycle. Contactez votre administrateur.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/formateur')}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/formateur')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Créer un Quiz</h1>
          <p className="text-muted-foreground">Créez un questionnaire pour évaluer vos apprenants.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cycle de formation</Label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle} required>
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

            <div className="space-y-2">
              <Label htmlFor="title">Titre du quiz *</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Public cible</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pro_only"
                    checked={!formData.pro_only}
                    onChange={() => setFormData(prev => ({ ...prev, pro_only: false }))}
                  />
                  <span>Tous les apprenants</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pro_only"
                    checked={formData.pro_only}
                    onChange={() => setFormData(prev => ({ ...prev, pro_only: true }))}
                  />
                  <span>Réservé aux abonnés PRO</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_limit">Temps limite (minutes)</Label>
                <Input id="time_limit" name="time_limit" type="number" min="0" value={formData.time_limit || ''} onChange={handleChange} placeholder="Illimité" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passing_score">Score de réussite (%)</Label>
                <Input id="passing_score" name="passing_score" type="number" min="0" max="100" value={formData.passing_score} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_attempts">Tentatives maximum</Label>
                <Input id="max_attempts" name="max_attempts" type="number" min="1" value={formData.max_attempts} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_published" checked={formData.is_published} onChange={handleChange} />
                    <span>Publier immédiatement</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="show_correct_answers" checked={formData.show_correct_answers} onChange={handleChange} />
                    <span>Afficher les bonnes réponses après le quiz</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="randomize_questions" checked={formData.randomize_questions} onChange={handleChange} />
                    <span>Mélanger l'ordre des questions</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/formateur')}>Annuler</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Créer et ajouter des questions
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuiz;