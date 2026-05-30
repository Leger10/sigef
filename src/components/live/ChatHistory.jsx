// src/components/live/ChatHistory.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Send, Info, Pin, Search, Download, Trash2, Smile, Hand } from 'lucide-react';
import { toast } from 'sonner';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏'];

const ChatHistory = ({ sessionId, currentUser, isFormateur }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [usersWithHandRaised, setUsersWithHandRaised] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: records, error } = await supabase
          .from('live_session_messages')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(records || []);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching chat messages:', error);
        toast.error("Erreur lors du chargement des messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Charger les utilisateurs qui ont levé la main
    const fetchHandRaised = async () => {
      const { data, error } = await supabase
        .from('live_session_participants')
        .select('user_id, hand_raised, user:user_id(*)')
        .eq('session_id', sessionId)
        .eq('hand_raised', true);

      if (!error && data) {
        setUsersWithHandRaised(data);
      }
    };

    fetchHandRaised();

    // S'abonner aux nouveaux messages
    const messagesSubscription = supabase
      .channel(`chat_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_messages',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          const { data: newMsg, error } = await supabase
            .from('live_session_messages')
            .select('*, user:user_id(*)')
            .eq('id', payload.new.id)
            .single();

          if (!error && newMsg) {
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    // S'abonner aux changements de participants
    const participantsSubscription = supabase
      .channel(`participants_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        async () => {
          const { data, error } = await supabase
            .from('live_session_participants')
            .select('user_id, hand_raised, user:user_id(*)')
            .eq('session_id', sessionId)
            .eq('hand_raised', true);

          if (!error) {
            setUsersWithHandRaised(data || []);
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      participantsSubscription.unsubscribe();
    };
  }, [sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
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

  const handleRaiseHand = async () => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('live_session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        const { error } = await supabase
          .from('live_session_participants')
          .update({ hand_raised: !handRaised })
          .eq('id', existing.id);

        if (error) throw error;
        setHandRaised(!handRaised);
        toast.success(handRaised ? "Main levée retirée" : "Main levée !");
      } else {
        const { error } = await supabase
          .from('live_session_participants')
          .insert({
            session_id: sessionId,
            user_id: currentUser.id,
            hand_raised: true,
            status: 'connected'
          });

        if (error) throw error;
        setHandRaised(true);
        toast.success("Main levée !");
      }
    } catch (error) {
      console.error('Error raising hand:', error);
      toast.error("Impossible de lever la main");
    }
  };

  const handlePin = async (msgId, currentState) => {
    if (!isFormateur) return;
    try {
      const { error } = await supabase
        .from('live_session_messages')
        .update({ is_pinned: !currentState })
        .eq('id', msgId);

      if (error) throw error;
    } catch (err) {
      toast.error("Erreur lors de l'épinglage");
    }
  };

  const handleDelete = async (msgId) => {
    if (!isFormateur) return;
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      const { error } = await supabase
        .from('live_session_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
    } catch (err) {
      toast.error("Erreur de suppression");
    }
  };

  const handleReaction = async (msg, emoji) => {
    try {
      let currentReactions = msg.reactions || {};
      if (!currentReactions[emoji]) currentReactions[emoji] = [];
      
      const userIdx = currentReactions[emoji].indexOf(currentUser.id);
      if (userIdx > -1) {
        currentReactions[emoji].splice(userIdx, 1);
        if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
      } else {
        currentReactions[emoji].push(currentUser.id);
      }

      const { error } = await supabase
        .from('live_session_messages')
        .update({ reactions: currentReactions })
        .eq('id', msg.id);

      if (error) throw error;
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const exportChat = () => {
    const text = messages
      .filter(m => m.message_type === 'text')
      .map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.user?.full_name || 'Anonyme'}: ${m.message}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages.filter(m => 
    m.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedMessages = messages.filter(m => m.is_pinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            Chat en direct
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={exportChat} 
            title="Exporter le chat"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..." 
            className="h-8 pl-8 text-xs"
          />
        </div>

        {usersWithHandRaised.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {usersWithHandRaised.map((participant) => (
              <div key={participant.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-600">
                <Hand className="h-3 w-3" />
                <span>{participant.user?.full_name || 'Utilisateur'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {pinnedMessages.length > 0 && (
        <div className="p-3 border-b bg-primary/5 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Pin className="h-3 w-3" /> Messages épinglés
          </div>
          {pinnedMessages.map(pm => (
            <div key={`pin-${pm.id}`} className="text-xs bg-background p-2 rounded border border-primary/20">
              <span className="font-medium mr-1">{pm.user?.full_name || 'Anonyme'}:</span>
              <span className="text-muted-foreground">{pm.message}</span>
            </div>
          ))}
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucun message</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const user = msg.user;
              const isMe = user?.id === currentUser.id;
              const reactions = msg.reactions || {};
              const hasReactions = Object.keys(reactions).length > 0;
              
              if (msg.message_type === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-muted px-3 py-1 rounded-full text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      {msg.message}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={user?.avatar ? getFileUrl('users', user.avatar) : null} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-muted-foreground mb-1">
                      {isMe ? 'Vous' : (user?.full_name || 'Anonyme')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    <div className="relative group/msg flex items-center gap-2">
                      {!isMe && (
                        <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-opacity">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Smile className="h-3 w-3" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 flex gap-1">
                              {EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => handleReaction(msg, emoji)} className="hover:bg-muted p-1 rounded text-lg">
                                  {emoji}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                          {isFormateur && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePin(msg.id, msg.is_pinned)}>
                                <Pin className={`h-3 w-3 ${msg.is_pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(msg.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted text-foreground rounded-tl-sm'
                      }`}>
                        {msg.message}
                      </div>

                      {isMe && (
                        <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-opacity">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Smile className="h-3 w-3" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 flex gap-1">
                              {EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => handleReaction(msg, emoji)} className="hover:bg-muted p-1 rounded text-lg">
                                  {emoji}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                    
                    {hasReactions && (
                      <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(reactions).map(([emoji, users]) => (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(msg, emoji)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${users.includes(currentUser.id) ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'} flex items-center gap-1`}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-3 bg-muted/20 border-t shrink-0">
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant={handRaised ? "default" : "outline"}
            className={`h-9 w-9 ${handRaised ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            onClick={handleRaiseHand}
            title={handRaised ? "Retirer la main" : "Lever la main"}
          >
            <Hand className="h-4 w-4" />
          </Button>
          
          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message..." 
              className="flex-1 text-sm h-9"
            />
            <Button type="submit" size="icon" className="h-9 w-9" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;