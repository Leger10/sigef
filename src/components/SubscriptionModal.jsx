import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Crown, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toast } from 'sonner';
import { supabase, uploadFile, getFileUrl } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SubscriptionModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [adminConfig, setAdminConfig] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: '',
    reference: '',
    screenshot: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Récupérer la config admin
        const { data: configData, error: configError } = await supabase
          .from('admin_config')
          .select('*')
          .maybeSingle();

        if (!configError && configData) setAdminConfig(configData);

        // Récupérer les plans d'abonnement actifs
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('duration_days', { ascending: true });

        if (plansError) throw plansError;
        setSubscriptionPlans(plansData || []);
        if (plansData && plansData.length > 0) setSelectedPlan(plansData[0]);

        // Récupérer les méthodes de paiement et comptes
        const { data: methodsData, error: methodsError } = await supabase
          .from('payment_methods')
          .select('*, accounts:payment_method_accounts(*)')
          .eq('is_active', true);

        if (!methodsError && methodsData) {
          const allAccounts = methodsData.flatMap(m => 
            (m.accounts || []).map(a => ({ ...a, method_name: m.name }))
          );
          setPaymentAccounts(allAccounts);
        }
      } catch (error) {
        console.error('Erreur de récupération:', error);
        toast.error('Impossible de charger les forfaits.');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
      setSubmitted(false);
      setSelectedPaymentMethod('');
      setSelectedAccount(null);
      setFormData({ phone: '', reference: '', screenshot: null });
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5 Mo.');
        return;
      }
      setFormData(prev => ({ ...prev, screenshot: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !formData.phone || !formData.screenshot || !selectedPlan) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload de la capture d'écran
      const fileExt = formData.screenshot.name.split('.').pop();
      const fileName = `subscription_${currentUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `subscriptions/${fileName}`;
      
      const uploadedPath = await uploadFile('documents', filePath, formData.screenshot);
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(uploadedPath);

      // 2. Créer la transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          plan_id: selectedPlan.id,
          amount: selectedPlan.price,
          payment_method: selectedAccount.method_name,
          payment_method_account_id: selectedAccount.id,
          reference: formData.reference || `SUB_${Date.now()}`,
          status: 'pending',
          proof_image: publicUrl,
          apprenant_phone: formData.phone
        });

      if (transactionError) throw transactionError;

      // 3. Créer l'abonnement en attente
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: currentUser.id,
          plan_id: selectedPlan.id,
          status: 'pending',
          amount: selectedPlan.price,
          payment_method: selectedAccount.method_name
        });

      if (subscriptionError) throw subscriptionError;
      
      setSubmitted(true);
      toast.success('Demande de paiement envoyée avec succès.');
      setTimeout(() => onClose(), 3000);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      toast.error('Une erreur est survenue lors du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedAccountInfo = () => {
    if (!selectedAccount) return null;
    return {
      name: selectedAccount.account_name,
      number: selectedAccount.account_number
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground rounded-2xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl border border-border my-auto max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:bg-muted rounded-full p-2">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Paiement en attente !</h3>
            <p className="text-muted-foreground">Votre demande est en cours de validation par nos administrateurs.</p>
          </div>
        ) : loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Crown className="w-8 h-8 text-secondary" />
              <h2 className="text-2xl font-bold">Passez en version PRO</h2>
            </div>

            <div className="mb-6 space-y-3">
              <Label className="text-sm font-semibold uppercase text-muted-foreground">Choisissez un forfait</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subscriptionPlans.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan?.id === plan.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="font-bold text-lg mb-1">{plan.name}</div>
                    <div className="text-xl font-black text-primary tabular-nums">
                      {plan.price} <span className="text-sm font-normal text-muted-foreground">XOF</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {plan.duration_days} jours
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <Label className="text-sm font-semibold uppercase text-muted-foreground">Méthode de paiement</Label>
              <Select 
                value={selectedAccount?.id || ''} 
                onValueChange={(val) => {
                  const account = paymentAccounts.find(a => a.id === val);
                  setSelectedAccount(account);
                  setSelectedPaymentMethod(account?.method_name || '');
                }}
              >
                <SelectTrigger className="w-full min-h-12">
                  <SelectValue placeholder="Sélectionner une méthode" />
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
                <div className="mt-4 p-4 bg-muted/50 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground mb-1">Transférez le montant au :</p>
                  <p className="text-lg font-semibold text-foreground">{selectedAccount.account_name}</p>
                  <p className="text-2xl font-black text-foreground tabular-nums tracking-wider mt-1">{selectedAccount.account_number}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Votre numéro de téléphone (ayant effectué le dépôt)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ex: 0102030405"
                  className="min-h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Référence de transaction (optionnel)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Ex: REF123456"
                  className="min-h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">Capture d'écran de la transaction</Label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border bg-muted/20 rounded-xl p-6 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground text-center">
                    {formData.screenshot ? formData.screenshot.name : 'Sélectionner l\'image du reçu'}
                  </span>
                  <input id="screenshot" type="file" accept="image/*" onChange={handleFileChange} className="hidden" required />
                </label>
              </div>

              <Button type="submit" className="w-full min-h-12 text-base" disabled={submitting || !selectedPlan || !selectedAccount}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? 'Traitement...' : `Soumettre ${selectedPlan?.price || 0} XOF`}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
