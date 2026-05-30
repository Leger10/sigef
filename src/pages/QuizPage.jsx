// src/pages/QuizPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Award,
  Trophy,
  Clock,
  CheckCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import QuizTaker from "@/components/QuizTaker.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { toast } from "sonner";

const QuizPage = () => {
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      // Récupérer les quiz du cycle de l'utilisateur
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("cycle_id", currentUser?.cycle_id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (quizzesError) throw quizzesError;

      // Récupérer les tentatives de l'utilisateur
      const { data: responsesData, error: responsesError } = await supabase
        .from("quiz_attempts")
        .select("*, quiz:quiz_id(*)")
        .eq("user_id", currentUser?.id)
        .order("completed_at", { ascending: false });

      if (responsesError) throw responsesError;

      setQuizzes(quizzesData || []);
      setResponses(responsesData || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Erreur technique. Impossible de charger les évaluations.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = () => {
    setSelectedQuiz(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedQuiz) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold">{selectedQuiz.title}</h2>
            <Button variant="ghost" onClick={() => setSelectedQuiz(null)}>
              Abandonner
            </Button>
          </div>
          <QuizTaker quiz={selectedQuiz} onComplete={handleQuizComplete} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Évaluations et Quiz - SIGEF</title>
      </Helmet>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Quiz & Évaluations</h1>
            <p className="text-lg text-muted-foreground">
              Testez vos connaissances
            </p>
          </div>
        </div>

        <Tabs defaultValue="available" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="available">À faire</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {quizzes.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-3xl">
                <Award className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  Aucun quiz disponible
                </h2>
                <p className="text-muted-foreground">
                  De nouveaux quiz seront bientôt ajoutés.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map((quiz) => {
                  const completed = responses.find(
                    (r) => r.quiz_id === quiz.id,
                  );
                  return (
                    <div
                      key={quiz.id}
                      className="bg-card border rounded-2xl p-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-primary" />
                        {quiz.time_limit && (
                          <span className="text-sm">{quiz.time_limit} min</span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                      <p className="text-muted-foreground mb-4">
                        {quiz.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Seuil: {quiz.passing_score}%
                        </span>
                        <Button onClick={() => setSelectedQuiz(quiz)}>
                          {completed ? "Reprendre" : "Commencer"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {responses.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-3xl">
                <Trophy className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Aucun résultat</h2>
                <p className="text-muted-foreground">
                  Complétez un quiz pour voir vos scores.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className="bg-card border rounded-2xl p-6 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold">{response.quiz?.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(response.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {response.score}/{response.total_possible}
                      </p>
                      <p className="text-sm">
                        {Math.round(
                          (response.score / response.total_possible) * 100,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default QuizPage;
