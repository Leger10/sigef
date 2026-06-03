// src/pages/FormateurDashboard.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import {
  BookOpen,
  Video,
  Users,
  Calendar,
  Layers,
  FileUp,
  HelpCircle,
  Trophy,
  Loader2,
  Shield,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import CycleChat from "@/components/apprenant/CycleChat.jsx";

// Composants
import CyclesManagement from "./formateur/CyclesManagement.jsx";
import LiveSessionsList from "./formateur/LiveSessionsList.jsx";
import FileManagement from "./formateur/FileManagement.jsx";
import QuizManagement from "./formateur/QuizManagement.jsx";
import LearnerTracking from "./formateur/LearnerTracking.jsx";
import RankingLeaderboard from "./formateur/RankingLeaderboard.jsx";

const FormateurDashboard = () => {
  const { currentUser } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    totalCourses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState("cycles");
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Récupérer les données du cycle sélectionné (statistiques, sessions à venir, cours récents)
  const fetchCycleData = async (cycleId) => {
    if (!cycleId) return;

    try {
      // Statistiques : apprenants, sessions, cours
      const [
        { count: studentsCount },
        { count: sessionsCount },
        { count: coursesCount },
      ] = await Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("cycle_id", cycleId)
          .eq("role", "apprenant"),
        supabase
          .from("live_sessions")
          .select("*", { count: "exact", head: true })
          .eq("cycle_id", cycleId),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("cycle_id", cycleId),
      ]);

      setStats({
        totalStudents: studentsCount || 0,
        totalSessions: sessionsCount || 0,
        totalCourses: coursesCount || 0,
      });

      // Sessions à venir (5 prochaines)
      const { data: sessionsData } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("cycle_id", cycleId)
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true })
        .limit(5);
      setSessions(sessionsData || []);

      // Cours récents (5 derniers)
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("created_at", { ascending: false })
        .limit(5);
      setCourses(coursesData || []);
    } catch (error) {
      console.error("Erreur chargement données cycle:", error);
      toast.error("Erreur lors du chargement des données du cycle");
    }
  };

  // Récupérer les messages non lus pour le chat
  const fetchUnreadMessagesCount = async (cycleId) => {
    if (!cycleId || !currentUser?.id) return;
    const storageKey = `chat_last_read_${cycleId}_${currentUser.id}`;
    const lastRead = localStorage.getItem(storageKey);
    const lastReadDate = lastRead ? lastRead : "2000-01-01T00:00:00.000Z";

    const { count, error } = await supabase
      .from("cycle_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .neq("user_id", currentUser.id)
      .gt("created_at", lastReadDate);

    if (!error) {
      setUnreadMessagesCount(count || 0);
    } else {
      console.error("Erreur comptage messages non lus:", error);
    }
  };

  // Chargement initial des cycles du formateur
  useEffect(() => {
    const fetchCycles = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        let adminId = currentUser.admin_id;
        if (!adminId) {
          const { data: userData } = await supabase
            .from("users")
            .select("admin_id, cycle_id")
            .eq("id", currentUser.id)
            .single();
          adminId = userData?.admin_id;
        }

        if (!adminId) {
          console.log("[FormateurDashboard] Aucun admin_id trouvé");
          setLoading(false);
          return;
        }

        const { data: cyclesData } = await supabase
          .from("cycles")
          .select("*")
          .eq("admin_id", adminId)
          .eq("is_active", true)
          .order("name");

        setCycles(cyclesData || []);

        if (cyclesData && cyclesData.length > 0) {
          const firstCycleId = cyclesData[0].id;
          setSelectedCycleId(firstCycleId);
          // Charger les données du premier cycle
          await fetchCycleData(firstCycleId);
          await fetchUnreadMessagesCount(firstCycleId);
        }
      } catch (error) {
        console.error("[FormateurDashboard] Erreur:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchCycles();
  }, [currentUser]);

  // Recharger les données quand le cycle sélectionné change
  useEffect(() => {
    if (selectedCycleId) {
      fetchCycleData(selectedCycleId);
      fetchUnreadMessagesCount(selectedCycleId);
    }
  }, [selectedCycleId]);

  // Rafraîchissement périodique des messages non lus
  useEffect(() => {
    if (!selectedCycleId) return;
    const interval = setInterval(() => {
      fetchUnreadMessagesCount(selectedCycleId);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedCycleId]);

  const handleCycleChange = async (cycleId) => {
    setSelectedCycleId(cycleId);
    // Les données seront rechargées via l'useEffect ci-dessus
  };

  const handleUnreadCountChange = (newCount) => {
    setUnreadMessagesCount(newCount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 pb-16 md:pb-0">
      <Helmet>
        <title>Espace Formateur - SIGEF</title>
      </Helmet>

      <Header />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:py-10">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Bonjour, {currentUser?.full_name?.split(" ")[0] || "Formateur"} 👋
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Gérez vos cycles de formation, animez vos sessions et suivez la
            progression de vos apprenants.
          </p>
        </div>

        {/* Sélecteur de cycle */}
        {cycles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Cycle actif
            </h2>
            <div className="flex flex-wrap gap-3">
              {cycles.map((cycle) => (
                <Button
                  key={cycle.id}
                  variant={selectedCycleId === cycle.id ? "default" : "outline"}
                  onClick={() => handleCycleChange(cycle.id)}
                  className="gap-2"
                >
                  {cycle.is_default && <Shield className="w-4 h-4" />}
                  {cycle.name}
                  {cycle.is_default && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      Défaut
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques du cycle actif */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Apprenants
                </p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Sessions Live
                </p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Cours
                </p>
                <p className="text-2xl font-bold">{stats.totalCourses}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aperçu rapide des sessions et cours (optionnel) */}
        {selectedCycleId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Sessions à venir
                </h3>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune session programmée.</p>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li key={s.id} className="text-sm">
                        {s.title} – {new Date(s.scheduled_time).toLocaleDateString("fr-FR")}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Derniers cours
                </h3>
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun cours disponible.</p>
                ) : (
                  <ul className="space-y-2">
                    {courses.map((c) => (
                      <li key={c.id} className="text-sm">{c.title}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs avec passage de l'ID du cycle à chaque composant */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col xl:flex-row gap-8 items-start"
        >
          <div className="w-full xl:w-64 shrink-0 xl:sticky xl:top-28 z-10 bg-background xl:bg-transparent pb-4 xl:pb-0">
            <TabsList className="flex flex-row xl:flex-col h-auto bg-card border shadow-sm p-2 justify-start overflow-x-auto w-full rounded-2xl gap-1">
              <TabsTrigger
                value="cycles"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <Layers className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">Cycles</span>
              </TabsTrigger>
              <TabsTrigger
                value="sessions"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <Calendar className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">
                  Sessions Live
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <FileUp className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">Fichiers</span>
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <HelpCircle className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">Quiz & Tests</span>
              </TabsTrigger>
              <TabsTrigger
                value="tracking"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <Users className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">
                  Suivi Apprenants
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="ranking"
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <Trophy className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline xl:inline">Classement</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full bg-background rounded-3xl p-4 sm:p-8 shadow-sm border min-h-[65vh]">
            <TabsContent
              value="cycles"
              className="m-0 focus-visible:outline-none"
            >
              <CyclesManagement />
            </TabsContent>

            <TabsContent
              value="sessions"
              className="m-0 focus-visible:outline-none"
            >
              <LiveSessionsList cycleId={selectedCycleId} />
            </TabsContent>

            <TabsContent
              value="files"
              className="m-0 focus-visible:outline-none"
            >
              <FileManagement cycleId={selectedCycleId} />
            </TabsContent>

            <TabsContent
              value="quiz"
              className="m-0 focus-visible:outline-none"
            >
              <QuizManagement cycleId={selectedCycleId} />
            </TabsContent>

            <TabsContent
              value="tracking"
              className="m-0 focus-visible:outline-none"
            >
              <LearnerTracking cycleId={selectedCycleId} />
            </TabsContent>

            <TabsContent
              value="ranking"
              className="m-0 focus-visible:outline-none"
            >
              <RankingLeaderboard cycleId={selectedCycleId} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Bouton flottant du chat */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          variant="outline"
          className="rounded-full shadow-lg bg-primary text-white hover:bg-primary/90 chat-attract relative"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
            </span>
          )}
        </Button>
      </div>

      {/* Fenêtre du chat */}
      {chatOpen && selectedCycleId && (
         <div className="fixed bottom-28 right-4 z-50 w-96 h-[500px] bg-background border rounded-xl shadow-2xl">
            <div className="flex justify-between items-center p-3 border-b bg-primary text-white rounded-t-xl">
              <h3 className="font-semibold">
              Chat du cycle : {selectedCycle?.name || "Non assigné"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-primary/80"
            >
              ✕
            </Button>
          </div>
          <CycleChat
            cycleId={selectedCycleId}
            userId={currentUser?.id}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FormateurDashboard;