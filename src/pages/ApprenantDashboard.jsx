// src/pages/ApprenantDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Video,
  FileText,
  Trophy,
  Crown,
  Calendar,
  Clock,
  PlayCircle,
  Lock,
  AlertCircle,
  Shield,
  History,
  User,
  MessageSquare,
  Download,
  Image,
  FileArchive,
  File,
  ChevronUp,
  ChevronDown,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import SubscriptionTimer from "@/components/SubscriptionTimer.jsx";
import CycleChat from "@/components/apprenant/CycleChat.jsx";

// ------------------------------------------------------------
// Composant : Liste des documents partagés (avec filtre visibilité)
// ------------------------------------------------------------
const DocumentsList = ({ cycleId, hasActivePro, refreshKey }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const getFileIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "image":
        return <Image className="h-5 w-5 text-blue-500" />;
      case "video":
        return <Video className="h-5 w-5 text-purple-500" />;
      case "archive":
        return <FileArchive className="h-5 w-5 text-amber-500" />;
      default:
        return <File className="h-5 w-5 text-primary" />;
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!cycleId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("cycle_id", cycleId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const filtered = (data || []).filter((doc) => {
          const vis = doc.visibility || "all";
          if (vis === "all") return true;
          if (vis === "pro_only" && hasActivePro) return true;
          if (vis === "standard_only" && !hasActivePro) return true;
          return false;
        });

        setDocuments(filtered);
      } catch (err) {
        console.error("Erreur chargement documents:", err);
        toast.error("Impossible de charger les ressources");
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [cycleId, hasActivePro, refreshKey]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (documents.length === 0)
    return (
      <p className="text-center text-muted-foreground">
        Aucun document partagé pour le moment.
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {getFileIcon(doc.file_type)}
              <CardTitle className="text-base truncate">{doc.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {doc.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{doc.file_name?.split(".").pop()?.toUpperCase()}</span>
              <span>
                {new Date(doc.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              asChild
            >
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Télécharger
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ------------------------------------------------------------
// Composant : Liste des programmes (cours)
// ------------------------------------------------------------
const ProgramsList = ({ cycleId }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cycleId) return;
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("cycle_id", cycleId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [cycleId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (courses.length === 0)
    return (
      <p className="text-center text-gray-400">Aucun programme disponible.</p>
    );

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <Card key={course.id}>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> {course.title}
            </CardTitle>
            {course.duration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {course.duration} min
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {course.description || "Aucune description."}
            </p>
            {course.video_url && (
              <div className="aspect-video rounded-lg overflow-hidden mb-3">
                <iframe
                  src={course.video_url}
                  className="w-full h-full"
                  allowFullScreen
                  title={course.title}
                />
              </div>
            )}
            {course.content && (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: course.content }}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ------------------------------------------------------------
// Composant : Historique des sessions
// ------------------------------------------------------------
const SessionHistory = ({ cycleId, userId, hasActivePro }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!cycleId) return;
      try {
        const { data, error } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("cycle_id", cycleId)
          .in("status", ["ended", "cancelled"])
          .order("scheduled_time", { ascending: false })
          .limit(50);
        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Error fetching session history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPastSessions();
  }, [cycleId, userId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (sessions.length === 0)
    return (
      <p className="text-center text-gray-400">
        Aucune session passée trouvée.
      </p>
    );

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.id} className="premium-card">
          <CardContent>
            {session.description && (
              <p className="text-muted-foreground mb-4">
                {session.description}
              </p>
            )}
            {session.recording_url ? (
              session.visibility === "all" ||
              (session.visibility === "pro_only" && hasActivePro) ? (
                <Button
                  variant="default"
                  className="bg-gradient-to-r from-primary to-secondary animate-pulse shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                  asChild
                >
                  <a
                    href={session.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Video className="h-4 w-4 mr-2" /> Revoir le live
                  </a>
                </Button>
              ) : session.visibility === "pro_only" && !hasActivePro ? (
                <Button variant="outline" disabled>
                  <Lock className="h-4 w-4 mr-2" /> PRO requis
                </Button>
              ) : null
            ) : (
              <p className="text-sm text-amber-500">Replay non disponible</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ------------------------------------------------------------
// Composant principal : Tableau de bord Apprenant
// ------------------------------------------------------------
const ApprenantDashboard = () => {
  const { currentUser } = useAuth();
  const [contents, setContents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [quizScores, setQuizScores] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userData, setUserData] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [availableCycles, setAvailableCycles] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);

  const [newCoursesCount, setNewCoursesCount] = useState(0);
  const [newDocsCount, setNewDocsCount] = useState(0);
  const [newUpcomingSessionsCount, setNewUpcomingSessionsCount] = useState(0);
  const [newHistorySessionsCount, setNewHistorySessionsCount] = useState(0);
  const [newQuizzesCount, setNewQuizzesCount] = useState(0);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);

  const [expandedSections, setExpandedSections] = useState({
    sessions: true,
    quizzes: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_time);
    const end = new Date(start.getTime() + (session.duration || 60) * 60000);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

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
    if (!error) setUnreadMessagesCount(count || 0);
  };

  const fetchNewCoursesCount = useCallback(async () => {
    if (!userData?.cycle_id || !currentUser?.id) return;
    const key = `last_courses_view_${userData.cycle_id}_${currentUser.id}`;
    const lastView = localStorage.getItem(key);
    const lastViewDate = lastView ? new Date(lastView) : new Date(0);
    const { count, error } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", userData.cycle_id)
      .gt("created_at", lastViewDate.toISOString());
    if (!error) setNewCoursesCount(count || 0);
  }, [userData?.cycle_id, currentUser?.id]);

  const fetchNewDocumentsCount = useCallback(async () => {
    if (!userData?.cycle_id || !currentUser?.id) return;
    const key = `last_docs_view_${userData.cycle_id}_${currentUser.id}`;
    const lastView = localStorage.getItem(key);
    const lastViewDate = lastView ? new Date(lastView) : new Date(0);
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", userData.cycle_id)
      .gt("created_at", lastViewDate.toISOString());
    if (!error) setNewDocsCount(count || 0);
  }, [userData?.cycle_id, currentUser?.id]);

  const fetchNewUpcomingSessionsCount = useCallback(async () => {
    if (!userData?.cycle_id || !currentUser?.id) return;
    const key = `last_upcoming_view_${userData.cycle_id}_${currentUser.id}`;
    const lastView = localStorage.getItem(key);
    const lastViewDate = lastView ? new Date(lastView) : new Date(0);
    const { count, error } = await supabase
      .from("live_sessions")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", userData.cycle_id)
      .eq("status", "scheduled")
      .gt("created_at", lastViewDate.toISOString());
    if (!error) setNewUpcomingSessionsCount(count || 0);
  }, [userData?.cycle_id, currentUser?.id]);

  const fetchNewHistorySessionsCount = useCallback(async () => {
    if (!userData?.cycle_id || !currentUser?.id) return;
    const key = `last_history_view_${userData.cycle_id}_${currentUser.id}`;
    const lastView = localStorage.getItem(key);
    const lastViewDate = lastView ? new Date(lastView) : new Date(0);
    const { count, error } = await supabase
      .from("live_sessions")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", userData.cycle_id)
      .in("status", ["ended", "cancelled"])
      .gt("created_at", lastViewDate.toISOString());
    if (!error) setNewHistorySessionsCount(count || 0);
  }, [userData?.cycle_id, currentUser?.id]);

  const fetchNewQuizzesCount = useCallback(async () => {
    if (!userData?.cycle_id || !currentUser?.id) return;
    const key = `last_quizzes_view_${userData.cycle_id}_${currentUser.id}`;
    const lastView = localStorage.getItem(key);
    const lastViewDate = lastView ? new Date(lastView) : new Date(0);
    const { count, error } = await supabase
      .from("quizzes")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", userData.cycle_id)
      .eq("is_published", true)
      .gt("created_at", lastViewDate.toISOString());
    if (!error) setNewQuizzesCount(count || 0);
  }, [userData?.cycle_id, currentUser?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: userFromDb, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        if (userError) throw userError;
        setUserData(userFromDb);

        let userCycle = null;
        if (userFromDb.cycle_id) {
          const { data: cycleData } = await supabase
            .from("cycles")
            .select("*")
            .eq("id", userFromDb.cycle_id)
            .single();
          userCycle = cycleData;
          setCycle(userCycle);
        }

        let targetAdminId = userFromDb.admin_id;
        if (!targetAdminId && userFromDb.cycle_id) {
          const { data: cycleData } = await supabase
            .from("cycles")
            .select("admin_id")
            .eq("id", userFromDb.cycle_id)
            .single();
          targetAdminId = cycleData?.admin_id;
        }

        if (targetAdminId) {
          const { data: cyclesData } = await supabase
            .from("cycles")
            .select("*")
            .eq("admin_id", targetAdminId)
            .eq("is_active", true)
            .order("name");
          setAvailableCycles(cyclesData || []);
        }

        if (
          userFromDb.cycle_id &&
          !userFromDb.admin_id &&
          userCycle?.admin_id
        ) {
          await supabase
            .from("users")
            .update({ admin_id: userCycle.admin_id })
            .eq("id", currentUser.id);
        }

        const { data: pendingTrans } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);
        setPendingTransaction(pendingTrans?.[0] || null);

        const { data: transactions } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentPayments(transactions || []);

        const hasCycle = !!userFromDb.cycle_id;
        const hasAdmin = !!userFromDb.admin_id;
        if (!hasCycle || !hasAdmin) {
          setHasAccess(false);
          setLoading(false);
          return;
        }
        setHasAccess(true);

        const { data: adminData } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url, bio, specialty")
          .eq("id", targetAdminId)
          .single();
        if (adminData) setAdmin(adminData);

        const { data: contentsData } = await supabase
          .from("courses")
          .select("*")
          .eq("cycle_id", userFromDb.cycle_id)
          .order("created_at", { ascending: false });
        if (contentsData) setContents(contentsData);

        const { data: sessionsData } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("cycle_id", userFromDb.cycle_id)
          .order("scheduled_time", { ascending: true });
        if (sessionsData) setSessions(sessionsData);

        const { data: scoresData } = await supabase
          .from("quiz_attempts")
          .select("*, quiz:quiz_id(*)")
          .eq("user_id", currentUser.id)
          .order("completed_at", { ascending: false });
        if (scoresData) setQuizScores(scoresData);

        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("cycle_id", userFromDb.cycle_id)
          .eq("is_published", true);
        setAvailableQuizzes(quizzesData || []);

        if (userFromDb.cycle_id) {
          await fetchUnreadMessagesCount(userFromDb.cycle_id);
          await fetchNewCoursesCount();
          await fetchNewDocumentsCount();
          await fetchNewUpcomingSessionsCount();
          await fetchNewHistorySessionsCount();
          await fetchNewQuizzesCount();
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Erreur lors du chargement des données");
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchData();
  }, [
    currentUser,
    fetchNewCoursesCount,
    fetchNewDocumentsCount,
    fetchNewUpcomingSessionsCount,
    fetchNewHistorySessionsCount,
    fetchNewQuizzesCount,
  ]);

  useEffect(() => {
    if (!userData?.cycle_id) return;
    const interval = setInterval(() => {
      fetchUnreadMessagesCount(userData.cycle_id);
    }, 30000);
    return () => clearInterval(interval);
  }, [userData?.cycle_id]);

  useEffect(() => {
    if (!userData?.cycle_id) return;
    const channelCourses = supabase
      .channel("courses-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "courses",
          filter: `cycle_id=eq.${userData.cycle_id}`,
        },
        () => {
          fetchNewCoursesCount();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channelCourses);
  }, [userData?.cycle_id, fetchNewCoursesCount]);

  useEffect(() => {
    if (!userData?.cycle_id) return;
    const channelDocs = supabase
      .channel("documents-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documents",
          filter: `cycle_id=eq.${userData.cycle_id}`,
        },
        () => {
          fetchNewDocumentsCount();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channelDocs);
  }, [userData?.cycle_id, fetchNewDocumentsCount]);

  useEffect(() => {
    if (!userData?.cycle_id) return;
    const channelSessions = supabase
      .channel("sessions-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_sessions",
          filter: `cycle_id=eq.${userData.cycle_id}`,
        },
        (payload) => {
          if (payload.new.status === "scheduled") {
            fetchNewUpcomingSessionsCount();
          } else if (
            payload.new.status === "ended" ||
            payload.new.status === "cancelled"
          ) {
            fetchNewHistorySessionsCount();
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channelSessions);
  }, [
    userData?.cycle_id,
    fetchNewUpcomingSessionsCount,
    fetchNewHistorySessionsCount,
  ]);

  useEffect(() => {
    if (!userData?.cycle_id) return;
    const channelQuizzes = supabase
      .channel("quizzes-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quizzes",
          filter: `cycle_id=eq.${userData.cycle_id}`,
        },
        () => {
          fetchNewQuizzesCount();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channelQuizzes);
  }, [userData?.cycle_id, fetchNewQuizzesCount]);

  const averageScore =
    quizScores.length > 0
      ? (
          quizScores.reduce(
            (sum, s) => sum + (s.score / s.total_possible) * 100,
            0,
          ) / quizScores.length
        ).toFixed(1)
      : 0;

  const isProExpired =
    userData?.pro_expiry && new Date(userData.pro_expiry) < new Date();
  const hasActivePro = userData?.pro_status === true && !isProExpired;

  const handleUnreadCountChange = (newCount) => {
    setUnreadMessagesCount(newCount);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    const now = new Date().toISOString();
    if (!userData?.cycle_id || !currentUser?.id) return;
    if (value === "resources") {
      const key = `last_docs_view_${userData.cycle_id}_${currentUser.id}`;
      localStorage.setItem(key, now);
      setNewDocsCount(0);
      setDocsRefreshKey((prev) => prev + 1);
    } else if (value === "programs") {
      const key = `last_courses_view_${userData.cycle_id}_${currentUser.id}`;
      localStorage.setItem(key, now);
      setNewCoursesCount(0);
    } else if (value === "overview") {
      const key = `last_upcoming_view_${userData.cycle_id}_${currentUser.id}`;
      localStorage.setItem(key, now);
      setNewUpcomingSessionsCount(0);
    } else if (value === "history") {
      const key = `last_history_view_${userData.cycle_id}_${currentUser.id}`;
      localStorage.setItem(key, now);
      setNewHistorySessionsCount(0);
    } else if (value === "quizzes") {
      const key = `last_quizzes_view_${userData.cycle_id}_${currentUser.id}`;
      localStorage.setItem(key, now);
      setNewQuizzesCount(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl pt-20">
            <Skeleton className="h-14 w-full sm:w-80 mb-8 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (pendingTransaction && !hasAccess && !hasActivePro) {
    return (
      <>
        <Helmet>
          <title>Paiement en attente - SIGEF</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center py-20 px-4 pt-28">
            <Card className="max-w-md w-full text-center p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3">Paiement en attente</h2>
              <p className="text-muted-foreground mb-6">
                Votre paiement est en cours de vérification par votre
                administrateur. Vous recevrez une notification dès que votre
                abonnement sera activé.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (!hasAccess) {
    const missingCycle = !userData?.cycle_id;
    const missingAdmin = !userData?.admin_id;
    return (
      <>
        <Helmet>
          <title>Accès restreint - SIGEF</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center py-20 px-4 pt-28">
            <Card className="max-w-md w-full text-center p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3">Accès restreint</h2>
              <p className="text-muted-foreground mb-6">
                {missingCycle &&
                  "Vous n'êtes pas assigné à un cycle de formation."}
                {missingAdmin && "Vous n'êtes pas assigné à un formateur."}
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  const daysRemaining = userData?.pro_expiry
    ? Math.ceil(
        (new Date(userData.pro_expiry) - new Date()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <>
      <Helmet>
        <title>Tableau de bord - SIGEF</title>
      </Helmet>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <Header />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 mt-16 md:mt-20">
          <div className="container mx-auto max-w-7xl">
            {!hasActivePro && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-amber-400">
                    Votre abonnement PRO a expiré. Vous ne pouvez plus assister
                    aux sessions live, mais vous pouvez consulter votre
                    historique et les replays autorisés.
                  </span>
                </div>
                <Button asChild size="sm">
                  <Link to="/subscription">
                    <Crown className="h-4 w-4 mr-2" /> Renouveler
                  </Link>
                </Button>
              </div>
            )}

            <div className="mb-10">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full blur-2xl -z-0"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                          Bonjour,{" "}
                          {userData?.full_name?.split(" ")[0] || "Apprenant"} 👋
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                          <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-primary" /> Cycle :{" "}
                            {cycle?.name || "Non assigné"}
                          </span>
                          {admin && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 text-primary" />{" "}
                              Formateur : {admin.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasActivePro && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1.5 text-sm">
                          <Crown className="w-4 h-4 mr-1" /> Abonnement PRO
                          actif
                          {daysRemaining > 0 && (
                            <span className="ml-2 text-xs bg-primary/30 px-2 py-0.5 rounded-full">
                              {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}{" "}
                              restant
                            </span>
                          )}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-gray-300 hover:text-white"
                      >
                        <Link to={`/payment-history/${currentUser?.id}`}>
                          <History className="w-4 h-4 mr-2" /> Historique
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {cycle?.description && (
                    <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/50">
                      <p className="text-sm text-gray-300 italic">
                        📚 {cycle.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SubscriptionTimer />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="premium-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Cours disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">
                      {contents.length}
                    </p>
                    <BookOpen className="h-8 w-8 text-primary/40" />
                  </div>
                </CardContent>
              </Card>
              <Card className="premium-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Sessions à venir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">
                      {
                        sessions.filter(
                          (s) => getSessionStatus(s) === "upcoming",
                        ).length
                      }
                    </p>
                    <Video className="h-8 w-8 text-primary/40" />
                  </div>
                </CardContent>
              </Card>
              <Card className="premium-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Quiz complétés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">
                      {quizScores.length}
                    </p>
                    <Trophy className="h-8 w-8 text-primary/40" />
                  </div>
                </CardContent>
              </Card>
              <Card className="premium-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Score moyen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">
                      {averageScore}%
                    </p>
                    <FileText className="h-8 w-8 text-primary/40" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="mt-8"
            >
              <TabsList className="grid grid-cols-3 md:grid-cols-5 bg-card rounded-xl p-1 gap-1">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-primary/20"
                >
                  Aperçu
                  {newUpcomingSessionsCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white animate-pulse text-xs">
                      {newUpcomingSessionsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="programs"
                  className="data-[state=active]:bg-primary/20"
                >
                  Programmes
                  {newCoursesCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white animate-pulse text-xs">
                      {newCoursesCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="resources"
                  className="data-[state=active]:bg-primary/20"
                >
                  Ressources
                  {newDocsCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white animate-pulse text-xs">
                      {newDocsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-primary/20"
                >
                  Historique
                  {newHistorySessionsCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white animate-pulse text-xs">
                      {newHistorySessionsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="quizzes"
                  className="data-[state=active]:bg-primary/20"
                >
                  <FileQuestion className="h-4 w-4 mr-1 inline" /> Quiz
                  {newQuizzesCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white animate-pulse text-xs">
                      {newQuizzesCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Section Mes sessions - collapsible */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 mt-8">
                  <Card className="premium-card overflow-hidden">
                    <div
                      className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => toggleSection("sessions")}
                    >
                      <CardHeader className="p-2">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Video className="h-5 w-5 text-primary" /> Mes
                          sessions
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Rejoignez les lives en cours et consultez les replays
                        </CardDescription>
                      </CardHeader>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        {expandedSections.sessions ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {expandedSections.sessions && (
                      <CardContent className="pt-0">
                        {sessions.length > 0 ? (
                          <div className="space-y-3">
                            {sessions.slice(0, 5).map((session) => {
                              const status = getSessionStatus(session);
                              const isLive = status === "live";
                              const isUpcoming = status === "upcoming";
                              const isEnded = status === "ended";
                              const hasReplay =
                                session.recording_url &&
                                session.recording_url.trim() !== "";
                              return (
                                <div
                                  key={session.id}
                                  className="flex flex-col sm:flex-row items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors"
                                >
                                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">
                                      {session.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className="text-sm text-gray-400">
                                        {new Date(
                                          session.scheduled_time,
                                        ).toLocaleDateString("fr-FR")}{" "}
                                        à{" "}
                                        {new Date(
                                          session.scheduled_time,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      {isLive && (
                                        <Badge className="bg-green-500 text-white text-xs">
                                          En direct
                                        </Badge>
                                      )}
                                      {isEnded && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          Terminée
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 shrink-0">
                                    {(isLive || isUpcoming) && hasActivePro && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <Link
                                          to={`/live-session/${session.id}`}
                                        >
                                          <PlayCircle className="w-4 h-4 mr-1" />
                                          {isLive ? "Rejoindre" : "Planifiée"}
                                        </Link>
                                      </Button>
                                    )}
                                    {isEnded &&
                                      hasReplay &&
                                      (session.visibility === "all" ||
                                        (session.visibility === "pro_only" &&
                                          hasActivePro)) && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/80 to-secondary animate-pulse shadow-lg font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl group"
                                          asChild
                                        >
                                          <a
                                            href={session.recording_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                                            <Video className="w-4 h-4 mr-1 animate-bounce" />{" "}
                                            Revoir le Live
                                          </a>
                                        </Button>
                                      )}
                                    {!hasActivePro &&
                                      (isLive ||
                                        isUpcoming ||
                                        (isEnded &&
                                          session.visibility ===
                                            "pro_only")) && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled
                                        >
                                          <Lock className="w-4 h-4 mr-1" /> PRO
                                          requis
                                        </Button>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-sm text-gray-400">
                              Aucune session programmée
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Section Quiz récents - collapsible */}
                  <Card className="premium-card overflow-hidden">
                    <div
                      className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => toggleSection("quizzes")}
                    >
                      <CardHeader className="p-0">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Trophy className="h-5 w-5 text-primary" /> Quiz
                          récents
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Vos dernières performances
                        </CardDescription>
                      </CardHeader>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        {expandedSections.quizzes ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {expandedSections.quizzes && (
                      <CardContent className="pt-0">
                        {quizScores.length > 0 ? (
                          <div className="space-y-3">
                            {quizScores.slice(0, 5).map((score) => (
                              <div
                                key={score.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                              >
                                <div>
                                  <p className="font-medium text-white truncate">
                                    {score.quiz?.title || "Quiz"}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(
                                      score.completed_at,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary">
                                    {Math.round(
                                      (score.score / score.total_possible) *
                                        100,
                                    )}
                                    %
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {score.score}/{score.total_possible}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-sm text-gray-400">
                              Aucun quiz complété pour le moment
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="premium-card hover:border-primary/30 transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <BookOpen className="h-5 w-5 text-primary" /> Cours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 mb-4">
                        {contents.length} cours disponibles
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/cycle/${userData?.cycle_id}/courses`}>
                          Voir tous les cours
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="premium-card hover:border-primary/30 transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Video className="h-5 w-5 text-primary" /> Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 mb-4">
                        {sessions.length} sessions programmées
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/cycle/${userData?.cycle_id}/sessions`}>
                          Voir toutes les sessions
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="premium-card hover:border-primary/30 transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Trophy className="h-5 w-5 text-primary" /> Classement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 mb-4">
                        Votre position dans le classement
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/cycle/${userData?.cycle_id}/rankings`}>
                          Voir le classement
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {recentPayments.length > 0 && (
                  <div className="mt-8">
                    <Card className="premium-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <History className="h-5 w-5 text-primary" /> Dernières
                          transactions
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Historique de vos paiements d'abonnement
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recentPayments.slice(0, 3).map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                            >
                              <div>
                                <p className="font-medium text-white">
                                  {payment.amount?.toLocaleString()} FCFA
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(
                                    payment.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                className={
                                  payment.status === "approved"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : payment.status === "pending"
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-red-500/20 text-red-400 border-red-500/30"
                                }
                              >
                                {payment.status === "approved"
                                  ? "Validé"
                                  : payment.status === "pending"
                                    ? "En attente"
                                    : "Rejeté"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="programs" className="mt-6">
                <ProgramsList cycleId={userData?.cycle_id} />
              </TabsContent>

              <TabsContent value="resources" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Documents partagés
                    </h2>
                    <p className="text-muted-foreground">
                      Ressources mises à disposition par votre formateur
                    </p>
                  </div>
                  <DocumentsList
                    key={docsRefreshKey}
                    cycleId={userData?.cycle_id}
                    hasActivePro={hasActivePro}
                    refreshKey={docsRefreshKey}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <SessionHistory
                  cycleId={userData?.cycle_id}
                  userId={currentUser?.id}
                  hasActivePro={hasActivePro}
                />
              </TabsContent>

              {/* ONGLET QUIZ */}
              <TabsContent value="quizzes" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Quiz disponibles
                    </h2>
                    <p className="text-muted-foreground">
                      Testez vos connaissances et suivez votre progression
                    </p>
                  </div>

                {(() => {
  const attemptedQuizIds = quizScores.map((s) => s.quiz_id);
  
  const available = availableQuizzes.filter((q) => {
    if (attemptedQuizIds.includes(q.id)) return false;
    if (q.pro_only && !hasActivePro) return false;
    return true;
  });
  
  return available.length > 0 ? (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">
        À venir
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {available.map((quiz) => (
          <Card
            key={quiz.id}
            className="premium-card hover:border-primary/30 transition-all"
          >
            <CardHeader>
              <CardTitle className="text-white">
                {quiz.title}
              </CardTitle>
              {quiz.description && (
                <CardDescription>
                  {quiz.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  Seuil : {quiz.passing_score}%
                </Badge>
                {quiz.time_limit && (
                  <Badge variant="outline">
                    ⏱️ {quiz.time_limit} min
                  </Badge>
                )}
                <Badge variant="outline">
                  Max : {quiz.max_attempts || 1} tentative(s)
                </Badge>
                {quiz.pro_only && (
                  <Badge variant="default" className="bg-amber-500">
                    <Crown className="h-3 w-3 mr-1" /> PRO uniquement
                  </Badge>
                )}
              </div>
              <Button asChild className="w-full">
                <Link to={`/quiz/${quiz.id}`}>
                  Commencer le quiz
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ) : null;
})()}

                  {quizScores.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Quiz complétés
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {quizScores.map((attempt) => {
                          const quizInfo = availableQuizzes.find(
                            (q) => q.id === attempt.quiz_id,
                          );
                          const percentage = Math.round(
                            (attempt.score / attempt.total_possible) * 100,
                          );
                          return (
                            <Card key={attempt.id} className="premium-card">
                              <CardHeader>
                                <CardTitle className="text-white">
                                  {quizInfo?.title || "Quiz"}
                                </CardTitle>
                                <CardDescription>
                                  Complété le{" "}
                                  {new Date(
                                    attempt.completed_at,
                                  ).toLocaleDateString()}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex justify-between items-center mb-4">
                                  <div>
                                    <p className="text-2xl font-bold text-primary">
                                      {percentage}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {attempt.score} / {attempt.total_possible}{" "}
                                      points
                                    </p>
                                  </div>
                                  <Badge
                                    className={
                                      attempt.passed
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }
                                  >
                                    {attempt.passed ? "Réussi" : "Échec"}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  asChild
                                >
                                  <Link to={`/quiz-result/${attempt.quiz_id}`}>
                                    Voir le détail
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {availableQuizzes.length === 0 && quizScores.length === 0 && (
                    <Card className="premium-card text-center py-12">
                      <FileQuestion className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Aucun quiz n'est disponible pour le moment.
                      </p>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Bouton flottant du chat avec badge */}
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

        {chatOpen && userData?.cycle_id && (
          <div className="fixed bottom-28 right-4 z-50 w-96 h-[500px] bg-background border rounded-xl shadow-2xl">
            <div className="flex justify-between items-center p-3 border-b bg-primary text-white rounded-t-xl">
              <h3 className="font-semibold">
                Chat du cycle : {cycle?.name || "Non assigné"}
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
              cycleId={userData?.cycle_id}
              userId={currentUser?.id}
              onUnreadCountChange={handleUnreadCountChange}
            />
          </div>
        )}

        <Footer />
      </div>
    </>
  );
};

export default ApprenantDashboard;