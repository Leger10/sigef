import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock } from 'lucide-react';

const ProgramsList = ({ cycleId }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cycleId) return;
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('cycle_id', cycleId)
          .order('category', { ascending: true })
          .order('order', { ascending: true });
        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [cycleId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (courses.length === 0) return <p className="text-center text-gray-400">Aucun programme disponible.</p>;

  // Grouper par catégorie
  const grouped = courses.reduce((acc, course) => {
    const cat = course.category || 'Général';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(course);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> {category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {items.map((course) => (
                <AccordionItem key={course.id} value={course.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <span className="font-medium">{course.title}</span>
                      {course.duration && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {course.duration} min
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-4">{course.description || 'Aucune description.'}</p>
                    {course.video_url && (
                      <div className="aspect-video rounded-lg overflow-hidden mb-3">
                        <iframe src={course.video_url} className="w-full h-full" allowFullScreen title={course.title} />
                      </div>
                    )}
                    {course.content && (
                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: course.content }} />
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProgramsList;