import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ApprenantCourses = () => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!currentUser?.cycle_id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('cycle_id', currentUser.cycle_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Erreur chargement cours:', error);
        toast.error('Impossible de charger les cours');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucun cours disponible pour votre cycle.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map(course => (
        <Card key={course.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl">{course.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {course.category && <Badge variant="outline">{course.category}</Badge>}
              {course.level && <Badge variant="outline" className="capitalize">{course.level}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
              {course.description || 'Aucune description'}
            </p>
            <div className="flex items-center justify-between">
              {course.duration && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {course.duration} min
                </span>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to={`/apprenant/course/${course.id}`}>Voir le cours</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ApprenantCourses;