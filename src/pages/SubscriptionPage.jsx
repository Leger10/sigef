// src/pages/SubscriptionPage.jsx - Version avec réduction
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Crown, CheckCircle2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { toast } from "sonner";

const SubscriptionPage = () => {
  const { currentUser, isPro, userRole } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      if (!currentUser) {
        setLoading(false);
        toast.error("Veuillez vous connecter pour voir les forfaits");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let targetAdminId = null;

        // Super admin : ses propres forfaits
        if (userRole === "super_admin") {
          targetAdminId = currentUser.id;
        }
        // Admin : ses propres forfaits
        else if (userRole === "admin") {
          targetAdminId = currentUser.id;
        }
        // Apprenant / formateur : récupérer l'admin_id via son cycle
        else {
          if (currentUser.admin_id) {
            targetAdminId = currentUser.admin_id;
          } else {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("admin_id, cycle_id")
              .eq("id", currentUser.id)
              .single();

            if (userError) {
              console.error(
                "[SubscriptionPage] Error fetching user:",
                userError,
              );
            }

            if (userData) {
              if (userData.admin_id) {
                targetAdminId = userData.admin_id;
              } else if (userData.cycle_id) {
                const { data: cycleData, error: cycleError } = await supabase
                  .from("cycles")
                  .select("admin_id")
                  .eq("id", userData.cycle_id)
                  .single();

                if (!cycleError && cycleData?.admin_id) {
                  targetAdminId = cycleData.admin_id;

                  // Mettre à jour l'utilisateur pour la prochaine fois
                  await supabase
                    .from("users")
                    .update({ admin_id: targetAdminId })
                    .eq("id", currentUser.id);
                }
              }
            }
          }
        }

        if (!targetAdminId && userRole !== "super_admin") {
          setError(
            "Vous n'êtes pas associé à un centre de formation. Veuillez contacter votre administrateur.",
          );
          setPlans([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true);

        if (targetAdminId) {
          query = query.eq("admin_id", targetAdminId);
        }

        const { data, error } = await query.order("price", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setPlans(data);
        } else {
          setError(
            "Aucun forfait disponible pour votre centre. Veuillez contacter votre administrateur.",
          );
        }
      } catch (error) {
        console.error("[SubscriptionPage] Error fetching plans:", error);
        setError(error.message || "Impossible de charger les forfaits");
        toast.error("Impossible de charger les forfaits");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [currentUser, userRole, navigate]);

  const defaultFeatures = [
    "Accès illimité aux cours",
    "Sessions en direct",
    "Documents PDF téléchargeables",
    "Support prioritaire",
  ];

  const getDiscountedPrice = (price, discountPercentage) => {
    if (!discountPercentage || discountPercentage <= 0) return price;
    return price * (1 - discountPercentage / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/10">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-3xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/10">
      <Helmet>
        <title>Abonnement PRO - SIGEF</title>
      </Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 text-primary items-center justify-center mb-6">
            <Crown className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Passez à la version PRO
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Débloquez tous les cours, les sessions en direct et maximisez vos
            chances de réussite.
          </p>
          {isPro && (
            <div className="mt-6 inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5" /> Vous êtes déjà PRO. Vous
              pouvez prolonger votre abonnement.
            </div>
          )}
        </div>

        {error ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-4">
              <Crown className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground text-lg mb-2">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Veuillez contacter votre administrateur pour plus d'informations.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              Aucun forfait disponible pour le moment.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Retour à l'accueil
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const hasDiscount =
                plan.discount_percentage && plan.discount_percentage > 0;
              const discountedPrice = hasDiscount
                ? getDiscountedPrice(plan.price, plan.discount_percentage)
                : plan.price;
              const savedAmount = hasDiscount
                ? plan.price - discountedPrice
                : 0;

              return (
                <div
                  key={plan.id}
                  className="relative flex flex-col bg-card rounded-3xl p-8 border shadow-lg hover:shadow-xl transition-shadow"
                >
                  {plan.duration_days === 365 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1">
                        🌟 Meilleure valeur
                      </Badge>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="absolute -top-4 right-4">
                      <Badge className="bg-red-500 text-white border-0 px-2 py-1 flex items-center gap-1">
                        <Percent className="w-3 h-3" /> -
                        {plan.discount_percentage}%
                      </Badge>
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.duration_days === 30
                      ? "1 mois"
                      : plan.duration_days === 90
                        ? "3 mois"
                        : plan.duration_days === 180
                          ? "6 mois"
                          : plan.duration_days === 365
                            ? "12 mois"
                            : `${plan.duration_days} jours`}{" "}
                    d'accès
                  </p>

                  <div className="mb-8 pb-8 border-b">
                    <div className="flex items-end gap-2">
                      {hasDiscount ? (
                        <>
                          <span className="text-3xl font-bold line-through text-muted-foreground">
                            {plan.price.toLocaleString()}
                          </span>
                          <span className="text-5xl font-bold text-primary">
                            {Math.round(discountedPrice).toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-5xl font-bold">
                          {plan.price.toLocaleString()}
                        </span>
                      )}
                      <span className="text-lg text-muted-foreground mb-1">
                        FCFA
                      </span>
                    </div>
                    {hasDiscount && (
                      <p className="text-sm text-green-600 mt-2">
                        Économisez {savedAmount.toLocaleString()} FCFA !
                      </p>
                    )}
                    {plan.duration_days === 365 && !hasDiscount && (
                      <p className="text-sm text-green-600 mt-2">
                        Économisez 2 mois gratuits !
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {defaultFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate(`/checkout/${plan.id}`)}
                    size="lg"
                    className="w-full font-bold"
                  >
                    Choisir ce forfait
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionPage;
