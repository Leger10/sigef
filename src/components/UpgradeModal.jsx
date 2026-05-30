import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Crown, Check, Smartphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const UpgradeModal = ({ trigger }) => {
  const { isPro } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Récupérer la configuration admin
        const { data: configData, error: configError } = await supabase
          .from('admin_config')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!configError && configData) {
          setConfig(configData);
        }

        // Récupérer les plans d'abonnement actifs (le moins cher pour affichage)
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true })
          .limit(1);

        if (!plansError && plansData && plansData.length > 0) {
          setPlans(plansData);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  if (isPro) return null;

  // Récupérer le prix du plan le moins cher ou utiliser une valeur par défaut
  const cheapestPlan = plans.length > 0 ? plans[0] : null;
  const displayPrice = cheapestPlan?.price || config?.subscription_price || 5000;

  const benefits = [
    'Accès à tous les cours PRO et PDF',
    'Participation aux sessions en direct',
    'Accès aux rediffusions des sessions',
    'Statistiques avancées et classements',
    'Accès prioritaire aux examens blancs'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Crown className="mr-2 h-4 w-4" />
            Devenir PRO
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Accédez à la version PRO
          </DialogTitle>
          <DialogDescription>
            Débloquez toutes les fonctionnalités premium pour accélérer votre préparation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-center">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <p className="text-4xl font-black tabular-nums text-foreground">
                  {displayPrice.toLocaleString()} <span className="text-xl font-medium text-muted-foreground">FCFA</span>
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-2 uppercase tracking-wide">
                  {cheapestPlan?.name || 'Abonnement Mensuel'}
                </p>
                {cheapestPlan?.duration_days && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {cheapestPlan.duration_days} jours d'accès
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button 
            className="w-full min-h-[3.5rem] text-lg font-bold" 
            onClick={() => {
              setOpen(false);
              navigate('/subscription');
            }}
          >
            Voir les forfaits et payer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
