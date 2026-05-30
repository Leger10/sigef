// src/components/SubscriptionTimer.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Crown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Link } from 'react-router-dom';

const SubscriptionTimer = () => {
  const [userData, setUserData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('pro_status, pro_expiry')
          .eq('id', user.id)
          .single();
        
        setUserData(data);
      }
      setLoading(false);
    };
    
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!userData?.pro_status || !userData?.pro_expiry) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(userData.pro_expiry);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft(null);
        setDaysLeft(0);
        setIsExpiringSoon(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
      
      setDaysLeft(days);
      setIsExpiringSoon(days <= 7);
      
      setTimeLeft({
        days,
        hours,
        minutes,
        total: diff
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [userData]);

  if (loading) return null;

  if (!userData?.pro_status || !timeLeft) {
    return (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Abonnement expiré ou inactif</p>
              <p className="text-sm text-muted-foreground">
                Votre abonnement PRO n'est pas actif. Renouvelez pour accéder aux contenus.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/subscription">
              <Crown className="w-4 h-4 mr-2" />
              S'abonner
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mb-6 ${isExpiringSoon ? 'border-amber-500/50 bg-amber-500/5' : 'border-primary/30 bg-primary/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpiringSoon ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
              <Clock className={`w-5 h-5 ${isExpiringSoon ? 'text-amber-500' : 'text-primary'}`} />
            </div>
            <div>
              <p className="font-semibold flex items-center gap-2">
                Abonnement PRO actif
                <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">Premium</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Votre abonnement expire dans :
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{timeLeft.days}</p>
              <p className="text-xs text-muted-foreground">Jours</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{timeLeft.hours}</p>
              <p className="text-xs text-muted-foreground">Heures</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{timeLeft.minutes}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
          </div>

          {isExpiringSoon && (
            <Button asChild size="sm" variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-500/10">
              <Link to="/subscription">
                <Crown className="w-4 h-4 mr-2" />
                Renouveler
              </Link>
            </Button>
          )}
        </div>
        
        {isExpiringSoon && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Votre abonnement expire bientôt. Pensez à renouveler pour continuer à profiter des contenus PRO.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionTimer;