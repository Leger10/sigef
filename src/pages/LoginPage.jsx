// src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";

const logActivity = async (userId, action, details, metadata = {}) => {
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("admin_id, cycle_id, role")
      .eq("id", userId)
      .single();

    await supabase.from("activity_logs").insert({
      user_id: userId,
      cycle_id: userData?.cycle_id,
      admin_id: userData?.admin_id,
      action: action,
      action_type: action,
      details: details,
      metadata: {
        ...metadata,
        user_role: userData?.role,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

const LoginPage = () => {
  const { login, isAuthenticated, initialLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Récupérer l'email passé depuis SignupPage (ou autre)
  const prefillEmail = location.state?.email || "";

  const [formData, setFormData] = useState({ email: prefillEmail, password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, initialLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { user, error } = await login(formData.email, formData.password);

      if (error) throw error;

      if (user) {
        await logActivity(user.id, "login", `Connexion réussie`, {
          login_method: "email_password",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);

      // Logger la tentative échouée
      if (formData.email) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", formData.email)
          .single();

        if (userData) {
          await logActivity(
            userData.id,
            "login_failed",
            `Tentative de connexion échouée: ${error.message}`,
            { error_message: error.message },
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Connexion - SIGEF</title>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
          <Card className="w-full max-w-md shadow-lg border-border">
            <CardHeader className="text-center pb-6 sm:pb-8">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Bon retour
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                Connectez-vous à votre compte pour continuer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="votre.email@exemple.com"
                    required
                    className="text-foreground bg-background min-h-12 px-3 py-2 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm sm:text-base">
                      Mot de passe
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Oublié ?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                    className="text-foreground bg-background min-h-12 px-3 py-2 text-base"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-12 text-base sm:text-lg mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>

                <p className="text-center text-sm sm:text-base text-muted-foreground pt-2">
                  Vous n'avez pas de compte ?{" "}
                  <Link
                    to="/signup"
                    className="text-primary hover:underline font-semibold"
                  >
                    S'inscrire
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default LoginPage;