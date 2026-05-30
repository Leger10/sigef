import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Clock, Lock, Unlock, ArrowRight, BookOpen } from 'lucide-react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { useAccess } from '@/hooks/useAccess.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const FormatorPrograms = ({ formateurId }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const { checkAccess } = useAccess();
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        
        // Récupérer les programmes du formateur
        const { data: programsData, error: programsError } = await supabase
          .from('courses')
          .select('*')
          .eq('formateur_id', formateurId)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (programsError) throw programsError;

        setPrograms(programsData || []);

        // Récupérer les inscriptions si utilisateur connecté
        if (currentUser) {
          const { data: enrollmentsData, error: enrollError } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('user_id', currentUser.id)
            .eq('status', 'active');

          if (!enrollError && enrollmentsData) {
            setEnrollments(enrollmentsData.map(e => e.plan_id));
          }
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (formateurId) fetchPrograms();
  }, [formateurId, currentUser]);

  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesLevel = levelFilter === 'all' || p.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden border-none shadow-sm">
            <Skeleton className="h-48 w-full rounded-none" />
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un programme..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-none"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/50 border-none">
            <SelectValue placeholder="Niveau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            <SelectItem value="beginner">Débutant</SelectItem>
            <SelectItem value="intermediate">Intermédiaire</SelectItem>
            <SelectItem value="advanced">Avancé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Aucun programme trouvé</h3>
          <p className="text-muted-foreground">Essayez de modifier vos filtres de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map(program => {
            const isEnrolled = enrollments.includes(program.id);
            const access = checkAccess(program, isEnrolled);
            const coverUrl = program.cover_image ? getFileUrl('courses', program.cover_image) : null;

            return (
              <Card key={program.id} className="flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group">
                <div className="relative h-48 bg-muted overflow-hidden">
                  {coverUrl ? (
                    <img src={coverUrl} alt={program.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                      <BookOpen className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {program.is_public ? (
                      <Badge className="bg-success/90 hover:bg-success text-white shadow-sm backdrop-blur-sm"><Unlock className="w-3 h-3 mr-1"/> Public</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm"><Lock className="w-3 h-3 mr-1"/> PRO</Badge>
                    )}
                  </div>
                  {!access.hasAccess && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="font-bold text-sm">Abonnement PRO requis</p>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    {program.category && <Badge variant="outline" className="text-xs">{program.category}</Badge>}
                    {program.level && <Badge variant="outline" className="text-xs capitalize">{program.level}</Badge>}
                  </div>
                  <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{program.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                    {program.description || 'Aucune description fournie.'}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground gap-4 mt-auto pt-4 border-t border-border/50">
                    {program.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {program.duration}h
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="p-6 pt-0">
                  {isEnrolled ? (
                    <Button asChild className="w-full" variant="secondary">
                      <Link to={`/program/${program.id}`}>Continuer l'apprentissage</Link>
                    </Button>
                  ) : access.hasAccess ? (
                    <Button asChild className="w-full group/btn">
                      <Link to={`/program/${program.id}`}>
                        Voir le programme <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full" variant="outline">
                      <Link to="/subscription">Débloquer l'accès</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormatorPrograms;
