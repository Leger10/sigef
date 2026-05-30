import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { PlayCircle, CheckCircle2, FileText, Clock } from 'lucide-react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { toast } from 'sonner';

const ProgramLessons = ({ programId, isEnrolled }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        
        // Récupérer les leçons du programme
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('program_lessons')
          .select('*')
          .eq('program_id', programId)
          .order('order', { ascending: true });

        if (lessonsError) throw lessonsError;
        
        setLessons(lessonsData || []);
        if (lessonsData && lessonsData.length > 0) setActiveLesson(lessonsData[0]);
        
        // Récupérer la progression si l'utilisateur est inscrit
        if (isEnrolled) {
          const { data: progressData, error: progressError } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('program_id', programId)
            .eq('completed', true);
          
          if (!progressError && progressData) {
            const completedIds = progressData.map(p => p.lesson_id);
            setCompletedLessons(completedIds);
            const progressPercent = lessonsData ? (completedIds.length / lessonsData.length) * 100 : 0;
            setProgress(progressPercent);
          }
        } else {
          // Mock progress for non-enrolled users
          setProgress(Math.floor(Math.random() * 100));
        }
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    if (programId) fetchLessons();
  }, [programId, isEnrolled]);

  const handleMarkComplete = async () => {
    if (!isEnrolled) return;
    
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;
    
    try {
      // Vérifier si déjà complété
      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('lesson_id', activeLesson.id)
        .maybeSingle();
      
      if (!existing) {
        const { error } = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: currentUser.id,
            program_id: programId,
            lesson_id: activeLesson.id,
            completed: true,
            completed_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        setCompletedLessons(prev => [...prev, activeLesson.id]);
        const newProgress = ((completedLessons.length + 1) / lessons.length) * 100;
        setProgress(newProgress);
        toast.success('Leçon marquée comme terminée !');
      } else {
        toast.info('Leçon déjà complétée');
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
        <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Aucune leçon disponible</h3>
        <p className="text-muted-foreground">Le formateur n'a pas encore ajouté de contenu à ce programme.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Lesson List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Progression</h3>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-bold">Contenu du programme</h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {lessons.map((lesson, idx) => {
              const isCompleted = completedLessons.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3 items-start ${activeLesson?.id === lesson.id ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isCompleted ? 'bg-success text-white' : activeLesson?.id === lesson.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <h4 className={`font-medium text-sm line-clamp-2 ${activeLesson?.id === lesson.id ? 'text-primary' : ''}`}>{lesson.title}</h4>
                    {lesson.duration && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 mr-1" /> {lesson.duration} min
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-2">
        {activeLesson ? (
          <Card className="border-none shadow-md overflow-hidden">
            {activeLesson.video_url ? (
              <div className="aspect-video bg-black relative flex items-center justify-center">
                <video 
                  src={activeLesson.video_url} 
                  controls 
                  className="w-full h-full object-contain"
                  poster={activeLesson.thumbnail_url}
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <FileText className="w-16 h-16 text-primary/20" />
              </div>
            )}
            
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-4">{activeLesson.title}</h2>
              
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-muted-foreground mb-8">
                {activeLesson.content || activeLesson.description || 'Aucun contenu textuel pour cette leçon.'}
              </div>

              {isEnrolled && (
                <div className="pt-6 border-t flex justify-end">
                  <Button 
                    onClick={handleMarkComplete} 
                    className="gap-2"
                    disabled={completedLessons.includes(activeLesson.id)}
                  >
                    <CheckCircle2 className="w-4 h-4" /> 
                    {completedLessons.includes(activeLesson.id) ? 'Leçon terminée' : 'Marquer comme terminé'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ProgramLessons;
