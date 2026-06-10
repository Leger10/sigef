// src/pages/quiz/TakeQuiz.jsx - Version ultra simplifiée et garantie
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, Loader2, CheckCircle, XCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import useSound from 'use-sound';

import correctSound from '@/assets/correct.mp3';
import wrongSound from '@/assets/wrong.mp3';

const QUESTION_TIME_LIMIT = 30;

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [playCorrect] = useSound(correctSound, { volume: 0.5 });
  const [playWrong] = useSound(wrongSound, { volume: 0.5 });

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        if (quizError) throw quizError;
        setQuiz(quizData);

        if (quizData.pro_only) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('pro_status, pro_expiry')
            .eq('id', currentUser.id)
            .single();
          if (userError) throw userError;

          const isProActive = userData.pro_status === true && (!userData.pro_expiry || new Date(userData.pro_expiry) > new Date());
          if (!isProActive) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order', { ascending: true });
        if (questionsError) throw questionsError;

        if (!questionsData || questionsData.length === 0) {
          toast.error('Aucune question disponible pour ce quiz.');
          navigate('/apprenant');
          return;
        }
        setQuestions(questionsData);

        const saved = localStorage.getItem(`quiz_${quizId}_answers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
          const lastUnanswered = questionsData.findIndex(q => !parsed[q.id]);
          if (lastUnanswered !== -1) setCurrentIndex(lastUnanswered);
        }
      } catch (error) {
        console.error('Erreur chargement quiz:', error);
        toast.error('Impossible de charger le quiz');
        navigate('/apprenant');
      } finally {
        setLoading(false);
      }
    };

    if (quizId && currentUser) loadQuiz();
  }, [quizId, navigate, currentUser]);

  useEffect(() => {
    if (!questions.length) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(QUESTION_TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, questions.length]);

  const handleAnswer = (questionId, selectedAnswer) => {
    // Vérifier si déjà répondu
    if (answers[questionId]) return;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Normaliser les valeurs pour la comparaison
    const normalize = (str) => {
      if (!str) return '';
      return str.toString().trim();
    };

    const isCorrect = normalize(selectedAnswer) === normalize(question.correct_answer);
    
    if (isCorrect) playCorrect();
    else playWrong();

    let bonusPoints = 0;
    let totalPointsEarned = question.points;
    if (isCorrect) {
      const ratio = timeLeft / QUESTION_TIME_LIMIT;
      bonusPoints = Math.floor(question.points * ratio * 0.5);
      totalPointsEarned += bonusPoints;
    } else {
      totalPointsEarned = 0;
    }

    const newAnswer = {
      answer: selectedAnswer,
      isCorrect,
      earnedPoints: totalPointsEarned,
      bonus: bonusPoints,
      timeSpent: QUESTION_TIME_LIMIT - timeLeft,
    };
    
    setAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
    localStorage.setItem(
      `quiz_${quizId}_answers`,
      JSON.stringify({ ...answers, [questionId]: newAnswer })
    );

    setAnswerFeedback({ 
      isCorrect, 
      bonusPoints, 
      earnedPoints: totalPointsEarned,
      correctAnswer: question.correct_answer 
    });
    
    // Arrêter le timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Passer à la question suivante après 1.5 secondes
    setTimeout(() => {
      setAnswerFeedback(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        submitQuiz();
      }
    }, 1500);
  };

  const handleAutoNext = () => {
    const currentQ = questions[currentIndex];
    if (!answers[currentQ.id]) {
      // Réponse vide pour timeout
      handleAnswer(currentQ.id, '');
    } else if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    let totalScore = 0;
    let totalPossible = 0;
    const answersRecord = {};

    questions.forEach(q => {
      const userAnswer = answers[q.id];
      totalPossible += q.points;
      if (userAnswer?.isCorrect) totalScore += userAnswer.earnedPoints;
      answersRecord[q.id] = userAnswer;
    });

    const percentage = Math.round((totalScore / totalPossible) * 100);
    const passed = percentage >= (quiz?.passing_score || 70);

    try {
      const payload = {
        quiz_id: quizId,
        user_id: currentUser.id,
        score: totalScore,
        total_possible: totalPossible,
        percentage,
        passed,
        answers: answersRecord,
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('quiz_attempts').insert(payload);

      if (error) {
        console.error("Erreur Supabase détaillée :", error);
        toast.error(`Erreur d'enregistrement : ${error.message}`);
        return;
      }

      toast.success(`Quiz terminé ! Score : ${percentage}%`);
      navigate(`/quiz-result/${quizId}`, {
        state: { 
          score: totalScore, 
          totalPossible, 
          percentage, 
          passed, 
          answers: answersRecord, 
          questions,
          quizTitle: quiz?.title 
        },
      });
    } catch (error) {
      console.error('Exception submitQuiz:', error);
      toast.error('Erreur lors de l’enregistrement du quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-black">
        <Lock className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Accès réservé aux membres PRO</h1>
        <p className="text-gray-400 mb-6">
          Ce quiz est exclusivement accessible aux apprenants disposant d’un abonnement PRO actif.
        </p>
        <Button onClick={() => navigate('/apprenant')}>Retour au tableau de bord</Button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Aucune question disponible.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isAnswered = !!answers[currentQuestion.id];

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-white">
          <div>
            <h1 className="text-2xl font-bold">{quiz?.title}</h1>
            <p className="text-sm text-gray-400">Question {currentIndex + 1} / {questions.length}</p>
          </div>
          <div className="flex gap-4">
            {!isAnswered && (
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <Clock className="h-5 w-5" />
                <span className="font-mono text-xl">{timeLeft}s</span>
              </div>
            )}
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-8 bg-gray-700" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-900 border-gray-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
                <p className="text-sm text-gray-400">Points max : {currentQuestion.points}</p>
              </CardHeader>
              <CardContent>
                {/* QCM */}
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <RadioGroup
                    value={answers[currentQuestion.id]?.answer || ''}
                    onValueChange={(val) => !isAnswered && handleAnswer(currentQuestion.id, val)}
                    disabled={isAnswered}
                    className="space-y-3"
                  >
                    {currentQuestion.options.filter(opt => opt && opt.trim()).map((option, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                          answers[currentQuestion.id]?.answer === option
                            ? answers[currentQuestion.id]?.isCorrect
                              ? 'bg-green-800/50 border border-green-600'
                              : 'bg-red-800/50 border border-red-600'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <RadioGroupItem value={option} id={`q${currentQuestion.id}-opt${idx}`} />
                        <Label htmlFor={`q${currentQuestion.id}-opt${idx}`} className="flex-1 cursor-pointer text-white">
                          {option}
                        </Label>
                        {answers[currentQuestion.id]?.answer === option && (
                          answers[currentQuestion.id]?.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Vrai/Faux - Version avec boutons simples */}
                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        console.log('Vrai cliqué pour:', currentQuestion.id);
                        if (!isAnswered) handleAnswer(currentQuestion.id, 'Vrai');
                      }}
                      disabled={isAnswered}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
                        answers[currentQuestion.id]?.answer === 'Vrai'
                          ? answers[currentQuestion.id]?.isCorrect
                            ? 'bg-green-800/50 border-2 border-green-600'
                            : 'bg-red-800/50 border-2 border-red-600'
                          : 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-primary'
                      }`}
                    >
                      <span className="text-4xl mb-2">✅</span>
                      <span className="text-xl font-bold text-white">Vrai</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log('Faux cliqué pour:', currentQuestion.id);
                        if (!isAnswered) handleAnswer(currentQuestion.id, 'Faux');
                      }}
                      disabled={isAnswered}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
                        answers[currentQuestion.id]?.answer === 'Faux'
                          ? answers[currentQuestion.id]?.isCorrect
                            ? 'bg-green-800/50 border-2 border-green-600'
                            : 'bg-red-800/50 border-2 border-red-600'
                          : 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-primary'
                      }`}
                    >
                      <span className="text-4xl mb-2">❌</span>
                      <span className="text-xl font-bold text-white">Faux</span>
                    </button>
                  </div>
                )}

                {/* Feedback après réponse */}
                {answerFeedback && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-6 p-4 rounded-lg text-center bg-gray-800"
                  >
                    {answerFeedback.isCorrect ? (
                      <div className="text-green-400">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-xl font-bold">Bonne réponse !</p>
                        <p>+{answerFeedback.earnedPoints} points</p>
                        {answerFeedback.bonus > 0 && (
                          <p className="text-sm">Bonus rapidité : +{answerFeedback.bonus}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-400">
                        <XCircle className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-xl font-bold">Mauvaise réponse</p>
                        <p>La bonne réponse était : "{answerFeedback.correctAnswer}"</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Indicateur de progression */}
        <div className="mt-8 flex justify-center gap-2">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-yellow-400 w-12'
                  : answers[questions[idx].id]
                  ? 'bg-green-500 w-4'
                  : 'bg-gray-600 w-4'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;