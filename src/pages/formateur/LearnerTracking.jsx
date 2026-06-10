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
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { Search, Activity, Users, BookOpen, Target, TrendingUp, Award, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const LearnerTracking = () => {
  const { currentUser } = useAuth();
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [learners, setLearners] = useState([]);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour la réinitialisation
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [resetType, setResetType] = useState('all'); // 'all', 'quiz_only', 'sessions_only'
  const [isResetting, setIsResetting] = useState(false);
  const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);

  // 1. Récupérer les cycles du formateur connecté (admin_id)
  useEffect(() => {
    const fetchCycles = async () => {
      setLoadingCycles(true);
      try {
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
          .eq('admin_id', adminId)
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
        .select('id, email, full_name, avatar, created_at, phone, pro_status, pro_expiry')
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
        .select('user_id, score, total_possible, completed_at, passed')
        .in('user_id', users.map(u => u.id));

      if (attemptsError) throw attemptsError;

      // Récupérer les sessions participées
      const { data: sessions, error: sessionsError } = await supabase
        .from('live_session_participants')
        .select('user_id, session_id, joined_at')
        .in('user_id', users.map(u => u.id));

      if (sessionsError) throw sessionsError;

      // Calculer les statistiques par apprenant
      const learnersWithStats = users.map(user => {
        const userAttempts = attempts?.filter(a => a.user_id === user.id) || [];
        const userSessions = sessions?.filter(s => s.user_id === user.id) || [];
        
        const totalScore = userAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const totalPossible = userAttempts.reduce((sum, a) => sum + (a.total_possible || 0), 0);
        const avgPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        
        const lastAttempt = userAttempts.length > 0 
          ? new Date(Math.max(...userAttempts.map(a => new Date(a.completed_at).getTime())))
          : null;
        
        const passedQuizzes = userAttempts.filter(a => a.passed === true).length;
        
        return {
          id: user.id,
          full_name: user.full_name || 'Sans nom',
          email: user.email,
          phone: user.phone || '-',
          avatar: user.avatar,
          quizzes_taken: userAttempts.length,
          sessions_participated: userSessions.length,
          passed_quizzes: passedQuizzes,
          avg_score: avgPercentage,
          total_points: totalScore,
          total_possible: totalPossible,
          last_activity: lastAttempt ? lastAttempt : new Date(user.created_at),
          isProActive: user.pro_status === true && (!user.pro_expiry || new Date(user.pro_expiry) > new Date())
        };
      });

      // Trier par moyenne décroissante
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

  useEffect(() => {
    fetchLearnersData();
  }, [selectedCycle]);

  // Fonction de réinitialisation pour un apprenant spécifique
  const resetLearnerData = async () => {
    if (!selectedLearner) return;
    
    setIsResetting(true);
    try {
      if (resetType === 'all' || resetType === 'quiz_only') {
        // Supprimer toutes les tentatives de quiz de l'apprenant
        const { error: attemptsError } = await supabase
          .from('quiz_attempts')
          .delete()
          .eq('user_id', selectedLearner.id);
        
        if (attemptsError) throw attemptsError;
      }
      
      if (resetType === 'all' || resetType === 'sessions_only') {
        // Supprimer toutes les participations aux sessions
        const { error: sessionsError } = await supabase
          .from('live_session_participants')
          .delete()
          .eq('user_id', selectedLearner.id);
        
        if (sessionsError) throw sessionsError;
      }
      
      toast.success(`Données réinitialisées pour ${selectedLearner.full_name}`);
      setResetDialogOpen(false);
      setSelectedLearner(null);
      fetchLearnersData(); // Rafraîchir les données
    } catch (error) {
      console.error('Error resetting learner data:', error);
      toast.error('Erreur lors de la réinitialisation des données');
    } finally {
      setIsResetting(false);
    }
  };

  // Fonction de réinitialisation pour tout le cycle
  const resetAllLearnersData = async () => {
    if (!selectedCycle) return;
    
    setIsResetting(true);
    try {
      // Récupérer tous les apprenants du cycle
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('cycle_id', selectedCycle)
        .eq('role', 'apprenant');
      
      if (usersError) throw usersError;
      
      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        
        // Supprimer toutes les tentatives de quiz
        const { error: attemptsError } = await supabase
          .from('quiz_attempts')
          .delete()
          .in('user_id', userIds);
        
        if (attemptsError) throw attemptsError;
        
        // Supprimer toutes les participations aux sessions
        const { error: sessionsError } = await supabase
          .from('live_session_participants')
          .delete()
          .in('user_id', userIds);
        
        if (sessionsError) throw sessionsError;
      }
      
      toast.success(`Toutes les données du cycle ont été réinitialisées`);
      setResetAllDialogOpen(false);
      fetchLearnersData(); // Rafraîchir les données
    } catch (error) {
      console.error('Error resetting all learners data:', error);
      toast.error('Erreur lors de la réinitialisation des données');
    } finally {
      setIsResetting(false);
    }
  };

  // Filtrage par recherche
  const filteredLearners = learners.filter(l => {
    const name = (l.full_name || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Statistiques globales
  const globalStats = {
    total: learners.length,
    avgGlobal: learners.length > 0 
      ? Math.round(learners.reduce((acc, l) => acc + l.avg_score, 0) / learners.length) 
      : 0,
    totalQuizzes: learners.reduce((acc, l) => acc + l.quizzes_taken, 0),
    totalSessions: learners.reduce((acc, l) => acc + l.sessions_participated, 0),
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suivi des Apprenants</h2>
          <p className="text-muted-foreground">Analysez la progression de vos élèves (quiz, sessions, classement).</p>
        </div>
        
        {/* Bouton Réinitialiser tout le cycle */}
        {learners.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setResetAllDialogOpen(true)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser tout le cycle
          </Button>
        )}
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quiz complétés</p>
              <h3 className="text-2xl font-bold">{globalStats.totalQuizzes}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sessions suivies</p>
              <h3 className="text-2xl font-bold">{globalStats.totalSessions}</h3>
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
                <TableHead className="text-center">Quiz</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Score moyen</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-12 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : !selectedCycle ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    Sélectionnez un cycle pour voir les apprenants.
                  </TableCell>
                </TableRow>
              ) : filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
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
                    <TableCell className="text-center">{learner.sessions_participated}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${learner.avg_score >= 70 ? 'text-green-600' : learner.avg_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {learner.avg_score}%
                        </span>
                        <Progress value={learner.avg_score} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {learner.isProActive ? (
                        <Badge className="bg-amber-500 text-white">PRO</Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLearner(learner);
                          setResetDialogOpen(true);
                        }}
                        className="text-destructive hover:bg-destructive/10"
                        title="Réinitialiser les données"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de réinitialisation pour un apprenant */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Réinitialiser les données
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les données à réinitialiser pour <strong>{selectedLearner?.full_name}</strong>.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                <input
                  type="radio"
                  name="resetType"
                  value="all"
                  checked={resetType === 'all'}
                  onChange={() => setResetType('all')}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Tout réinitialiser</p>
                  <p className="text-sm text-muted-foreground">Quiz et sessions (recommandé pour nouvelle évaluation)</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                <input
                  type="radio"
                  name="resetType"
                  value="quiz_only"
                  checked={resetType === 'quiz_only'}
                  onChange={() => setResetType('quiz_only')}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Uniquement les quiz</p>
                  <p className="text-sm text-muted-foreground">Supprime toutes les tentatives de quiz</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                <input
                  type="radio"
                  name="resetType"
                  value="sessions_only"
                  checked={resetType === 'sessions_only'}
                  onChange={() => setResetType('sessions_only')}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Uniquement les sessions</p>
                  <p className="text-sm text-muted-foreground">Supprime l'historique des sessions</p>
                </div>
              </label>
            </div>
            
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm text-destructive">
                ⚠️ Attention : Cette action est irréversible. Les données supprimées ne pourront pas être récupérées.
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={resetLearnerData}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog pour réinitialiser tout le cycle */}
      <AlertDialog open={resetAllDialogOpen} onOpenChange={setResetAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Réinitialiser tout le cycle
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de réinitialiser les données de <strong>tous les apprenants</strong> du cycle sélectionné.
              <br /><br />
              Cela supprimera :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Toutes les tentatives de quiz</li>
                <li>Toutes les participations aux sessions</li>
              </ul>
              <br />
              <span className="text-destructive font-semibold">Cette action est irréversible !</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={resetAllLearnersData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmer la réinitialisation
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LearnerTracking;