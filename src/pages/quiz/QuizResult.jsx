// src/pages/quiz/QuizResult.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Trophy, Medal, ArrowLeft, Home } from 'lucide-react';
import { toast } from 'sonner';

const QuizResult = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stateData = location.state;
        
        if (stateData && stateData.questions && stateData.answers) {
          // Données transmises par TakeQuiz
          setQuiz({ title: stateData.quizTitle || 'Quiz', passing_score: 70 });
          setQuestions(stateData.questions);
          setAttempt({
            score: stateData.score,
            total_possible: stateData.totalPossible,
            percentage: stateData.percentage,
            passed: stateData.passed,
            answers: stateData.answers,
            completed_at: new Date().toISOString()
          });
          await calculateRank(stateData.percentage);
        } else {
          // Récupération depuis la base
          const [quizRes, questionsRes, attemptRes] = await Promise.all([
            supabase.from('quizzes').select('*').eq('id', quizId).single(),
            supabase.from('questions').select('*').eq('quiz_id', quizId).order('order', { ascending: true }),
            supabase.from('quiz_attempts')
              .select('*')
              .eq('quiz_id', quizId)
              .eq('user_id', currentUser.id)
              .order('completed_at', { ascending: false })
              .limit(1)
              .single()
          ]);

          if (quizRes.error) throw quizRes.error;
          if (questionsRes.error) throw questionsRes.error;
          if (attemptRes.error) throw attemptRes.error;

          setQuiz(quizRes.data);
          setQuestions(questionsRes.data || []);
          setAttempt(attemptRes.data);
          await calculateRank(attemptRes.data.percentage);
        }
      } catch (error) {
        console.error('Erreur chargement résultat:', error);
        toast.error('Impossible de charger les résultats');
        navigate('/apprenant');
      } finally {
        setLoading(false);
      }
    };

    const calculateRank = async (userPercentage) => {
      try {
        const { data: allAttempts, error } = await supabase
          .from('quiz_attempts')
          .select('user_id, percentage')
          .eq('quiz_id', quizId)
          .order('percentage', { ascending: false });
        
        if (error) throw error;
        
        if (allAttempts && allAttempts.length > 0) {
          const userBestScores = new Map();
          for (const att of allAttempts) {
            const existing = userBestScores.get(att.user_id);
            if (!existing || att.percentage > existing.percentage) {
              userBestScores.set(att.user_id, att.percentage);
            }
          }
          const uniqueScores = Array.from(userBestScores.entries()).map(([userId, pct]) => ({ user_id: userId, percentage: pct }));
          uniqueScores.sort((a, b) => b.percentage - a.percentage);
          const userRank = uniqueScores.findIndex(u => u.user_id === currentUser.id) + 1;
          setRank(userRank > 0 ? userRank : uniqueScores.length + 1);
        } else {
          setRank(1);
        }
      } catch (error) {
        console.error('Erreur calcul rang:', error);
        setRank(null);
      }
    };

    if (quizId && currentUser) fetchData();
  }, [quizId, currentUser, location.state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Aucun résultat trouvé</h1>
        <Button onClick={() => navigate('/apprenant')}>Retour au tableau de bord</Button>
      </div>
    );
  }

  const percentage = attempt.percentage;
  const passed = attempt.passed;
  const correctCount = questions.filter(q => attempt.answers?.[q.id]?.isCorrect).length;
  const wrongCount = questions.length - correctCount;
  
  const getMedal = () => {
    if (rank === 1) return <Medal className="h-8 w-8 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-8 w-8 text-gray-400" />;
    if (rank === 3) return <Medal className="h-8 w-8 text-amber-600" />;
    return <Trophy className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate('/apprenant')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Tableau de bord
          </Button>
          <Button variant="outline" className="text-gray-400 hover:text-white" onClick={() => navigate('/apprenant?tab=quizzes')}>
            <Home className="h-4 w-4 mr-2" /> Tous les quiz
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{quiz?.title || 'Quiz'}</h1>
          <p className="text-gray-400">Complété le {new Date(attempt.completed_at).toLocaleDateString('fr-FR')}</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
                <p className="text-gray-400">{attempt.score} / {attempt.total_possible} points</p>
                <Badge className={passed ? 'bg-green-600 mt-2' : 'bg-red-600 mt-2'}>
                  {passed ? 'Réussi ✓' : 'Échec ✗'}
                </Badge>
              </div>

              <div className="flex-1 w-full">
                <Progress value={percentage} className="h-3 bg-gray-700" indicatorClassName={passed ? 'bg-green-500' : 'bg-red-500'} />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>0%</span>
                  <span>Seuil: {quiz?.passing_score || 70}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex gap-6 text-center">
                <div>
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-2xl font-bold">{correctCount}</span>
                  </div>
                  <p className="text-xs text-gray-500">Bonne(s)</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-5 w-5" />
                    <span className="text-2xl font-bold">{wrongCount}</span>
                  </div>
                  <p className="text-xs text-gray-500">Mauvaise(s)</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 justify-center">
                    {getMedal()}
                    <span className="text-2xl font-bold text-yellow-400 ml-1">#{rank || '?'}</span>
                  </div>
                  <p className="text-xs text-gray-500">Classement</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-white mb-4">Détail des réponses</h2>
        <div className="space-y-4">
          {questions.map((question, index) => {
            const userAnswer = attempt.answers?.[question.id];
            const isCorrect = userAnswer?.isCorrect || false;
            return (
              <Card key={question.id} className={`bg-gray-900 border ${isCorrect ? 'border-green-800' : 'border-red-800'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white text-lg">
                      Question {index + 1} : {question.question}
                    </CardTitle>
                    {isCorrect ? <CheckCircle className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Votre réponse :</p>
                      <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {userAnswer?.answer || 'Non répondue'}
                      </p>
                    </div>
                    {!isCorrect && (
                      <div>
                        <p className="text-sm text-gray-400">Bonne réponse :</p>
                        <p className="font-medium text-green-400">{question.correct_answer}</p>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-500 pt-2">
                      <span>Points max: {question.points}</span>
                      {isCorrect && (
                        <span className="text-green-400">
                          +{userAnswer?.earnedPoints} points
                          {userAnswer?.bonus > 0 && ` (dont ${userAnswer.bonus} bonus)`}
                        </span>
                      )}
                      {!isCorrect && <span className="text-red-400">0 point</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/apprenant')} size="lg">Retour au tableau de bord</Button>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;