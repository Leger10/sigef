// src/components/apprenant/CycleChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, Square, Play, Paperclip, File, Image, FileText, Download, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const getAvatarColor = (name) => {
  if (!name) return 'bg-gray-500';
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const CycleChat = ({ cycleId, userId, onUnreadCountChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const scrollRef = useRef(null);
  const [userName, setUserName] = useState('');
  const fileInputRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const recordingTimerRef = useRef(null);
  const lastReadTimestampRef = useRef(null);
  const currentUserIdStr = String(userId);
  const storageKey = `chat_last_read_${cycleId}_${userId}`;

  // Notifier le parent à chaque changement du compteur
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.from('users').select('full_name, role').eq('id', userId).single();
      if (data) {
        setUserName(data.full_name || 'Anonyme');
        setUserRole(data.role);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  const calculateUnread = (msgs) => {
    const lastRead = localStorage.getItem(storageKey);
    let lastReadDate = lastRead ? new Date(lastRead) : new Date(0);
    if (isUserAtBottomRef.current && msgs.length > 0) {
      const latestMsgDate = new Date(msgs[msgs.length - 1].created_at);
      if (latestMsgDate > lastReadDate) {
        lastReadDate = latestMsgDate;
        localStorage.setItem(storageKey, latestMsgDate.toISOString());
      }
    }
    const count = msgs.filter(msg => {
      const msgDate = new Date(msg.created_at);
      return msgDate > lastReadDate && msg.user_id !== userId;
    }).length;
    setUnreadCount(count);
    lastReadTimestampRef.current = lastReadDate;
  };

  const loadMessages = async () => {
    if (!cycleId) return;
    const { data, error } = await supabase
      .from('cycle_chat_messages')
      .select('*, user:user_id(full_name)')
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (!error && data) {
      setMessages(data);
      calculateUnread(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [cycleId]);

  useEffect(() => {
    if (messages.length > 0) calculateUnread(messages);
  }, [messages]);

  const handleScroll = (e) => {
    const target = e.target;
    const isBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 10;
    if (isBottom && !isUserAtBottomRef.current) {
      isUserAtBottomRef.current = true;
      if (messages.length > 0) {
        const latestMsgDate = new Date(messages[messages.length - 1].created_at);
        localStorage.setItem(storageKey, latestMsgDate.toISOString());
        setUnreadCount(0);
        lastReadTimestampRef.current = latestMsgDate;
      }
    } else if (!isBottom) {
      isUserAtBottomRef.current = false;
    }
  };

  useEffect(() => {
    if (!cycleId) return;
    const channel = supabase
      .channel('cycle-chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cycle_chat_messages' }, async (payload) => {
        if (payload.new.cycle_id === cycleId) {
          const { data: userData } = await supabase.from('users').select('full_name').eq('id', payload.new.user_id).single();
          const newMsg = { ...payload.new, user: userData || { full_name: 'Inconnu' } };
          setMessages((prev) => [...prev, newMsg]);
          if (!isUserAtBottomRef.current && newMsg.user_id !== userId) {
            setUnreadCount(prev => prev + 1);
          }
          if (isUserAtBottomRef.current) setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cycle_chat_messages' }, (payload) => {
        setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cycleId, userId]);

  const sendMessage = async () => {
    if (pendingFile) {
      await uploadPendingFile();
      if (newMessage.trim()) {
        const comment = newMessage.trim();
        const tempId = Date.now();
        const newMsg = {
          id: tempId,
          cycle_id: cycleId,
          user_id: userId,
          message: comment,
          created_at: new Date().toISOString(),
          user: { full_name: userName }
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        isUserAtBottomRef.current = true;
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        const { error } = await supabase.from('cycle_chat_messages').insert({
          cycle_id: cycleId,
          user_id: userId,
          message: comment,
          created_at: new Date().toISOString(),
        });
        if (error) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
          toast.error('Erreur lors de l’envoi du commentaire');
        } else {
          const latestMsgDate = new Date();
          localStorage.setItem(storageKey, latestMsgDate.toISOString());
          setUnreadCount(0);
          lastReadTimestampRef.current = latestMsgDate;
        }
      }
      return;
    }

    if (!newMessage.trim()) return;
    const tempId = Date.now();
    const newMsg = {
      id: tempId,
      cycle_id: cycleId,
      user_id: userId,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      user: { full_name: userName }
    };
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    isUserAtBottomRef.current = true;
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    const { error } = await supabase.from('cycle_chat_messages').insert({
      cycle_id: cycleId,
      user_id: userId,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    });
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Erreur lors de l’envoi du message');
    } else {
      const latestMsgDate = new Date();
      localStorage.setItem(storageKey, latestMsgDate.toISOString());
      setUnreadCount(0);
      lastReadTimestampRef.current = latestMsgDate;
    }
  };

  const uploadPendingFile = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${userId}.${fileExt}`;
      const filePath = `cycle_${cycleId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('chat_files').upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chat_files').getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;
      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type === 'application/pdf') fileType = 'pdf';
      else if (file.type.includes('document')) fileType = 'doc';
      const fileMessage = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n${fileUrl}\n[TYPE:${fileType}]`;
      const { error: insertError } = await supabase.from('cycle_chat_messages').insert({
        cycle_id: cycleId,
        user_id: userId,
        message: fileMessage,
        created_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      toast.success('Fichier envoyé');
      setPendingFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l’envoi du fichier');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    setPendingFile(file);
    setNewMessage('');
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (recording) {
      recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); };
  }, [recording]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      toast.info('Enregistrement en cours...');
    } catch (err) {
      toast.error('Impossible d’accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setUploading(true);
    }
  };

  const uploadAudio = async (audioBlob) => {
    const fileName = `audio_${Date.now()}_${userId}.webm`;
    const filePath = `cycle_${cycleId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('chat_audio').upload(filePath, audioBlob, { contentType: 'audio/webm' });
    if (uploadError) {
      toast.error('Erreur lors de l’upload audio');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('chat_audio').getPublicUrl(filePath);
    const audioUrl = urlData.publicUrl;
    const audioMessage = `🎤 Message audio : ${audioUrl}`;
    const { error: insertError } = await supabase.from('cycle_chat_messages').insert({
      cycle_id: cycleId,
      user_id: userId,
      message: audioMessage,
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      toast.error('Erreur lors de l’envoi du message audio');
    } else {
      toast.success('Audio envoyé');
    }
    setUploading(false);
  };

  const deleteMessage = async (messageId, messageUserId) => {
    const canDelete = String(messageUserId) === currentUserIdStr || ['formateur', 'admin', 'super_admin'].includes(userRole);
    if (!canDelete) {
      toast.error("Vous n'avez pas le droit de supprimer ce message");
      return;
    }
    if (!window.confirm('Supprimer définitivement ce message ?')) return;
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    try {
      const { error } = await supabase.from('cycle_chat_messages').delete().eq('id', messageId);
      if (error) throw error;
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Erreur suppression:', error);
      await loadMessages();
      toast.error('Erreur lors de la suppression');
    }
  };

  const renderMessageWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) =>
      part.match(urlRegex) ? (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all hover:text-blue-300" onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const renderMessage = (msg) => {
    const audioMatch = msg.message?.match(/🎤 Message audio : (https?:\/\/[^\s]+)/);
    if (audioMatch) {
      const audioUrl = audioMatch[1];
      return (
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 cursor-pointer hover:scale-110 transition" onClick={() => new Audio(audioUrl).play()} />
          <audio controls className="h-8 max-w-[180px]"><source src={audioUrl} type="audio/webm" /></audio>
        </div>
      );
    }
    const fileMatch = msg.message?.match(/📎 (.+?)\n(https?:\/\/[^\s]+)\n\[TYPE:(\w+)\]/);
    if (fileMatch) {
      const fileName = fileMatch[1];
      const fileUrl = fileMatch[2];
      const fileType = fileMatch[3];
      const getFileIcon = () => {
        if (fileType === 'image') return <Image className="h-5 w-5 text-blue-500" />;
        if (fileType === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
        return <File className="h-5 w-5 text-gray-500" />;
      };
      if (fileType === 'image') {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">{getFileIcon()}<span className="font-medium">{fileName}</span></div>
            <img src={fileUrl} alt={fileName} className="max-w-full max-h-48 rounded-lg cursor-pointer" onClick={() => window.open(fileUrl, '_blank')} />
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => window.open(fileUrl, '_blank')}><Download className="h-3 w-3 mr-1" /> Télécharger</Button>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">{getFileIcon()}<span className="font-medium">{fileName}</span></div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => window.open(fileUrl, '_blank')}><Download className="h-3 w-3 mr-1" /> Ouvrir / Télécharger</Button>
        </div>
      );
    }
    return <div className="text-sm break-words whitespace-pre-wrap">{renderMessageWithLinks(msg.message || '(Message vide)')}</div>;
  };

  const canDeleteMessage = (messageUserId) => String(messageUserId) === currentUserIdStr || ['formateur', 'admin', 'super_admin'].includes(userRole);

  if (loading) return <div className="flex justify-center py-12 text-muted-foreground">Chargement du chat...</div>;

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-background shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-3 border-b bg-primary text-white rounded-t-xl">
        <h3 className="font-semibold">
          Chat du cycle
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 bg-red-500 text-white">
              {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
            </Badge>
          )}
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4" onScroll={handleScroll}>
        <div className="space-y-3">
          {messages.length === 0 && <div className="text-center text-muted-foreground py-12">Aucun message. Soyez le premier à écrire !</div>}
          {messages.map((msg) => {
            const isCurrentUser = String(msg.user_id) === currentUserIdStr;
            const timeStr = formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr });
            const avatarFallback = (msg.user?.full_name?.charAt(0) || 'U').toUpperCase();
            const avatarColor = getAvatarColor(msg.user?.full_name || '');
            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-start gap-2 group`}>
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className={`${avatarColor} text-white text-xs`}>{avatarFallback}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`relative max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {!isCurrentUser && <div className="text-xs font-semibold mb-1 text-primary-foreground/80">{msg.user?.full_name || 'Anonyme'}</div>}
                  {renderMessage(msg)}
                  <div className={`text-[10px] mt-1 text-right ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{timeStr}</div>
                  {canDeleteMessage(msg.user_id) && (
                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMessage(msg.id, msg.user_id)} title="Supprimer le message">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                {isCurrentUser && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary text-white text-xs">{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card">
        {pendingFile && (
          <div className="mb-3 p-2 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm truncate">
              <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium truncate">{pendingFile.name}</span>
              <span className="text-xs text-muted-foreground">({(pendingFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelPendingFile} className="h-6 w-6 p-0 rounded-full">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={pendingFile ? "Ajouter un commentaire (optionnel)..." : "Écrivez votre message..."}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={uploading}
              className="rounded-full bg-muted/50 border-none focus-visible:ring-primary"
            />
          </div>

          <Button size="icon" onClick={sendMessage} disabled={(!newMessage.trim() && !pendingFile) || uploading} className="rounded-full shrink-0">
            <Send className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-full shrink-0" title="Envoyer un fichier">
            <Paperclip className="h-4 w-4" />
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />

          {!recording ? (
            <Button size="icon" variant="outline" onClick={startRecording} disabled={uploading} className="text-red-500 hover:text-red-600 rounded-full shrink-0" title="Message vocal">
              <Mic className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-red-500 animate-pulse">{formatDuration(recordingDuration)}</span>
              <Button size="icon" variant="destructive" onClick={stopRecording} className="rounded-full shrink-0 animate-pulse" title="Arrêter l'enregistrement">
                <Square className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {uploading && <div className="text-xs text-center text-muted-foreground mt-2">Envoi en cours...</div>}
      </div>
    </div>
  );
};

export default CycleChat;