// src/pages/formateur/QuizManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { HelpCircle, Plus, Edit2, BarChart2, Loader2, CheckCircle, Users, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import QuizParticipantsModal from '@/components/formateur/QuizParticipantsModal';

const QuizManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedQuizForParticipants, setSelectedQuizForParticipants] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    passing_score: 70,
    time_limit: null,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cycle_id: '',
    passing_score: 70,
    time_limit: null
  });

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
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
        setQuizzes([]);
        setLoading(false);
        return;
      }

      const { data: cyclesData, error: cyclesError } = await supabase
        .from('cycles')
        .select('id, name')
        .eq('is_active', true)
        .eq('admin_id', adminId)
        .order('name');

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      const cycleIds = (cyclesData || []).map(c => c.id);
      const filteredQuizzes = (quizzesData || []).filter(quiz => cycleIds.includes(quiz.cycle_id));

      // Récupérer le nombre de participants pour chaque quiz
      const quizIds = filteredQuizzes.map(q => q.id);
      let participantsCountMap = new Map();
      if (quizIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, user_id')
          .in('quiz_id', quizIds);
        if (!attemptsError && attemptsData) {
          // Compter distinct user_id par quiz
          const countMap = new Map();
          attemptsData.forEach(attempt => {
            const quizId = attempt.quiz_id;
            if (!countMap.has(quizId)) countMap.set(quizId, new Set());
            countMap.get(quizId).add(attempt.user_id);
          });
          countMap.forEach((usersSet, qId) => {
            participantsCountMap.set(qId, usersSet.size);
          });
        }
      }

      const quizzesWithCycle = filteredQuizzes.map(quiz => ({
        ...quiz,
        cycles: cyclesData?.find(cycle => cycle.id === quiz.cycle_id) || { name: 'Cycle inconnu' },
        participantsCount: participantsCountMap.get(quiz.id) || 0
      }));

      setQuizzes(quizzesWithCycle);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.cycle_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          title: formData.title,
          description: formData.description,
          cycle_id: formData.cycle_id,
          passing_score: formData.passing_score,
          time_limit: formData.time_limit,
          is_published: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Quiz créé avec succès');
      setIsModalOpen(false);
      setFormData({ title: '', description: '', cycle_id: '', passing_score: 70, time_limit: null });
      fetchData();
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Erreur lors de la création du quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const publishQuiz = async (id) => {
    setPublishingId(id);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Quiz publié avec succès !');
      fetchData();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishingId(null);
    }
  };

  const deleteQuiz = async (id) => {
    if (!window.confirm('Supprimer définitivement ce quiz ? Toutes les questions associées seront également supprimées.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Quiz supprimé avec succès');
      fetchData();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (quiz) => {
    setEditingQuiz(quiz);
    setEditFormData({
      title: quiz.title,
      description: quiz.description || '',
      passing_score: quiz.passing_score,
      time_limit: quiz.time_limit,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    setEditSubmitting(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: editFormData.title,
          description: editFormData.description,
          passing_score: editFormData.passing_score,
          time_limit: editFormData.time_limit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingQuiz.id);

      if (error) throw error;

      toast.success('Quiz modifié avec succès');
      setEditingQuiz(null);
      fetchData();
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-card rounded-2xl border overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border-b">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Quiz & Tests</h2>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau Quiz</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un nouveau quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Titre du quiz <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cycle <span className="text-destructive">*</span></Label>
                <Select value={formData.cycle_id} onValueChange={v => setFormData({...formData, cycle_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger>
                  <SelectContent>
                    {cycles.map(cycle => <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Score de réussite (%)</Label>
                  <Input type="number" min="0" max="100" value={formData.passing_score} onChange={e => setFormData({...formData, passing_score: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Limite de temps (minutes)</Label>
                  <Input type="number" min="1" placeholder="Illimité" value={formData.time_limit || ''} onChange={e => setFormData({...formData, time_limit: e.target.value ? parseInt(e.target.value) : null})} />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Créer le quiz
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Seuil réussite</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  Aucun quiz créé.
                  <p className="text-sm mt-2">Cliquez sur "Nouveau Quiz" pour commencer.</p>
                </TableCell>
              </TableRow>
            ) : (
              quizzes.map(quiz => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">{quiz.title}</TableCell>
                  <TableCell>{quiz.cycles?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={quiz.passing_score >= 70 ? 'border-green-500 text-green-600' : ''}>
                      {quiz.passing_score}%
                    </Badge>
                  </TableCell>
                  <TableCell>{quiz.time_limit ? `${quiz.time_limit} min` : 'Illimité'}</TableCell>
                  <TableCell>
                    {quiz.is_published ? (
                      <Badge className="bg-green-500 text-white">Publié</Badge>
                    ) : (
                      <Badge variant="secondary">Brouillon</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {!quiz.is_published && (
                        <Button variant="default" size="sm" onClick={() => publishQuiz(quiz.id)} disabled={publishingId === quiz.id}>
                          {publishingId === quiz.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                          Publier
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEditModal(quiz)}>
                        <Pencil className="h-4 w-4 mr-2" /> Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/formateur/add-quiz-questions/${quiz.id}`)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Questions
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setSelectedQuizForParticipants(quiz)}>
                        <Users className="h-4 w-4 mr-2" /> 
                        Participants ({quiz.participantsCount})
                      </Button>
                      <Button variant="secondary" size="sm">
                        <BarChart2 className="h-4 w-4 mr-2" /> Résultats
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteQuiz(quiz.id)} disabled={deletingId === quiz.id}>
                        {deletingId === quiz.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal d'édition */}
      <Dialog open={!!editingQuiz} onOpenChange={(open) => !open && setEditingQuiz(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le quiz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Titre du quiz *</Label>
              <Input value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score de réussite (%)</Label>
                <Input type="number" min="0" max="100" value={editFormData.passing_score} onChange={e => setEditFormData({...editFormData, passing_score: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Limite de temps (minutes)</Label>
                <Input type="number" min="1" placeholder="Illimité" value={editFormData.time_limit || ''} onChange={e => setEditFormData({...editFormData, time_limit: e.target.value ? parseInt(e.target.value) : null})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setEditingQuiz(null)}>Annuler</Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal des participants */}
      {selectedQuizForParticipants && (
        <QuizParticipantsModal
          quizId={selectedQuizForParticipants.id}
          quizTitle={selectedQuizForParticipants.title}
          open={!!selectedQuizForParticipants}
          onClose={() => setSelectedQuizForParticipants(null)}
        />
      )}
    </div>
  );
};

export default QuizManagement;