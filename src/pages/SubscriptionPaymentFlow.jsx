// src/pages/SubscriptionPaymentFlow.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, uploadFile } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { ArrowLeft, ArrowRight, ShieldCheck, Upload, CheckCircle2, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPaymentFlow = () => {
  const { apprenantId, subscriptionId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [userAdminId, setUserAdminId] = useState(null);
  
  // Payment form state
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Vérifier que l'utilisateur est bien l'apprenant concerné
  useEffect(() => {
    if (!currentUser) {
      toast.error('Veuillez vous connecter');
      navigate('/login');
      return;
    }
    
    if (currentUser.id !== apprenantId) {
      toast.error('Accès non autorisé');
      navigate('/dashboard');
      return;
    }
  }, [currentUser, apprenantId, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Récupérer l'admin_id de l'apprenant (depuis la base de données)
        console.log("[SubscriptionPaymentFlow] Fetching user data for:", currentUser.id);
        
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("admin_id, cycle_id, role")
          .eq("id", currentUser.id)
          .single();
        
        if (userError) {
          console.error("[SubscriptionPaymentFlow] User fetch error:", userError);
          throw new Error("Impossible de récupérer vos informations");
        }
        
        console.log("[SubscriptionPaymentFlow] User data:", userData);
        
        let adminId = userData.admin_id;
        
        // Si l'utilisateur n'a pas d'admin_id mais a un cycle, récupérer l'admin du cycle
        if (!adminId && userData.cycle_id) {
          console.log("[SubscriptionPaymentFlow] Fetching admin from cycle:", userData.cycle_id);
          const { data: cycleData, error: cycleError } = await supabase
            .from("cycles")
            .select("admin_id")
            .eq("id", userData.cycle_id)
            .single();
          
          if (!cycleError && cycleData?.admin_id) {
            adminId = cycleData.admin_id;
            console.log("[SubscriptionPaymentFlow] Found admin via cycle:", adminId);
            
            // Mettre à jour l'utilisateur avec cet admin_id
            const { error: updateError } = await supabase
              .from("users")
              .update({ admin_id: adminId })
              .eq("id", currentUser.id);
            
            if (updateError) {
              console.error("[SubscriptionPaymentFlow] Failed to update user admin_id:", updateError);
            }
          }
        }
        
        setUserAdminId(adminId);
        
        if (!adminId) {
          setError("Vous n'êtes pas associé à un centre de formation. Veuillez contacter votre administrateur.");
          setLoading(false);
          return;
        }
        
        // 2. Récupérer le plan d'abonnement
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subscriptionId)
          .eq('is_active', true)
          .single();

        if (planError) throw planError;
        
        // Vérifier que le plan appartient à l'admin de l'apprenant
        if (planData.admin_id !== adminId) {
          setError('Ce forfait n\'est pas disponible pour votre centre de formation.');
          toast.error('Forfait non disponible');
          setLoading(false);
          return;
        }
        
        setPlan(planData);

        // 3. Récupérer les comptes de paiement de l'ADMIN de l'apprenant
        console.log("[SubscriptionPaymentFlow] Fetching payment accounts for admin:", adminId);
        
        const { data: accounts, error: accountsError } = await supabase
          .from('payment_method_accounts')
          .select(`
            *,
            payment_method:payment_method_id (id, name)
          `)
          .eq('admin_id', adminId)
          .eq('is_active', true);

        if (accountsError) {
          console.error('Error fetching accounts:', accountsError);
          setPaymentAccounts([]);
        } else {
          console.log("[SubscriptionPaymentFlow] Accounts found:", accounts?.length || 0);
          setPaymentAccounts(accounts || []);
          
          // Si aucun compte n'est trouvé, afficher une erreur
          if (!accounts || accounts.length === 0) {
            setError('Aucun moyen de paiement n\'a été configuré pour votre centre. Veuillez contacter votre administrateur.');
          }
        }

      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err.message || 'Abonnement introuvable');
        toast.error('Abonnement introuvable');
        setTimeout(() => navigate('/subscription'), 2000);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser && subscriptionId) {
      fetchData();
    }
  }, [subscriptionId, apprenantId, currentUser?.id, navigate]);

  const handleMethodSelect = (accountId) => {
    const account = paymentAccounts.find(a => a.id === accountId);
    setSelectedAccount(account);
  };

  const handleNextStep = () => {
    if (step === 1 && selectedAccount) {
      setStep(2);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 5 Mo)');
        return;
      }
      
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setScreenshot(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }
    
    if (!phone || phone.trim().length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }
    
    if (!screenshot) {
      toast.error('Veuillez ajouter la capture d\'écran du dépôt');
      return;
    }

    setSubmitting(true);
    try {
      // Convertir l'image en base64 pour stockage direct
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(screenshot);
      });
      
      const base64Image = await base64Promise;

      // Générer une référence unique
      const transactionRef = reference.trim() || `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Créer la transaction directement avec l'image en base64
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          plan_id: plan.id,
          amount: plan.price,
          payment_method: selectedAccount.payment_method?.name || selectedAccount.method_name,
          payment_method_account_id: selectedAccount.id,
          reference: transactionRef,
          status: 'pending',
          proof_image: base64Image,
          apprenant_phone: phone,
          admin_id: userAdminId,
          created_at: new Date().toISOString()
        });

      if (transError) throw transError;

      toast.success('Paiement soumis avec succès !', {
        description: 'Votre demande sera traitée par votre administrateur.',
        duration: 5000,
      });
      
      navigate(`/dashboard`);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Erreur lors de la soumission du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-destructive">Erreur</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/subscription')}
            >
              Retour aux forfaits
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Forfait introuvable</p>
          <Button className="mt-4" onClick={() => navigate('/subscription')}>
            Voir les forfaits
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4 pb-6 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Règlement de l'abonnement</h1>
          <p className="text-muted-foreground">
            {plan.name} - {plan.price.toLocaleString()} FCFA / {
              plan.duration_days === 30 ? '1 mois' :
              plan.duration_days === 90 ? '3 mois' :
              plan.duration_days === 180 ? '6 mois' :
              plan.duration_days === 365 ? '12 mois' :
              `${plan.duration_days} jours`
            }
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
            1
          </div>
          <span className="text-sm font-medium">Méthode</span>
        </div>
        <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
            2
          </div>
          <span className="text-sm font-medium">Paiement</span>
        </div>
      </div>

      {step === 1 && (
        <Card className="mt-8 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-bold">Choisissez votre méthode de paiement</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Sélectionnez le compte vers lequel vous allez effectuer le transfert
                </p>
              </div>
              
              {paymentAccounts.length === 0 ? (
                <div className="p-4 bg-amber-500/10 rounded-xl text-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-600">
                    Aucun moyen de paiement configuré. Veuillez contacter votre Formateur.
                  </p>
                </div>
              ) : (
                <>
                  <Select onValueChange={handleMethodSelect} value={selectedAccount?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.payment_method?.name || account.method_name} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAccount && (
                    <div className="p-5 bg-primary/5 rounded-xl text-center border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Transférez</p>
                      <p className="text-3xl font-bold text-primary">{plan.price.toLocaleString()} FCFA</p>
                      <p className="text-sm text-muted-foreground mt-2 mb-1">au numéro :</p>
                      <p className="text-2xl font-mono font-bold bg-background inline-block px-4 py-2 rounded-lg">
                        {selectedAccount.account_number}
                      </p>
                      <p className="text-sm mt-2">Nom du compte : {selectedAccount.account_name}</p>
                    </div>
                  )}

                  <Button 
                    onClick={handleNextStep} 
                    disabled={!selectedAccount} 
                    className="w-full"
                    size="lg"
                  >
                    Continuer <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="mt-8 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Votre numéro de téléphone *</Label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Numéro ayant effectué le transfert (ex: 70123456)"
                  required
                  disabled={submitting}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Le numéro que vous avez utilisé pour effectuer le paiement
                </p>
              </div>

              <div className="space-y-2">
                <Label>Référence du paiement (optionnel)</Label>
                <Input 
                  value={reference} 
                  onChange={e => setReference(e.target.value)} 
                  placeholder="Ex: Référence Mobile Money, Transaction ID..."
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Capture d'écran du dépôt *</Label>
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Cliquez pour ajouter une image</span>
                    <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP (max 5 Mo)</span>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/jpg,image/webp" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      disabled={submitting}
                    />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img 
                      src={previewUrl} 
                      alt="Aperçu du justificatif" 
                      className="max-h-48 rounded-lg border shadow-sm" 
                    />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeFile}
                      disabled={submitting}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-4 rounded-xl">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Votre paiement sera vérifié par votre administrateur avant activation de l'abonnement PRO.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="flex-1"
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || !phone || !screenshot} 
                  className="flex-1"
                  size="lg"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Valider le paiement
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionPaymentFlow;