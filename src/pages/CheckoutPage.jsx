// src/pages/CheckoutPage.jsx - Version corrigée
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { toast } from "sonner";

const CheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const [plan, setPlan] = useState(null);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAdminId, setUserAdminId] = useState(null);
  const [userCycleId, setUserCycleId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        toast.error("Veuillez vous connecter");
        navigate("/login");
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Récupérer les infos de l'utilisateur
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("admin_id, cycle_id, role")
          .eq("id", currentUser.id)
          .single();
        
        if (userError) throw userError;
        
        let adminId = userData.admin_id;
        setUserCycleId(userData.cycle_id);
        
        if (!adminId && userData.cycle_id) {
          const { data: cycleData } = await supabase
            .from("cycles")
            .select("admin_id")
            .eq("id", userData.cycle_id)
            .single();
          
          if (cycleData?.admin_id) {
            adminId = cycleData.admin_id;
            await supabase
              .from("users")
              .update({ admin_id: adminId })
              .eq("id", currentUser.id);
          }
        }
        
        setUserAdminId(adminId);
        
        if (!adminId && userRole !== 'super_admin') {
          setError("Vous n'êtes pas associé à un centre de formation.");
          setLoading(false);
          return;
        }

        // Récupérer le plan
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", id)
          .eq("is_active", true)
          .single();

        if (planError) throw planError;
        
        if (userRole !== 'super_admin' && planData.admin_id !== adminId) {
          setError("Ce forfait n'est pas disponible pour votre centre de formation.");
          setLoading(false);
          return;
        }
        
        setPlan(planData);

        // Récupérer les comptes de paiement
        const { data: accountsData, error: accountsError } = await supabase
          .from("payment_method_accounts")
          .select(`
            *,
            payment_method:payment_method_id (id, name)
          `)
          .eq("admin_id", adminId)
          .eq("is_active", true);

        if (accountsError) throw accountsError;
        
        const enrichedAccounts = (accountsData || []).map(account => ({
          ...account,
          method_name: account.payment_method?.name || "Méthode inconnue"
        }));
        
        setPaymentAccounts(enrichedAccounts);
        
        if (!enrichedAccounts.length) {
          setError("Aucun moyen de paiement configuré.");
        }
        
      } catch (error) {
        console.error("Error:", error);
        setError(error.message || "Impossible de charger les informations");
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser) {
      fetchData();
    }
  }, [id, currentUser, userRole]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount || !phone || !screenshot) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSubmitting(true);
    try {
      // Convertir l'image en base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(screenshot);
      });
      
      const base64Image = await base64Promise;
      
      // Préparer les données de la transaction
      const transactionData = {
        user_id: currentUser.id,  // Important: c'est user_id, pas user_id
        plan_id: plan.id,
        amount: plan.price,
        payment_method: selectedAccount.method_name,
        payment_method_account_id: selectedAccount.id,
        reference: reference || `PAY_${Date.now()}`,
        status: "pending",
        proof_image: base64Image,
        apprenant_phone: phone,
        admin_id: userAdminId || plan.admin_id,
        created_at: new Date().toISOString()
      };
      
      // Ajouter cycle_id seulement s'il existe et si la colonne est présente
      if (userCycleId) {
        transactionData.cycle_id = userCycleId;
      }
      
      console.log("Transaction data:", transactionData);
      
      const { error: transError } = await supabase
        .from("transactions")
        .insert(transactionData);

      if (transError) {
        console.error("Supabase error:", transError);
        throw transError;
      }

      toast.success("Paiement soumis avec succès !");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  // Rendu JSX (identique au précédent)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-destructive">{error || "Forfait introuvable"}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/subscription")}
              >
                Retour aux forfaits
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/10">
      <Helmet>
        <title>Paiement - {plan.name}</title>
      </Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/subscription")}
            className="mb-6 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux forfaits
          </Button>

          <div className="bg-card rounded-3xl shadow-xl overflow-hidden border border-border">
            <div className="bg-muted/30 p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="text-muted-foreground">
                  {plan.duration_days === 30 ? "1 mois" :
                   plan.duration_days === 60 ? "2 mois" :
                   plan.duration_days === 90 ? "3 mois" :
                   plan.duration_days === 120 ? "4 mois" :
                   plan.duration_days === 180 ? "6 mois" :
                   plan.duration_days === 365 ? "12 mois" :
                   `${plan.duration_days} jours`} d'accès
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-3xl font-black text-primary">
                  {plan.price.toLocaleString()} FCFA
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-bold">1. Moyen de paiement</Label>
                {paymentAccounts.length === 0 ? (
                  <div className="p-4 bg-amber-500/10 rounded-xl text-center text-amber-600">
                    <p>Aucun moyen de paiement disponible.</p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedAccount?.id || ""}
                      onValueChange={(val) => {
                        const account = paymentAccounts.find((a) => a.id === val);
                        setSelectedAccount(account);
                      }}
                    >
                      <SelectTrigger className="w-full min-h-12">
                        <SelectValue placeholder="Choisissez votre moyen de paiement" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.method_name} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedAccount && (
                      <div className="p-6 bg-primary/5 rounded-2xl text-center border border-primary/20 mt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Transférez exactement{" "}
                          <span className="font-bold text-foreground">
                            {plan.price.toLocaleString()} FCFA
                          </span>{" "}
                          au numéro :
                        </p>
                        <p className="text-3xl font-black text-primary tracking-widest">
                          {selectedAccount.account_number}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {selectedAccount.account_name}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold">2. Votre numéro de téléphone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Le numéro utilisé pour le transfert"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold">3. Référence de transaction (optionnel)</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: Référence Mobile Money, Transaction ID..."
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold">4. Capture d'écran du paiement</Label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${previewUrl ? "border-primary/50 bg-primary/5 p-4" : "border-border bg-muted/20 p-8 hover:bg-muted/40"}`}>
                  {previewUrl ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <img src={previewUrl} alt="Aperçu" className="max-h-48 rounded-lg shadow-sm" />
                      <span className="text-sm font-medium text-success flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Remplacer l'image
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium">Cliquez pour ajouter la capture d'écran</span>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP (max 5MB)</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" required />
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitting || !selectedAccount || !phone || !screenshot || paymentAccounts.length === 0}
                className="w-full min-h-[4rem] text-lg font-bold shadow-xl"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {submitting ? "Traitement..." : `Paiement de ${plan.price.toLocaleString()} FCFA`}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;