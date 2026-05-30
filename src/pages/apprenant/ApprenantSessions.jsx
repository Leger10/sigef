import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Calendar, Clock, Video, PlayCircle, CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const ApprenantSessions = () => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_time);
    const end = new Date(start.getTime() + (session.duration || 60) * 60000);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  useEffect(() => {
    const fetchSessions = async () => {
      if (!currentUser?.cycle_id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("cycle_id", currentUser.cycle_id)
          .order("scheduled_time", { ascending: true });

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error("Erreur chargement sessions:", error);
        toast.error("Impossible de charger les sessions");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [currentUser]);

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (sessions.length === 0) {
    return (
      <Card className="text-center py-12">
        <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Aucune session programmée pour votre cycle.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.map((session) => {
        const status = getSessionStatus(session);
        const isLive = status === "live";
        const isUpcoming = status === "upcoming";
        const isEnded = status === "ended";
        const hasReplay =
          session.recording_url && session.recording_url.trim() !== "";

        return (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{session.title}</CardTitle>
                {isLive && (
                  <Badge className="bg-green-500 text-white animate-pulse">
                    EN DIRECT
                  </Badge>
                )}
                {isUpcoming && (
                  <Badge className="bg-primary text-white">À venir</Badge>
                )}
                {isEnded && <Badge variant="secondary">Terminée</Badge>}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />{" "}
                  {new Date(session.scheduled_time).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />{" "}
                  {new Date(session.scheduled_time).toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-1">
                  <Video className="w-4 h-4" /> {session.duration} min
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {session.description || "Aucune description"}
              </p>
              <div className="flex gap-3">
                {(isLive || isUpcoming) && (
                  <Button asChild variant="default">
                    <Link to={`/live-session/${session.id}`}>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {isLive ? "Rejoindre" : "Planifier"}
                    </Link>
                  </Button>
                )}
                {isEnded && hasReplay && (
                  <Button asChild variant="outline">
                    <a
                      href={session.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="w-4 h-4 mr-2" /> Revoir le Live
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ApprenantSessions;
