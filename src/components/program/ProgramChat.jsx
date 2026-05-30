import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Send, MessageSquare, Lock } from 'lucide-react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const ProgramChat = ({ programId, isEnrolled }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const { currentUser } = useAuth();
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        const { data: messagesData, error } = await supabase
          .from('program_chat')
          .select('*, user:user_id(*)')
          .eq('program_id', programId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;
        setMessages(messagesData || []);
      } catch (error) {
        console.error('Error fetching chat:', error);
      } finally {
        setLoading(false);
      }
    };

    if (programId && isEnrolled) {
      fetchMessages();
      
      // S'abonner aux nouveaux messages en temps réel
      const subscription = supabase
        .channel(`program_chat_${programId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'program_chat',
            filter: `program_id=eq.${programId}`
          },
          async (payload) => {
            // Récupérer le message avec les infos utilisateur
            const { data: newMessage, error } = await supabase
              .from('program_chat')
              .select('*, user:user_id(*)')
              .eq('id', payload.new.id)
              .single();
            
            if (!error && newMessage) {
              setMessages(prev => [...prev, newMessage]);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [programId, isEnrolled]);

  // Scroll automatique vers le bas quand les messages changent
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !isEnrolled) return;

    try {
      const { error } = await supabase
        .from('program_chat')
        .insert({
          program_id: programId,
          user_id: currentUser.id,
          message: newMessage.trim(),
          likes: 0
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Impossible d'envoyer le message");
    }
  };

  if (!isEnrolled) {
    return (
      <Card className="border-dashed bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Espace de discussion privé</h3>
          <p className="text-muted-foreground max-w-md">
            Vous devez être inscrit à ce programme pour participer aux discussions avec le formateur et les autres apprenants.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] border-border/50 shadow-sm">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Discussion du programme</h3>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
            <p>Soyez le premier à envoyer un message !</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.user_id === currentUser?.id;
            const user = msg.user;
            const avatarUrl = user?.avatar ? getFileUrl('users', user.avatar) : null;
            const initials = user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U';

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="w-8 h-8 shrink-0 mt-1">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div className="flex items-baseline gap-2 mb-1 mx-1">
                    <span className="text-xs font-medium">{isMe ? 'Vous' : user?.full_name || 'Utilisateur'}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="border-t p-4 bg-background">
        <form onSubmit={handleSend} className="flex w-full gap-2">
          <Input 
            placeholder="Écrivez votre message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-muted/50 border-none"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ProgramChat;
