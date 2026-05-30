import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient';

export const useSubscription = () => {
  const { currentUser } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser) {
        setIsPro(false);
        setExpiryDate(null);
        setSubscription(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Récupérer l'abonnement actif de l'utilisateur
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*, plan:plan_id(*)')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data && data.end_date) {
          const expiry = new Date(data.end_date);
          const now = new Date();
          const isValid = expiry > now;
          
          setIsPro(isValid && currentUser.pro_status === true);
          setExpiryDate(expiry);
          setSubscription(data);
        } else {
          // Vérifier via le champ pro_status de l'utilisateur
          const hasProFlag = currentUser.pro_status === true;
          let isValidDate = true;
          
          if (currentUser.pro_expiry) {
            const expiry = new Date(currentUser.pro_expiry);
            isValidDate = expiry > new Date();
            setExpiryDate(expiry);
          }

          setIsPro(hasProFlag && isValidDate);
          setSubscription(null);
        }
      } catch (error) {
        console.error('[useSubscription] Error:', error);
        setIsPro(false);
        setExpiryDate(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [currentUser]);

  // Fonction pour mettre à jour manuellement l'abonnement
  const refreshSubscription = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:plan_id(*)')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.end_date) {
        const expiry = new Date(data.end_date);
        const isValid = expiry > new Date();
        
        setIsPro(isValid);
        setExpiryDate(expiry);
        setSubscription(data);
      } else {
        setIsPro(false);
        setExpiryDate(null);
        setSubscription(null);
      }
    } catch (error) {
      console.error('[useSubscription] Refresh error:', error);
    }
  };

  // Calcul des jours restants
  const daysRemaining = expiryDate 
    ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isPro,
    expiryDate,
    daysRemaining,
    subscription,
    loading,
    refreshSubscription
  };
};