// src/pages/SignupPage.jsx - Version complète avec correction de la pré-sélection du cycle
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Shield, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
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

const SignupPage = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [cyclesError, setCyclesError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedCycleId, setSavedCycleId] = useState(null);
  const [savedCycleName, setSavedCycleName] = useState(null);
  const [savedAdminId, setSavedAdminId] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    cycle_id: "",
  });

  // 1. Récupérer le cycle sauvegardé (depuis la HomePage)
  useEffect(() => {
    const savedId = localStorage.getItem("selected_cycle_id");
    const savedName = localStorage.getItem("selected_cycle_name");
    const savedAdmin = localStorage.getItem("selected_admin_id");

    if (savedId && savedName) {
      setSavedCycleId(savedId);
      setSavedCycleName(savedName);
      setSavedAdminId(savedAdmin);
    }
  }, []);

  // 2. Récupérer l'ID du super_admin (pour les cycles publics)
  const getSuperAdminId = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  };

  // 3. Charger les cycles avec gestion robuste du cycle pré-sélectionné
  useEffect(() => {
    const fetchCycles = async () => {
      setCyclesLoading(true);
      try {
        let query = supabase
          .from("cycles")
          .select("id, name, description, admin_id, is_default")
          .eq("is_active", true)
          .order("name");

        // Si aucun cycle n'est pré‑sélectionné, on filtre les cycles publics
        if (!savedCycleId) {
          const superAdminId = await getSuperAdminId();
          if (superAdminId) {
            query = query.or(`is_default.eq.true,admin_id.eq.${superAdminId}`);
          } else {
            query = query.eq("is_default", true);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        let cyclesList = data || [];

        // 🔧 Si un cycle est pré‑sélectionné mais absent de la liste (ex: inactif ou filtré),
        // on le récupère manuellement pour l'ajouter
        if (savedCycleId && !cyclesList.find((c) => c.id === savedCycleId)) {
          const { data: savedCycleData, error: cycleError } = await supabase
            .from("cycles")
            .select("id, name, description, admin_id, is_default")
            .eq("id", savedCycleId)
            .maybeSingle();

          if (!cycleError && savedCycleData) {
            cyclesList = [savedCycleData, ...cyclesList];
            console.log(
              `✅ Cycle pré‑sélectionné "${savedCycleData.name}" ajouté à la liste.`,
            );
          } else {
            console.warn(
              `⚠️ Cycle pré‑sélectionné ${savedCycleId} introuvable ou inactif.`,
            );
          }
        }

        setCycles(cyclesList);

        // Pré‑sélectionner le cycle dans le formulaire
        const foundCycle = cyclesList.find((c) => c.id === savedCycleId);
        if (savedCycleId && foundCycle) {
          setFormData((prev) => ({ ...prev, cycle_id: savedCycleId }));
          if (foundCycle.admin_id) {
            setSavedAdminId(foundCycle.admin_id);
          }
          toast.success(`Cycle "${savedCycleName}" pré‑sélectionné`, {
            duration: 3000,
            icon: <CheckCircle className="h-4 w-4" />,
          });
          // Nettoyer localStorage après la sélection réussie
          localStorage.removeItem("selected_cycle_id");
          localStorage.removeItem("selected_cycle_name");
          localStorage.removeItem("selected_admin_id");
        } else if (savedCycleId && !foundCycle) {
          toast.error(
            `Cycle "${savedCycleName}" non disponible. Veuillez en sélectionner un autre.`,
            {
              duration: 4000,
            },
          );
          // Ne pas supprimer localStorage tout de suite pour permettre un éventuel retour
        }
      } catch (error) {
        console.error("Erreur chargement cycles:", error);
        setCyclesError(error.message);
      } finally {
        setCyclesLoading(false);
      }
    };

    fetchCycles();
  }, [savedCycleId, savedCycleName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("Veuillez entrer votre nom complet");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (!formData.cycle_id) {
      toast.error("Veuillez sélectionner un cycle de formation");
      return;
    }

    setLoading(true);

    // Convertir le téléphone : chaîne vide → null
    const phoneValue =
      formData.phone && formData.phone.trim() !== ""
        ? formData.phone.trim()
        : null;

    try {
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
              phone: phoneValue,
            },
          },
        },
      );

      if (signUpError) throw signUpError;

      if (authData.user) {
        const selectedCycle = cycles.find((c) => c.id === formData.cycle_id);
        let adminId = selectedCycle?.admin_id || null;
        if (!adminId && savedAdminId) adminId = savedAdminId;

        // 2. Vérifier si l'utilisateur existe déjà dans la table users
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("id", authData.user.id)
          .maybeSingle();

        let profileError = null;
        if (existingUser) {
          const { error: updateError } = await supabase
            .from("users")
            .update({
              email: formData.email,
              full_name: formData.full_name,
              phone: phoneValue,
              cycle_id: formData.cycle_id,
              admin_id: adminId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", authData.user.id);
          profileError = updateError;
        } else {
          const { error: insertError } = await supabase.from("users").insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: phoneValue,
            cycle_id: formData.cycle_id,
            admin_id: adminId,
            role: "apprenant",
            pro_status: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          profileError = insertError;
        }

        if (profileError) {
          console.error("Profile operation error:", profileError);
          toast.warning(
            "Profil partiellement créé, veuillez contacter le support si nécessaire.",
          );
        } else {
          console.log(
            "User profile OK with cycle_id:",
            formData.cycle_id,
            "admin_id:",
            adminId,
            "phone:",
            phoneValue,
          );
          await logActivity(
            authData.user.id,
            "registration",
            `Inscription réussie - Cycle: ${selectedCycle?.name || "Non spécifié"}`,
            {
              cycle_id: formData.cycle_id,
              admin_id: adminId,
              registration_method: savedCycleId
                ? "from_cycle_selection"
                : "direct",
            },
          );
        }

        // 3. Connecter automatiquement l'utilisateur
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          toast.success("Inscription réussie !", {
            description: "Vous pouvez maintenant vous connecter.",
            duration: 3000,
          });
          setTimeout(() => navigate("/login"), 1500);
        } else {
          await logActivity(
            authData.user.id,
            "login",
            "Connexion automatique après inscription",
            { login_method: "auto_after_registration" },
          );
          toast.success("Inscription et connexion réussies !", {
            description: "Bienvenue sur SIGEF !",
            duration: 3000,
          });
          setTimeout(() => navigate("/"), 1500);
        }
      }
    } catch (error) {
      console.error("Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
      if (error.message?.includes("already registered")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (!signInError) {
          toast.info("Vous êtes déjà inscrit, vous avez été connecté.");
          setTimeout(() => navigate("/"), 1500);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedCycle = cycles.find((c) => c.id === formData.cycle_id);
  const isCyclePreSelected = savedCycleId && formData.cycle_id === savedCycleId;

  return (
    <>
      <Helmet>
        <title>Inscription - SIGEF</title>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-10 px-4 bg-muted/20">
          <Card className="w-full max-w-xl shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                Créer un compte
              </CardTitle>
              <CardDescription>
                {savedCycleId
                  ? `Inscription pour le cycle "${savedCycleName}"`
                  : "Inscrivez-vous pour commencer votre formation"}
                {selectedCycle && (
                  <div className="mt-2 p-2 bg-primary/10 rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-primary font-medium">
                      Cycle sélectionné : {selectedCycle.name}
                    </span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Ex: Traoré Karim"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="karim.traore@email.com"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+226 XX XX XX XX"
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycle">Cycle de formation *</Label>
                  {cyclesError ? (
                    <div className="text-destructive text-sm">
                      Erreur: {cyclesError}
                    </div>
                  ) : cyclesLoading ? (
                    <div className="flex items-center gap-2 p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Chargement des cycles...
                      </span>
                    </div>
                  ) : cycles.length === 0 ? (
                    <div className="text-center p-4 bg-amber-500/10 rounded-lg text-amber-600">
                      <p className="text-sm">Aucun cycle disponible.</p>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={formData.cycle_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cycle_id: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger
                          className={`bg-background ${isCyclePreSelected ? "border-primary ring-2 ring-primary/20" : ""}`}
                        >
                          <SelectValue placeholder="Sélectionnez votre cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          {cycles.map((cycle) => (
                            <SelectItem key={cycle.id} value={cycle.id}>
                              {cycle.name}
                              {savedCycleId === cycle.id && " ✓ (recommandé)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCyclePreSelected && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Cycle recommandé sélectionné
                        </p>
                      )}
                      {!savedCycleId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ces cycles sont ouverts à tous. Après inscription,
                          votre administrateur pourra vous associer à un centre.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 caractères
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmer le mot de passe *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  S'inscrire
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Se connecter
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

export default SignupPage;
