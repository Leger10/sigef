import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const QuizTaker = ({ quiz, onComplete }) => {
  const { currentUser } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

  const questions = quiz.questions || [];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (questionIndex, answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateScore();
    }
  };

  const calculateScore = async () => {
    let correctCount = 0;
    
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setShowResults(true);
    setSaving(true);

    try {
      // Sauvegarder la tentative de quiz
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: currentUser.id,
          quiz_id: quiz.id,
          score: correctCount,
          total_possible: questions.length,
          answers: answers,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Quiz enregistré avec succès.');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Échec de la sauvegarde du quiz:', error);
      toast.error('Une erreur est survenue lors de l\'enregistrement des résultats.');
    } finally {
      setSaving(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-card text-card-foreground border border-border text-center py-16 px-6 rounded-2xl">
        <p className="text-muted-foreground text-lg">Aucune question n'est disponible pour ce quiz.</p>
      </div>
    );
  }

  if (showResults) {
    const percentage = (score / questions.length) * 100;
    
    return (
      <div className="bg-card text-card-foreground rounded-2xl p-8 text-center shadow-lg border border-border">
        <div className="mb-8">
          {percentage >= 70 ? (
            <CheckCircle2 className="w-24 h-24 text-primary mx-auto mb-6 drop-shadow-sm" />
          ) : (
            <XCircle className="w-24 h-24 text-destructive mx-auto mb-6 drop-shadow-sm" />
          )}
          <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Terminé !</h2>
          <p className="text-lg text-muted-foreground">Voici votre résultat pour ce quiz.</p>
        </div>

        <div className="bg-muted/50 rounded-2xl p-8 mb-8 border border-border/50">
          <div className="text-6xl font-black text-primary mb-3 tabular-nums tracking-tighter">
            {score}/{questions.length}
          </div>
          <p className="text-base font-medium text-muted-foreground">Réponses correctes</p>
          <div className="mt-6">
            <Progress value={percentage} className="h-3" />
            <p className="text-sm font-semibold text-muted-foreground mt-3 tabular-nums">
              Score total : {percentage.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-primary/10 rounded-2xl p-6 border border-primary/20">
            <div className="text-3xl font-bold text-primary tabular-nums mb-1">{score}</div>
            <p className="text-sm font-medium text-primary/80">Bonnes réponses</p>
          </div>
          <div className="bg-destructive/10 rounded-2xl p-6 border border-destructive/20">
            <div className="text-3xl font-bold text-destructive tabular-nums mb-1">
              {questions.length - score}
            </div>
            <p className="text-sm font-medium text-destructive/80">Mauvaises réponses</p>
          </div>
        </div>

        {saving && (
          <div className="mb-4 text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sauvegarde des résultats...
          </div>
        )}

        <Button onClick={() => window.location.reload()} size="lg" className="w-full text-lg">
          <RotateCcw className="w-5 h-5 mr-2" />
          Retourner à la liste des quiz
        </Button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-8 shadow-sm border border-border">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Question {currentQuestion + 1} sur {questions.length}
          </span>
          <span className="text-sm font-bold text-primary tabular-nums">
            {progress.toFixed(0)}% complété
          </span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      <h3 className="text-2xl font-bold mb-8 leading-snug">{question.question}</h3>

      <div className="space-y-4 mb-8">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(currentQuestion, option)}
            className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              answers[currentQuestion] === option
                ? 'border-primary bg-primary/5 shadow-sm scale-[0.99]'
                : 'border-border hover:border-primary/40 bg-background hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  answers[currentQuestion] === option
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                }`}
              >
                {answers[currentQuestion] === option && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
              <span className="text-lg">{option}</span>
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={!answers[currentQuestion]}
        size="lg"
        className="w-full text-lg transition-all"
      >
        {currentQuestion < questions.length - 1 ? (
          <>
            Question suivante
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        ) : (
          'Terminer le quiz'
        )}
      </Button>
    </div>
  );
};

export default QuizTaker;
