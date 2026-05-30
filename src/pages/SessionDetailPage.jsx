// src/pages/SessionDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  ArrowLeft,
  Video,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import SessionChat from "@/components/SessionChat.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { toast } from "sonner";

const SessionDetailPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProStatus, setUserProStatus] = useState(false);

  useEffect(() => {
    const fetchSessionAndUser = async () => {
      try {
        // Récupérer la session
        const { data: sessionData, error: sessionError } = await supabase
          .from("live_sessions")
          .select("*, formateur:formateur_id(*)")
          .eq("id", id)
          .single();
        if (sessionError) throw sessionError;
        setSession(sessionData);

        // Récupérer le statut PRO de l'utilisateur connecté
        if (currentUser) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("pro_status, pro_expiry")
            .eq("id", currentUser.id)
            .single();
          if (!userError && userData) {
            const isProActive =
              userData.pro_status === true &&
              (!userData.pro_expiry ||
                new Date(userData.pro_expiry) > new Date());
            setUserProStatus(isProActive);
          }
        }
      } catch (error) {
        console.error("Session inaccessible:", error);
        toast.error("Oups, cette session est introuvable.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndUser();
  }, [id, currentUser]);

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

  if (!session) return <Navigate to="/dashboard" replace />;

  const sessionDate = new Date(session.scheduled_time);
  const isPast = sessionDate < new Date();
  const canViewReplay =
    session.recording_url &&
    (session.visibility === "all" ||
      (session.visibility === "pro_only" && userProStatus));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{session.title} - SIGEF</title>
      </Helmet>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Link>
        </Button>

        <div className="bg-card border rounded-3xl p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-4">
            <Badge variant="outline">{session.type || "Live"}</Badge>
            {isPast && <Badge variant="secondary">Terminée</Badge>}
          </div>

          <h1 className="text-4xl font-bold mb-4">{session.title}</h1>
          <p className="text-muted-foreground text-lg mb-8">
            {session.description}
          </p>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">
                  {sessionDate.toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Heure</p>
                <p className="font-medium">
                  {sessionDate.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {!isPast && session.meeting_url && (
            <div className="mt-8 p-6 bg-primary/10 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">
                  La salle virtuelle vous attend
                </h3>
                <p className="text-sm opacity-80">
                  Connectez-vous à l'heure indiquée
                </p>
              </div>
              <Button asChild>
                <a
                  href={session.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Rejoindre
                </a>
              </Button>
            </div>
          )}

          {isPast && session.recording_url && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Replay</h3>
              {canViewReplay ? (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                  <video
                    src={session.recording_url}
                    controls
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                  <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-400 font-medium">
                    Ce replay est réservé aux abonnés PRO.
                  </p>
                  <Button asChild variant="outline" className="mt-3">
                    <Link to="/subscription">S’abonner pour y accéder</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <SessionChat sessionId={session.id} />
      </main>

      <Footer />
    </div>
  );
};

export default SessionDetailPage;
