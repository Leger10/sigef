// src/components/live/PermissionManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Shield, Mic, Video, MonitorUp, MessageSquare, Hand } from 'lucide-react';
import { toast } from 'sonner';

const PermissionManager = ({ sessionId, currentUser, isFormateur }) => {
  const [participants, setParticipants] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFormateur) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Récupérer les participants (sauf le formateur)
        const { data: parts, error: partsError } = await supabase
          .from('live_session_participants')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .neq('role', 'formateur');

        if (partsError) throw partsError;
        setParticipants(parts || []);

        // Récupérer les permissions existantes
        const { data: perms, error: permsError } = await supabase
          .from('session_permissions')
          .select('*')
          .eq('session_id', sessionId);

        if (permsError) throw permsError;

        const permMap = {};
        (perms || []).forEach(p => {
          permMap[p.user_id] = p;
        });
        setPermissions(permMap);
      } catch (err) {
        console.error("Error fetching permissions", err);
        toast.error('Erreur lors du chargement des permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // S'abonner aux changements de permissions
    const subscription = supabase
      .channel(`permissions_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_permissions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setPermissions(prev => ({
              ...prev,
              [payload.new.user_id]: payload.new
            }));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId, isFormateur]);

  const togglePermission = async (userId, field, currentValue) => {
    const permRecord = permissions[userId];
    if (!permRecord) return;

    try {
      const { error } = await supabase
        .from('session_permissions')
        .update({ [field]: !currentValue })
        .eq('id', permRecord.id);

      if (error) throw error;
      toast.success('Permission mise à jour');
    } catch (err) {
      console.error("Error updating permission", err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (!isFormateur) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center h-full justify-center">
        <Shield className="h-12 w-12 mb-4 opacity-20" />
        <p>Seul le formateur peut gérer les permissions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Contrôle d'accès
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Gérez les permissions des participants
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Aucun apprenant connecté</p>
          </div>
        ) : (
          <div className="space-y-4">
            {participants.map(p => {
              const user = p.user;
              const perm = permissions[p.user_id];
              if (!perm) return null;

              return (
                <div key={p.id} className="p-4 rounded-xl border bg-muted/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar ? getFileUrl('users', user.avatar) : null} />
                      <AvatarFallback>{user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user?.full_name || 'Apprenant'}</p>
                      <p className="text-xs text-muted-foreground">{p.status === 'connected' ? 'En ligne' : 'Déconnecté'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Mic className="h-3.5 w-3.5" /> Audio
                      </Label>
                      <Switch 
                        checked={perm.can_speak} 
                        onCheckedChange={() => togglePermission(p.user_id, 'can_speak', perm.can_speak)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Video className="h-3.5 w-3.5" /> Vidéo
                      </Label>
                      <Switch 
                        checked={perm.can_video} 
                        onCheckedChange={() => togglePermission(p.user_id, 'can_video', perm.can_video)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-xs cursor-pointer">
                        <MonitorUp className="h-3.5 w-3.5" /> Écran
                      </Label>
                      <Switch 
                        checked={perm.can_screen_share} 
                        onCheckedChange={() => togglePermission(p.user_id, 'can_screen_share', perm.can_screen_share)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-xs cursor-pointer">
                        <MessageSquare className="h-3.5 w-3.5" /> Chat
                      </Label>
                      <Switch 
                        checked={perm.can_chat} 
                        onCheckedChange={() => togglePermission(p.user_id, 'can_chat', perm.can_chat)} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default PermissionManager;