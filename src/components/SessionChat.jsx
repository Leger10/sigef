import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { toast } from 'sonner';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SessionChat = ({ sessionId }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: records, error } = await supabase
          .from('live_session_messages')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .eq('message_type', 'text')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(records || []);
      } catch (error) {
        console.error('Échec de la récupération des messages:', error);
        toast.error('Impossible de charger les messages du chat.');
      }
    };

    fetchMessages();

    // S'abonner aux nouveaux messages
    const subscription = supabase
      .channel(`session_chat_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_messages',
          filter: `session_id=eq.${sessionId} AND message_type=eq.text`
        },
        async (payload) => {
          const { data: newMsg, error } = await supabase
            .from('live_session_messages')
            .select('*, user:user_id(*)')
            .eq('id', payload.new.id)
            .single();

          if (!error && newMsg) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_session_messages')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Échec de l\'envoi du message:', error);
      toast.error('Impossible d\'envoyer le message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <h3 className="text-xl font-semibold mb-4">Chat en direct</h3>
      
      <div className="bg-muted/50 rounded-xl p-4 h-96 overflow-y-auto mb-4 border border-border/50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Aucun message pour le moment. Soyez le premier à écrire !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.user_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-xl p-3 ${
                    msg.user_id === currentUser?.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-foreground border border-border shadow-sm'
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-80">
                    {msg.user?.full_name || msg.user?.name || 'Utilisateur inconnu'}
                  </p>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[10px] opacity-60 mt-2 text-right">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-3">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message ici..."
          className="text-foreground bg-background"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !newMessage.trim()} className="shrink-0">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Envoyer
        </Button>
      </form>
    </div>
  );
};

export default SessionChat;
