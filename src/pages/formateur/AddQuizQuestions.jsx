// src/pages/formateur/AddQuizQuestions.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Plus, Trash2, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AddQuizQuestions = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: 'multiple_choice', // 'multiple_choice' ou 'true_false'
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1
  });

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        if (quizError) throw quizError;
        setQuiz(quizData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order', { ascending: true });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      } catch (error) {
        console.error(error);
        toast.error('Erreur lors du chargement du quiz');
      } finally {
        setLoading(false);
      }
    };
    if (quizId) fetchQuiz();
  }, [quizId]);

  const handleAddQuestion = async () => {
    if (!currentQuestion.question.trim()) {
      toast.error('Veuillez saisir le texte de la question');
      return;
    }

    if (currentQuestion.type === 'multiple_choice') {
      const validOptions = currentQuestion.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error('Ajoutez au moins 2 options de réponse');
        return;
      }
      if (!currentQuestion.correct_answer) {
        toast.error('Sélectionnez la réponse correcte');
        return;
      }
    } else if (currentQuestion.type === 'true_false') {
      if (!currentQuestion.correct_answer) {
        toast.error('Sélectionnez Vrai ou Faux');
        return;
      }
    }

    setSubmitting(true);
    try {
      const newOrder = questions.length + 1;
      let questionData = {
        quiz_id: quizId,
        question: currentQuestion.question,
        type: currentQuestion.type,
        points: currentQuestion.points,
        order: newOrder
      };

      if (currentQuestion.type === 'multiple_choice') {
        questionData.options = currentQuestion.options;
        questionData.correct_answer = currentQuestion.correct_answer;
      } else if (currentQuestion.type === 'true_false') {
        questionData.options = ['Vrai', 'Faux'];
        questionData.correct_answer = currentQuestion.correct_answer;
      }

      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);
      setCurrentQuestion({
        question: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 1
      });
      toast.success('Question ajoutée');
    } catch (error) {
      console.error(error);
      toast.error(`Erreur lors de l'ajout : ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;

      const remaining = questions.filter(q => q.id !== questionId);
      const updated = remaining.map((q, idx) => ({ ...q, order: idx + 1 }));
      for (const q of updated) {
        await supabase.from('questions').update({ order: q.order }).eq('id', q.id);
      }
      setQuestions(updated);
      toast.success('Question supprimée');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePublishQuiz = async () => {
    if (questions.length === 0) {
      toast.error('Ajoutez au moins une question avant de publier');
      return;
    }
    try {
      await supabase.from('quizzes').update({ is_published: true }).eq('id', quizId);
      toast.success('Quiz publié avec succès !');
      navigate('/formateur');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la publication');
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Quiz non trouvé</h2>
        <Button className="mt-4" onClick={() => navigate('/formateur')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/formateur')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajouter des Questions</h1>
            <p className="text-muted-foreground">Quiz : {quiz.title} | {questions.length} question(s)</p>
          </div>
        </div>
        <Button onClick={handlePublishQuiz} disabled={questions.length === 0}>
          <CheckCircle className="h-4 w-4 mr-2" /> Publier le quiz
        </Button>
      </div>

      {questions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Questions ({questions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 border rounded-lg bg-muted/20">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Q{idx + 1}</Badge>
                      <Badge variant="secondary">{q.points} pt(s)</Badge>
                      <Badge variant="outline">{q.type === 'multiple_choice' ? 'QCM' : 'Vrai/Faux'}</Badge>
                    </div>
                    <p className="font-medium">{q.question}</p>
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.filter(opt => opt).map((opt, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {opt === q.correct_answer ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'true_false' && (
                      <div className="mt-2">
                        <Badge className={q.correct_answer === 'Vrai' ? 'bg-green-500' : 'bg-red-500'}>
                          Réponse correcte : {q.correct_answer}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(q.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Nouvelle question</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Type de question</Label>
            <Select value={currentQuestion.type} onValueChange={(v) => setCurrentQuestion({...currentQuestion, type: v, correct_answer: ''})}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Choix multiples (QCM)</SelectItem>
                <SelectItem value="true_false">Vrai / Faux</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Texte de la question</Label>
            <Textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
              placeholder="Saisissez votre question ici..."
              className="min-h-[100px]"
            />
          </div>

          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              <Label>Options de réponse</Label>
              {currentQuestion.options.map((opt, idx) => (
                <Input key={idx} value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Option ${idx + 1}`} className="mb-2" />
              ))}
              <div className="space-y-2">
                <Label>Réponse correcte</Label>
                <Select value={currentQuestion.correct_answer} onValueChange={(v) => setCurrentQuestion({...currentQuestion, correct_answer: v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez la bonne réponse" /></SelectTrigger>
                  <SelectContent>
                    {currentQuestion.options.filter(opt => opt.trim()).map((opt, idx) => (
                      <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentQuestion.type === 'true_false' && (
            <div className="space-y-2">
              <Label>Réponse correcte</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tf"
                    value="Vrai"
                    checked={currentQuestion.correct_answer === 'Vrai'}
                    onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 'Vrai'})}
                  />
                  Vrai
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tf"
                    value="Faux"
                    checked={currentQuestion.correct_answer === 'Faux'}
                    onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 'Faux'})}
                  />
                  Faux
                </label>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Points</Label>
            <Input type="number" min="1" max="10" value={currentQuestion.points} onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value) || 1})} className="w-32" />
          </div>

          <Button onClick={handleAddQuestion} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Ajouter la question
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddQuizQuestions;