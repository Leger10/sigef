// src/components/live/SessionStatistics.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Clock, Users, MessageSquare, Activity } from 'lucide-react';

const SessionStatistics = ({ sessionId, sessionStatus, scheduledStart, actualStart }) => {
  const [stats, setStats] = useState({
    duration: '00:00:00',
    participants: 0,
    peakParticipants: 0,
    messages: 0
  });

  useEffect(() => {
    let timer;
    let participantInterval;

    if (sessionStatus === 'live' && actualStart) {
      // Timer update
      timer = setInterval(() => {
        const start = new Date(actualStart).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        
        setStats(prev => ({ ...prev, duration: `${h}:${m}:${s}` }));
      }, 1000);
    }

    return () => {
      clearInterval(timer);
      clearInterval(participantInterval);
    };
  }, [sessionStatus, actualStart]);

  useEffect(() => {
    const fetchCurrentStats = async () => {
      try {
        // Récupérer les participants connectés
        const { data: participants, error: pError } = await supabase
          .from('live_session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('status', 'connected');

        if (pError) throw pError;

        // Récupérer le nombre de messages
        const { count: messagesCount, error: mError } = await supabase
          .from('live_session_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        if (mError) throw mError;

        setStats(prev => ({
          ...prev,
          participants: participants?.length || 0,
          peakParticipants: Math.max(prev.peakParticipants, participants?.length || 0),
          messages: messagesCount || 0
        }));
      } catch (err) {
        console.error("Stats error", err);
      }
    };

    fetchCurrentStats();
    const interval = setInterval(fetchCurrentStats, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono">{stats.duration}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{stats.participants}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{stats.messages}</span>
      </div>
    </div>
  );
};

export default SessionStatistics;