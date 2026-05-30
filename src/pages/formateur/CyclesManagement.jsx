import React, { useState, useEffect } from 'react';
import { Layers, AlertCircle, BookOpen, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Mapping des catégories
const CATEGORY_LABELS = {
  direct: 'Concours direct',
  professional: 'Concours professionnel',
  other: 'Autre formation'
};

const CyclesManagement = () => {
  const { currentUser } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  // Récupérer l'admin_id du formateur (le propriétaire du cycle)
  const getAdminId = async () => {
    if (currentUser?.admin_id) return currentUser.admin_id;
    const { data, error } = await supabase
      .from('users')
      .select('admin_id')
      .eq('id', currentUser?.id)
      .single();
    if (error || !data?.admin_id) return null;
    return data.admin_id;
  };

  const fetchCycles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const adminId = await getAdminId();
      if (!adminId) {
        setCycles([]);
        setStats({});
        setIsLoading(false);
        return;
      }

      // ✅ Récupérer uniquement les cycles de l'admin, actifs ET non par défaut
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('cycles')
        .select('*')
        .eq('admin_id', adminId)
        .eq('is_active', true)
        .eq('is_default', false)      // Exclure les cycles par défaut
        .order('name');

      if (cyclesError) throw cyclesError;

      // Pour chaque cycle, récupérer les statistiques
      const cyclesWithStats = await Promise.all((cyclesData || []).map(async (cycle) => {
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id);

        const { count: studentsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id)
          .eq('role', 'apprenant');

        const { count: sessionsCount } = await supabase
          .from('live_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id);

        return {
          ...cycle,
          courses_count: coursesCount || 0,
          students_count: studentsCount || 0,
          sessions_count: sessionsCount || 0,
          progress: Math.min(Math.round((sessionsCount || 0) / 10 * 100), 100)
        };
      }));

      setCycles(cyclesWithStats);
      
      const totalStudents = cyclesWithStats.reduce((acc, c) => acc + c.students_count, 0);
      const totalCourses = cyclesWithStats.reduce((acc, c) => acc + c.courses_count, 0);
      const totalSessions = cyclesWithStats.reduce((acc, c) => acc + c.sessions_count, 0);
      
      setStats({
        totalCycles: cyclesWithStats.length,
        totalStudents,
        totalCourses,
        totalSessions
      });
    } catch (err) {
      console.error('[CyclesManagement] Error:', err);
      setError(err.message || 'Erreur lors du chargement des cycles');
      toast.error('Impossible de charger les cycles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold">Erreur de chargement</h3>
          <p className="text-sm opacity-90">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCycles} className="mt-2">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
        <Layers className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Aucun cycle disponible</h3>
        <p className="text-muted-foreground">Votre administrateur ne vous a pas encore assigné de cycle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cycles Actifs</p>
              <p className="text-2xl font-bold">{stats.totalCycles}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Apprenants</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cours</p>
              <p className="text-2xl font-bold">{stats.totalCourses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sessions Live</p>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Mes Cycles de Formation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-center">Cours</TableHead>
                <TableHead className="text-center">Apprenants</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead>Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell>
                    <div>
                      <p className="font-bold">{cycle.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {cycle.description || 'Aucune description'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {CATEGORY_LABELS[cycle.category] || 'Autre formation'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{cycle.courses_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{cycle.students_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{cycle.sessions_count}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="space-y-1">
                      <Progress value={cycle.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">{cycle.progress}%</p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CyclesManagement;