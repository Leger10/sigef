import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Bell, Check, Trash2, Video, MessageSquare, UserPlus, UserMinus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Créer une référence audio en dehors du composant (une seule instance)
let audio = null;
if (typeof window !== 'undefined') {
  audio = new Audio('/sounds/success.mp3');
  audio.preload = 'auto';
}

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const channelRef = useRef(null);
  const isMounted = useRef(true);

  // Récupérer le statut PRO actuel de l'utilisateur (directement depuis l'état du contexte ou via une requête)
  const [hasActivePro, setHasActivePro] = useState(false);

  const fetchProStatus = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('pro_status, pro_expiry')
        .eq('id', currentUser.id)
        .single();
      if (!error && data) {
        const isActive = data.pro_status === true && (!data.pro_expiry || new Date(data.pro_expiry) > new Date());
        setHasActivePro(isActive);
      } else {
        setHasActivePro(false);
      }
    } catch (err) {
      console.error('Erreur récupération statut PRO:', err);
    }
  };

  // Fonction pour jouer le son
  const playNotificationSound = () => {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Erreur lecture son:', err));
    }
  };

  // Gestion du clic sur "Voir" : vérifier l'accès PRO pour les sessions live
  const handleViewAction = (notification) => {
    const { action_url, type } = notification;

    // Types de notifications qui concernent une session live
    const sessionTypes = ['session_started', 'session_ending', 'session_reminder'];
    const isSessionNotification = sessionTypes.includes(type) || (action_url && action_url.includes('/live-session/'));

    if (isSessionNotification && !hasActivePro) {
      toast.info('Cette session est réservée aux abonnés PRO. Abonnez-vous pour y accéder.');
      navigate('/subscription');
      return;
    }

    // Sinon, ouvrir le lien normalement
    if (action_url) {
      window.location.href = action_url;
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Charger le statut PRO
    fetchProStatus();

    isMounted.current = true;

    // Chargement initial des notifications
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (isMounted.current) {
          setNotifications(data || []);
          setUnreadCount((data || []).filter(n => !n.is_read).length);
        }
        // Nettoyage auto des notifications de plus de 7 jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const toDelete = (data || []).filter(n => new Date(n.created_at) < sevenDaysAgo);
        for (const old of toDelete) {
          await supabase.from('notifications').delete().eq('id', old.id);
        }
      } catch (err) {
        console.error('Erreur chargement notifications:', err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    fetchNotifications();

    // Nettoyer l'ancien canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Canal Realtime
    const newChannel = supabase
      .channel(`notifications_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        async (payload) => {
          const { data: newNotif, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (!error && newNotif && isMounted.current) {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title, { body: newNotif.message });
            }
          }
        }
      );

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Notifications realtime connectées');
      }
    });
    channelRef.current = newChannel;

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => {
      isMounted.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUser]);

  // Animation de la cloche
  useEffect(() => {
    if (unreadCount > 0 && !open) {
      setHasAnimated(true);
      const timer = setTimeout(() => setHasAnimated(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, open]);

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur marquage lu:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;
      for (const id of unreadIds) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (err) {
      console.error('Erreur marquage tout lu:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erreur suppression notification:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'session_started': return <Video className="h-4 w-4 text-primary" />;
      case 'session_ending': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'participant_joined': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'participant_left': return <UserMinus className="h-4 w-4 text-muted-foreground" />;
      case 'message_received': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-muted">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-muted">
          <Bell className={`h-5 w-5 ${hasAnimated ? 'animate-ring' : ''}`} />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            Notifications
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} non lues</Badge>}
          </h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs text-primary hover:text-primary/80">
              <Check className="h-3 w-3 mr-1" /> Tout marquer lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 flex gap-3 transition-colors hover:bg-muted/50 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                  <div className="mt-1 flex-shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {n.action_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => handleViewAction(n)}
                        >
                          Voir
                        </Button>
                      )}
                      {!n.is_read && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markAsRead(n.id)}>Lu</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-destructive hover:bg-destructive/10" onClick={() => deleteNotification(n.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;