// src/pages/formateur/LearnerTracking.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Activity, Users, BookOpen, Target, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';

const LearnerTracking = () => {
  const { currentUser } = useAuth();
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [learners, setLearners] = useState([]);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Récupérer les cycles du formateur connecté (admin_id)
  useEffect(() => {
    const fetchCycles = async () => {
      setLoadingCycles(true);
      try {
        // Récupérer l'admin_id du formateur (soit depuis currentUser soit depuis la table users)
        let adminId = currentUser?.admin_id;
        if (!adminId && currentUser?.id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('admin_id')
            .eq('id', currentUser.id)
            .single();
          if (userError) throw userError;
          adminId = userData?.admin_id;
        }

        if (!adminId) {
          setCycles([]);
          setLoadingCycles(false);
          return;
        }

        const { data, error } = await supabase
          .from('cycles')
          .select('id, name')
          .eq('is_active', true)
          .eq('admin_id', adminId)  // ← Filtre important
          .order('name');

        if (error) throw error;
        setCycles(data || []);
        if (data && data.length > 0) {
          setSelectedCycle(data[0].id);
        } else {
          setSelectedCycle('');
        }
      } catch (error) {
        console.error('Error fetching cycles:', error);
        toast.error('Erreur lors du chargement des cycles');
      } finally {
        setLoadingCycles(false);
      }
    };

    if (currentUser?.id) fetchCycles();
    else setLoadingCycles(false);
  }, [currentUser]);

  // 2. Récupérer les apprenants et leurs stats quand le cycle change
  useEffect(() => {
    const fetchLearnersData = async () => {
      if (!selectedCycle) {
        setLearners([]);
        return;
      }
      
      setLoadingLearners(true);
      try {
        // Récupérer les apprenants du cycle
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, avatar, created_at')
          .eq('cycle_id', selectedCycle)
          .eq('role', 'apprenant');

        if (usersError) throw usersError;

        if (!users || users.length === 0) {
          setLearners([]);
          setLoadingLearners(false);
          return;
        }

        // Récupérer toutes les tentatives de quiz pour ces apprenants
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('user_id, score, total_possible, completed_at')
          .in('user_id', users.map(u => u.id));

        if (attemptsError) throw attemptsError;

        // Calculer les statistiques par apprenant
        const learnersWithStats = users.map(user => {
          const userAttempts = attempts?.filter(a => a.user_id === user.id) || [];
          const totalScore = userAttempts.reduce((sum, a) => sum + a.score, 0);
          const totalPossible = userAttempts.reduce((sum, a) => sum + a.total_possible, 0);
          const avgPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
          const lastAttempt = userAttempts.length > 0 
            ? new Date(Math.max(...userAttempts.map(a => new Date(a.completed_at).getTime())))
            : null;
          
          return {
            id: user.id,
            full_name: user.full_name || 'Sans nom',
            email: user.email,
            avatar: user.avatar,
            quizzes_taken: userAttempts.length,
            avg_score: avgPercentage,
            total_points: totalScore,
            total_possible: totalPossible,
            last_activity: lastAttempt ? lastAttempt : new Date(user.created_at),
          };
        });

        // Trier par moyenne décroissante pour attribuer un rang
        const sorted = [...learnersWithStats].sort((a, b) => b.avg_score - a.avg_score);
        let rank = 1;
        const rankedLearners = sorted.map((learner, idx) => {
          if (idx > 0 && learner.avg_score < sorted[idx-1].avg_score) rank = idx + 1;
          return { ...learner, rank };
        });

        setLearners(rankedLearners);
      } catch (error) {
        console.error('Error fetching learners:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoadingLearners(false);
      }
    };

    fetchLearnersData();
  }, [selectedCycle]);

  // Filtrage par recherche
  const filteredLearners = learners.filter(l => {
    const name = (l.full_name || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Statistiques globales pour le cycle sélectionné
  const globalStats = {
    total: learners.length,
    avgGlobal: learners.length > 0 
      ? Math.round(learners.reduce((acc, l) => acc + l.avg_score, 0) / learners.length) 
      : 0,
    totalQuizzes: learners.reduce((acc, l) => acc + l.quizzes_taken, 0),
    bestScore: learners.length > 0 ? Math.max(...learners.map(l => l.avg_score)) : 0,
  };

  if (loadingCycles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Aucun cycle disponible</h3>
        <p className="text-muted-foreground">Vous n’êtes rattaché à aucun cycle pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Suivi des Apprenants</h2>
        <p className="text-muted-foreground">Analysez la progression de vos élèves (quiz, scores, classement).</p>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total inscrits</p>
              <h3 className="text-2xl font-bold">{globalStats.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Moyenne générale</p>
              <h3 className="text-2xl font-bold">{globalStats.avgGlobal}%</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quiz complétés</p>
              <h3 className="text-2xl font-bold">{globalStats.totalQuizzes}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Meilleur score</p>
              <h3 className="text-2xl font-bold">{globalStats.bestScore}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Liste des Apprenants</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sélectionner un cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map(cycle => (
                    <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nom ou email..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Rang</TableHead>
                <TableHead>Apprenant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Quiz faits</TableHead>
                <TableHead className="text-center">Score moyen</TableHead>
                <TableHead className="text-center">Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLearners ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !selectedCycle ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Sélectionnez un cycle pour voir les apprenants.
                  </TableCell>
                </TableRow>
              ) : filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Aucun apprenant trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredLearners.map(learner => (
                  <TableRow key={learner.id}>
                    <TableCell className="pl-6 font-bold text-center">{learner.rank}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={learner.avatar} />
                          <AvatarFallback>{learner.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        {learner.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{learner.email}</TableCell>
                    <TableCell className="text-center">{learner.quizzes_taken}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${learner.avg_score >= 70 ? 'text-green-600' : learner.avg_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {learner.avg_score}%
                        </span>
                        <Progress value={learner.avg_score} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {new Date(learner.last_activity).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearnerTracking;