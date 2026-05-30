// src/pages/ProgramDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  PlayCircle,
  MessageSquare,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useAccess } from "@/hooks/useAccess.js";
import { toast } from "sonner";

import ProgramLessons from "@/components/program/ProgramLessons.jsx";
import ProgramChat from "@/components/program/ProgramChat.jsx";

const ProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { checkAccess } = useAccess();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [stats, setStats] = useState({
    studentsCount: 0,
    rating: 0,
  });

  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        setLoading(true);

        // Récupérer le programme (cours)
        const { data: programData, error: programError } = await supabase
          .from("courses")
          .select("*, formateur:formateur_id(*)")
          .eq("id", id)
          .single();

        if (programError) throw programError;
        setProgram(programData);

        // Récupérer le nombre d'apprenants inscrits à ce cours
        const { count: studentsCount, error: countError } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("plan_id", id)
          .eq("status", "active");

        if (!countError) {
          setStats((prev) => ({ ...prev, studentsCount: studentsCount || 0 }));
        }

        // Vérifier si l'utilisateur est inscrit
        if (currentUser) {
          const { data: enrollData, error: enrollError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("plan_id", id)
            .eq("status", "active")
            .maybeSingle();

          if (!enrollError) {
            setIsEnrolled(!!enrollData);
          }
        }
      } catch (error) {
        console.error("Error fetching program:", error);
        toast.error("Programme introuvable");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProgramData();
  }, [id, currentUser, navigate]);

  const handleEnroll = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const access = checkAccess(program, false);
    if (!access.hasAccess) {
      navigate("/subscription");
      return;
    }

    try {
      setEnrolling(true);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { error } = await supabase.from("subscriptions").insert({
        user_id: currentUser.id,
        plan_id: program.id,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: expiryDate.toISOString(),
      });

      if (error) throw error;

      setIsEnrolled(true);
      toast.success("Inscription réussie !");

      // Mettre à jour le compteur
      setStats((prev) => ({ ...prev, studentsCount: prev.studentsCount + 1 }));
    } catch (error) {
      console.error("Enrollment error:", error);
      toast.error("Erreur lors de l'inscription");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!program) return null;

  const access = checkAccess(program, isEnrolled);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{program.title} - SIGEF</title>
      </Helmet>
      <Header />

      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {program.category && (
                  <Badge variant="secondary">{program.category}</Badge>
                )}
                {program.level && (
                  <Badge variant="outline" className="capitalize">
                    {program.level}
                  </Badge>
                )}
                {!program.is_public && (
                  <Badge variant="default">
                    <Lock className="w-3 h-3 mr-1" /> PRO
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">{program.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">
                {program.description ||
                  "Un programme complet pour maîtriser ce sujet."}
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                {program.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {program.duration}h
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> {stats.studentsCount} inscrits
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />{" "}
                  {stats.rating || "Nouveau"}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-card rounded-2xl border p-6">
                {!isEnrolled ? (
                  <div className="space-y-4">
                    <div className="text-3xl font-bold">
                      {program.is_public ? "Gratuit" : "Contenu PRO"}
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {access.hasAccess ? "S'inscrire" : "Débloquer avec PRO"}
                    </Button>
                    {!access.hasAccess && (
                      <p className="text-xs text-center text-muted-foreground">
                        Un abonnement PRO est requis pour accéder à ce programme
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-success/10 text-success p-3 rounded-lg text-center font-bold">
                      <CheckCircle2 className="w-4 h-4 inline mr-2" /> Inscrit
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      variant="outline"
                      asChild
                    >
                      <Link to={`/program/${program.id}/learn`}>
                        Continuer l'apprentissage
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-12">
        <Tabs defaultValue="lessons" className="w-full max-w-4xl mx-auto">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="lessons">
              <PlayCircle className="w-4 h-4 mr-2" /> Leçons
            </TabsTrigger>
            <TabsTrigger value="resources">
              <FileText className="w-4 h-4 mr-2" /> Ressources
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" /> Discussion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="mt-6">
            {isEnrolled || program.is_public ? (
              <ProgramLessons programId={program.id} isEnrolled={isEnrolled} />
            ) : (
              <div className="text-center py-20 border border-dashed rounded-3xl">
                <Lock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Contenu verrouillé</h3>
                <p className="text-muted-foreground mb-4">
                  Inscrivez-vous à ce programme pour accéder aux leçons.
                </p>
                <Button onClick={handleEnroll}>S'inscrire maintenant</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources">
            <div className="text-center py-20 border border-dashed rounded-3xl">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold">
                Ressources disponibles bientôt
              </h3>
              <p className="text-muted-foreground mt-2">
                Les documents et supports seront ajoutés prochainement.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <ProgramChat programId={program.id} isEnrolled={isEnrolled} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default ProgramDetail;
