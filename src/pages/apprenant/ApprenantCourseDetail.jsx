import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { ArrowLeft, Clock, BookOpen, Video } from 'lucide-react';
import { toast } from 'sonner';

const ApprenantCourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setCourse(data);
      } catch (error) {
        console.error('Erreur chargement cours:', error);
        toast.error('Cours introuvable');
        navigate('/apprenant/courses');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCourse();
  }, [id, navigate]);

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!course) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => navigate('/apprenant/courses')} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour aux cours
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{course.title}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {course.category && <Badge variant="outline">{course.category}</Badge>}
            {course.level && <Badge variant="outline" className="capitalize">{course.level}</Badge>}
            {course.duration && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {course.duration} min
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {course.video_url && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={course.video_url}
                className="w-full h-full"
                allowFullScreen
                title={course.title}
              />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{course.description || 'Aucune description.'}</p>
          </div>
          {course.content && (
            <div>
              <h3 className="text-xl font-semibold mb-2">Contenu</h3>
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: course.content }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprenantCourseDetail;