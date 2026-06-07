// src/pages/SignupPage.jsx - Version finale (pas de pré-sélection automatique)
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
import { Shield, Loader2, CheckCircle, Lock } from "lucide-react";
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
  const [isCycleLocked, setIsCycleLocked] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    cycle_id: "", // Initialement vide, pas de pré-sélection
  });

  // Lire les paramètres de l'URL (pour les liens partagés par les admins)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cycleId = urlParams.get("cycle_id");
    const cycleName = urlParams.get("cycle_name");
    const adminId = urlParams.get("admin_id");

    if (cycleId && cycleName) {
      localStorage.setItem("selected_cycle_id", cycleId);
      localStorage.setItem("selected_cycle_name", decodeURIComponent(cycleName));
      if (adminId) localStorage.setItem("selected_admin_id", adminId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Récupérer le cycle sauvegardé UNIQUEMENT s'il existe dans localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("selected_cycle_id");
    const savedName = localStorage.getItem("selected_cycle_name");
    const savedAdmin = localStorage.getItem("selected_admin_id");

    if (savedId && savedName) {
      // Un cycle est pré-sélectionné (lien admin)
      setSavedCycleId(savedId);
      setSavedCycleName(savedName);
      setSavedAdminId(savedAdmin);
      setIsCycleLocked(true);
      // On pré-remplit le formulaire avec ce cycle
      setFormData((prev) => ({ ...prev, cycle_id: savedId }));
    } else {
      // Pas de cycle pré-sélectionné
      setIsCycleLocked(false);
      setSavedCycleId(null);
      setSavedCycleName(null);
      // formData.cycle_id reste vide
    }
  }, []);

  // Charger tous les cycles actifs (toujours tous les cycles)
  useEffect(() => {
    const fetchAllCycles = async () => {
      setCyclesLoading(true);
      try {
        const { data, error } = await supabase
          .from("cycles")
          .select("id, name, description, admin_id, is_default")
          .eq("is_active", true)
          .order("name");
        
        if (error) throw error;
        
        let cyclesList = data || [];
        
        // Si un cycle est verrouillé mais pas dans la liste, on l'ajoute
        if (isCycleLocked && savedCycleId && !cyclesList.find(c => c.id === savedCycleId)) {
          const { data: savedCycleData, error: cycleError } = await supabase
            .from("cycles")
            .select("id, name, description, admin_id, is_default")
            .eq("id", savedCycleId)
            .maybeSingle();
          
          if (!cycleError && savedCycleData) {
            cyclesList = [savedCycleData, ...cyclesList];
          }
        }
        
        setCycles(cyclesList);
        
        if (isCycleLocked && savedCycleId) {
          const foundCycle = cyclesList.find(c => c.id === savedCycleId);
          if (foundCycle) {
            toast.success(`Cycle "${savedCycleName}" pré‑sélectionné`, {
              duration: 3000,
              icon: <CheckCircle className="h-4 w-4" />,
            });
          } else {
            toast.error(`Cycle "${savedCycleName}" non disponible.`, { duration: 4000 });
            setIsCycleLocked(false);
            setFormData((prev) => ({ ...prev, cycle_id: "" }));
          }
        }
      } catch (error) {
        console.error("Erreur chargement cycles:", error);
        setCyclesError(error.message);
      } finally {
        setCyclesLoading(false);
      }
    };
    
    fetchAllCycles();
  }, [savedCycleId, savedCycleName, isCycleLocked]);

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
    const phoneValue = formData.phone && formData.phone.trim() !== "" ? formData.phone.trim() : null;

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: phoneValue,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const selectedCycle = cycles.find((c) => c.id === formData.cycle_id);
        let adminId = selectedCycle?.admin_id || null;
        if (!adminId && savedAdminId) adminId = savedAdminId;

        const { data: existingUser } = await supabase
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
          toast.warning("Profil partiellement créé, veuillez contacter le support.");
        } else {
          await logActivity(
            authData.user.id,
            "registration",
            `Inscription réussie - Cycle: ${selectedCycle?.name || "Non spécifié"}`,
            {
              cycle_id: formData.cycle_id,
              admin_id: adminId,
              registration_method: savedCycleId ? "from_cycle_selection" : "direct",
            }
          );
        }

        localStorage.removeItem("selected_cycle_id");
        localStorage.removeItem("selected_cycle_name");
        localStorage.removeItem("selected_admin_id");

        toast.success("Inscription réussie ! Veuillez vous connecter.");
        setTimeout(() => navigate("/login", { state: { email: formData.email } }), 1500);
      }
    } catch (error) {
      console.error("Erreur inscription:", error);
      if (error.message?.includes("already registered")) {
        const { data: existingProfile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("email", formData.email)
          .maybeSingle();

        if (!existingProfile || profileError) {
          toast.error(
            "Un compte existe déjà avec cet email mais a été supprimé. Veuillez contacter l'administrateur pour restaurer votre accès ou utilisez une autre adresse email.",
            { duration: 6000 }
          );
        } else {
          toast.info("Un compte existe déjà avec cet email. Veuillez vous connecter.");
          setTimeout(() => navigate("/login", { state: { email: formData.email } }), 1500);
        }
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

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
              <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
              <CardDescription>
                {isCycleLocked && savedCycleName
                  ? `Inscription pour le cycle "${savedCycleName}"`
                  : "Inscrivez-vous pour commencer votre formation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+226 XX XX XX XX"
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                
                {/* Section Cycle de formation */}
                <div className="space-y-2">
                  <Label htmlFor="cycle">Cycle de formation *</Label>
                  {cyclesError ? (
                    <div className="text-destructive text-sm">Erreur: {cyclesError}</div>
                  ) : cyclesLoading ? (
                    <div className="flex items-center gap-2 p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Chargement des cycles...</span>
                    </div>
                  ) : cycles.length === 0 ? (
                    <div className="text-center p-4 bg-amber-500/10 rounded-lg text-amber-600">
                      <p className="text-sm">Aucun cycle disponible.</p>
                    </div>
                  ) : isCycleLocked ? (
                    // 🔒 Cas: Cycle verrouillé (venant d'un lien admin)
                    <div className="w-full">
                      <div className="w-full p-4 border-2 rounded-lg bg-primary/10 border-primary/40 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Lock className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">
                              Cycle imposé
                            </p>
                            <p 
                              className="text-foreground font-bold text-base break-words"
                              title={savedCycleName}
                            >
                              {savedCycleName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Ce cycle vous a été recommandé par votre formateur
                            </p>
                          </div>
                        </div>
                      </div>
                      <input type="hidden" name="cycle_id" value={formData.cycle_id} />
                    </div>
                  ) : (
                    // ✅ Cas normal: Select libre (pas de pré-sélection)
                    <Select
                      value={formData.cycle_id || ""}
                      onValueChange={(value) => setFormData({ ...formData, cycle_id: value })}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-gray-900 text-white [&>span]:text-white">
                        <SelectValue placeholder="Sélectionnez votre cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            {cycle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {!isCycleLocked && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sélectionnez le cycle de formation qui vous intéresse.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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