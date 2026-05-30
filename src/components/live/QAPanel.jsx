// src/components/live/QAPanel.jsx
import React, { useState, useEffect } from 'react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Send, ThumbsUp, MessageCircle as MessageCircleQuestion, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const QAPanel = ({ sessionId, currentUser, isFormateur }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [answerInputs, setAnswerInputs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQA = async () => {
      try {
        const { data: records, error } = await supabase
          .from('session_qa')
          .select('*, user:user_id(*)')
          .eq('session_id', sessionId)
          .order('votes', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuestions(records || []);
      } catch (err) {
        console.error('Error fetching Q&A:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQA();

    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel(`qa_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_qa',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: record, error } = await supabase
              .from('session_qa')
              .select('*, user:user_id(*)')
              .eq('id', payload.new.id)
              .single();

            if (!error && record) {
              setQuestions(prev => {
                const filtered = prev.filter(q => q.id !== record.id);
                const updated = [...filtered, record];
                return updated.sort((a, b) => b.votes - a.votes || new Date(b.created_at) - new Date(a.created_at));
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      const { error } = await supabase
        .from('session_qa')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          question: newQuestion.trim(),
          is_answered: false,
          votes: 0,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      setNewQuestion('');
      toast.success('Question soumise avec succès');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleVote = async (qId, currentVotes) => {
    try {
      const { error } = await supabase
        .from('session_qa')
        .update({ votes: currentVotes + 1 })
        .eq('id', qId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswerSubmit = async (qId) => {
    const answer = answerInputs[qId];
    if (!answer?.trim()) return;
    try {
      const { error } = await supabase
        .from('session_qa')
        .update({
          answer: answer.trim(),
          is_answered: true,
          answered_at: new Date().toISOString()
        })
        .eq('id', qId);

      if (error) throw error;
      
      setAnswerInputs(prev => {
        const next = {...prev};
        delete next[qId];
        return next;
      });
      toast.success('Réponse publiée');
    } catch (err) {
      console.error(err);
      toast.error('Erreur de publication');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-3 border-b border-border bg-muted/30 shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-primary" /> Questions & Réponses
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <MessageCircleQuestion className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Aucune question posée</p>
            </div>
          ) : (
            questions.map(q => {
              const user = q.user;
              return (
                <div key={q.id} className="p-3 rounded-lg border bg-muted/10 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user?.avatar ? getFileUrl('users', user.avatar) : null} />
                        <AvatarFallback className="text-[10px]">{user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{user?.full_name || 'Anonyme'}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <Badge variant={q.is_answered ? "secondary" : "outline"} className={q.is_answered ? "bg-green-500/10 text-green-600 border-0" : "text-amber-600"}>
                      {q.is_answered ? 'Répondu' : 'En attente'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm font-medium">{q.question}</p>
                  
                  {q.is_answered ? (
                    <div className="bg-primary/5 border border-primary/20 p-2 rounded-md mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-primary font-semibold mb-1">
                        <CheckCircle2 className="h-3 w-3" /> Formateur
                      </div>
                      <p className="text-sm">{q.answer}</p>
                    </div>
                  ) : isFormateur ? (
                    <div className="mt-2 space-y-2">
                      <Textarea 
                        placeholder="Rédiger une réponse..."
                        className="min-h-[60px] text-xs"
                        value={answerInputs[q.id] || ''}
                        onChange={(e) => setAnswerInputs({...answerInputs, [q.id]: e.target.value})}
                      />
                      <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleAnswerSubmit(q.id)}>
                        Publier la réponse
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex justify-end border-t pt-2">
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => handleVote(q.id, q.votes)}>
                      <ThumbsUp className="h-3 w-3" /> {q.votes} Vote{q.votes !== 1 && 's'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {!isFormateur && (
        <div className="p-3 bg-muted/20 border-t shrink-0">
          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <Input 
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Poser une question..." 
              className="flex-1 text-sm h-9"
            />
            <Button type="submit" size="icon" className="h-9 w-9" disabled={!newQuestion.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QAPanel;