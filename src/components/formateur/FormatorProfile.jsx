import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { BookOpen, Video, Star, Crown, Settings } from "lucide-react";
import { getFileUrl } from "@/lib/supabaseClient.js";
import { useSubscription } from "@/hooks/useSubscription.js";

const FormatorProfile = ({ formateur }) => {
  const { isPro } = useSubscription();

  if (!formateur) return null;

  const avatarUrl = formateur.avatar
    ? getFileUrl("users", formateur.avatar)
    : null;
  const fullName = formateur.full_name || formateur.name || "Formateur";
  const initials = fullName.substring(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-card">
      <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 relative">
        <div className="absolute -bottom-12 left-8">
          <Avatar className="w-24 h-24 border-4 border-background shadow-md rounded-2xl">
            <AvatarImage
              src={avatarUrl}
              alt={fullName}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl font-bold rounded-2xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className="pt-16 pb-8 px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge
                variant="secondary"
                className="px-3 py-1 text-sm font-medium"
              >
                {formateur.specialty || formateur.role === "formateur"
                  ? "Formateur Expert"
                  : "Expert Formateur"}
              </Badge>
              {formateur.rating && (
                <div className="flex items-center text-amber-500 font-medium text-sm bg-amber-500/10 px-2 py-1 rounded-md">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  {formateur.rating}
                </div>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {formateur.bio ||
                "Formateur expert dans le domaine des concours direct et professionnel."}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
            <div className="flex gap-4 p-4 bg-muted/50 rounded-xl border border-border/50">
              <div className="text-center px-4 border-r border-border">
                <div className="text-2xl font-black text-foreground">
                  {formateur.courses_count || 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1 mt-1">
                  <BookOpen className="w-3 h-3" /> Cours
                </div>
              </div>
              <div className="text-center px-4">
                <div className="text-2xl font-black text-foreground">
                  {formateur.sessions_count || 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1 mt-1">
                  <Video className="w-3 h-3" /> Sessions
                </div>
              </div>
            </div>

            {!isPro ? (
              <Button
                asChild
                className="w-full shadow-md hover:shadow-lg transition-all"
                size="lg"
              >
                <Link to="/subscription">
                  <Crown className="w-4 h-4 mr-2" />
                  S'abonner pour tout débloquer
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/dashboard">
                  <Settings className="w-4 h-4 mr-2" />
                  Gérer mon abonnement
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormatorProfile;
