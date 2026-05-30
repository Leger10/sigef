// src/components/live/LiveChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Send, Info } from 'lucide-react';
import { toast } from 'sonner';

const LiveChat = ({ sessionId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Charger les messages existants
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('live_session_messages')
          .select(`
            *,
            user:user_id (
              id,
              email,
              full_name,
              avatar
            )
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching chat messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // S'abonner aux nouveaux messages en temps réel
    const subscription = supabase
      .channel(`live_chat_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_messages',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          // Récupérer les détails de l'utilisateur
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, full_name, avatar')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new,
            user: userData
          };
          
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('live_session_messages')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          message: newMessage.trim(),
          message_type: 'text',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Impossible d'envoyer le message");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* En-tête */}
      <div className="p-4 border-b bg-muted/20">
        <h3 className="font-semibold flex items-center gap-2">
          Discussion en direct
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {messages.length} message(s) dans la conversation
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Aucun message pour le moment</p>
            <p className="text-sm">Soyez le premier à écrire !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const user = msg.user;
            const isMe = user?.id === currentUser?.id;
            
            if (msg.message_type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3 w-3" />
                    {msg.message}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={user?.avatar ? getFileUrl('users', user.avatar) : null} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-muted-foreground mb-1">
                    {isMe ? 'Vous' : (user?.full_name || 'Anonyme')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <div className="p-4 bg-muted/20 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez un message..." 
            className="flex-1 bg-background"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;