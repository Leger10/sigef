// src/components/live/LiveParticipants.jsx
import React, { useState, useEffect } from 'react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';

const LiveParticipants = ({ sessionId, currentUser, isFormateur }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('live_session_participants')
          .select(`
            *,
            user:user_id (
              id,
              email,
              full_name,
              avatar,
              role
            )
          `)
          .eq('session_id', sessionId)
          .eq('status', 'connected');

        if (error) throw error;
        setParticipants(data || []);
      } catch (error) {
        console.error('Error fetching participants:', error);
        toast.error('Erreur lors du chargement des participants');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();

    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel(`participants_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_session_participants',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const getRoleBadge = (role) => {
    if (role === 'formateur') {
      return <Badge className="bg-primary text-white text-[10px] px-1.5">Formateur</Badge>;
    }
    if (role === 'admin') {
      return <Badge className="bg-blue-500 text-white text-[10px] px-1.5">Admin</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b bg-muted/20">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Aucun participant pour le moment</p>
          </div>
        ) : (
          participants.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.user?.avatar ? getFileUrl('users', p.user.avatar) : null} />
                  <AvatarFallback>
                    {p.user?.full_name ? p.user.full_name.substring(0, 2).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.user?.full_name || 'Utilisateur'}</span>
                    {getRoleBadge(p.role)}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {p.is_audio_enabled ? (
                        <Mic className="h-3 w-3 text-green-500 inline mr-1" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-500 inline mr-1" />
                      )}
                      Audio
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.is_video_enabled ? (
                        <Video className="h-3 w-3 text-green-500 inline mr-1" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-500 inline mr-1" />
                      )}
                      Vidéo
                    </span>
                  </div>
                </div>
              </div>
              {p.user?.id === currentUser?.id && (
                <Badge variant="outline" className="text-xs">Vous</Badge>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveParticipants;