// src/pages/CycleSessionsPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Calendar,
  Clock,
  Video,
  Lock,
  PlayCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";

const CycleSessionsPage = () => {
  const { cycleId } = useParams();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasActivePro, setHasActivePro] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!cycleId || !currentUser) return;
      setLoading(true);
      try {
        // Récupérer les infos du cycle
        const { data: cycleData, error: cycleError } = await supabase
          .from("cycles")
          .select("id, name, description")
          .eq("id", cycleId)
          .single();
        if (cycleError) throw cycleError;
        setCycle(cycleData);

        // Récupérer le statut PRO de l'utilisateur
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("pro_status, pro_expiry")
          .eq("id", currentUser.id)
          .single();
        if (!userError) {
          const isProActive =
            userData.pro_status === true &&
            (!userData.pro_expiry ||
              new Date(userData.pro_expiry) > new Date());
          setHasActivePro(isProActive);
        }

        // Récupérer toutes les sessions du cycle (planifiées, live, terminées)
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("cycle_id", cycleId)
          .order("scheduled_time", { ascending: true }); // les plus proches d'abord

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);
      } catch (err) {
        console.error("Erreur chargement sessions:", err);
        toast.error("Impossible de charger les sessions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cycleId, currentUser]);

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_time);
    const end = new Date(start.getTime() + (session.duration || 60) * 60000);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Sessions - {cycle?.name || "Cycle"} | SIGEF</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sessions du cycle</h1>
            <p className="text-muted-foreground">{cycle?.name}</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Aucune session programmée</p>
              <p className="text-sm text-muted-foreground">
                Revenez plus tard pour découvrir les prochaines sessions live.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              const isLive = status === "live";
              const isUpcoming = status === "upcoming";
              const isEnded = status === "ended";
              const hasReplay =
                session.recording_url && session.recording_url.trim() !== "";
              const canViewReplay =
                hasReplay &&
                (session.visibility === "all" ||
                  (session.visibility === "pro_only" && hasActivePro));
              const canJoinLive = (isLive || isUpcoming) && hasActivePro;

              return (
                <Card
                  key={session.id}
                  className="hover:shadow-md transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between flex-wrap gap-2">
                      {session.title}
                      {isLive && (
                        <Badge className="bg-green-500 text-white animate-pulse">
                          EN DIRECT
                        </Badge>
                      )}
                      {isUpcoming && (
                        <Badge variant="outline" className="text-primary">
                          Planifiée
                        </Badge>
                      )}
                      {isEnded && <Badge variant="secondary">Terminée</Badge>}
                    </CardTitle>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />{" "}
                        {new Date(session.scheduled_time).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />{" "}
                        {new Date(session.scheduled_time).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="h-4 w-4" /> Durée : {session.duration}{" "}
                        min
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.description && (
                      <p className="text-muted-foreground">
                        {session.description}
                      </p>
                    )}
                    <div className="flex justify-end gap-3">
                      {canJoinLive && (
                        <Button asChild>
                          <Link to={`/live-session/${session.id}`}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {isLive ? "Rejoindre" : "Planifiée"}
                          </Link>
                        </Button>
                      )}
                      {!canJoinLive &&
                        (isLive || isUpcoming) &&
                        !hasActivePro && (
                          <Button variant="outline" disabled>
                            <Lock className="h-4 w-4 mr-2" /> Réservé PRO
                          </Button>
                        )}
                      {isEnded && canViewReplay && (
                        <Button
                          variant="default"
                          className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/80 to-secondary animate-pulse shadow-lg font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl group"
                          asChild
                        >
                          <a
                            href={session.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                            <Video className="h-4 w-4 mr-2 animate-bounce" />{" "}
                            Revoir le Live
                          </a>
                        </Button>
                      )}
                      {isEnded &&
                        !canViewReplay &&
                        hasReplay &&
                        !hasActivePro && (
                          <Button variant="outline" disabled>
                            <Lock className="h-4 w-4 mr-2" /> PRO requis
                          </Button>
                        )}
                      {isEnded && !hasReplay && (
                        <p className="text-sm text-amber-500">
                          Replay non disponible
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CycleSessionsPage;
