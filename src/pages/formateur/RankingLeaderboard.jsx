// src/pages/formateur/RankingLeaderboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Trophy, TrendingUp, Star, Award, BookOpen, Crown } from 'lucide-react';
import { toast } from 'sonner';

const RankingLeaderboard = () => {
  const { currentUser } = useAuth();
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // 1. Récupérer les cycles du formateur (admin_id)
  useEffect(() => {
    const fetchCycles = async () => {
      setLoadingCycles(true);
      try {
        // Récupérer l'admin_id du formateur
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
          .eq('admin_id', adminId)   // ← Important : restreindre aux cycles du formateur
          .order('name');

        if (error) throw error;
        setCycles(data || []);
        if (data && data.length > 0) {
          setSelectedCycle(data[0].id);
        }
      } catch (error) {
        console.error('Erreur chargement cycles:', error);
        toast.error('Erreur lors du chargement des cycles');
      } finally {
        setLoadingCycles(false);
      }
    };

    if (currentUser?.id) fetchCycles();
    else setLoadingCycles(false);
  }, [currentUser]);

  // 2. Récupérer le classement des apprenants du cycle sélectionné
  useEffect(() => {
    const fetchRankingData = async () => {
      if (!selectedCycle) {
        setRankings([]);
        return;
      }
      
      setLoadingRankings(true);
      try {
        // Récupérer les apprenants du cycle
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, avatar')
          .eq('cycle_id', selectedCycle)
          .eq('role', 'apprenant');

        if (usersError) throw usersError;

        if (!users || users.length === 0) {
          setRankings([]);
          setLoadingRankings(false);
          return;
        }

        // Récupérer toutes les tentatives de quiz pour ces apprenants
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('user_id, score, total_possible')
          .in('user_id', users.map(u => u.id));

        if (attemptsError) throw attemptsError;

        // Calcul du score total (points cumulés) et de la moyenne
        const calculatedRankings = users.map(user => {
          const userAttempts = attempts?.filter(a => a.user_id === user.id) || [];
          const totalScore = userAttempts.reduce((sum, a) => sum + a.score, 0);
          const totalPossible = userAttempts.reduce((sum, a) => sum + a.total_possible, 0);
          const averagePercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
          
          return {
            id: user.id,
            user: user,
            totalScore: totalScore,                // points bruts
            totalPossible: totalPossible,
            averagePercentage: averagePercentage,  // moyenne en %
            totalQuizzes: userAttempts.length,
          };
        });

        // Trier par totalScore décroissant (ou moyenne, selon préférence)
        calculatedRankings.sort((a, b) => b.totalScore - a.totalScore);
        
        // Attribuer le rang (égalité de score -> même rang)
        let rank = 1;
        calculatedRankings.forEach((item, idx) => {
          if (idx > 0 && item.totalScore < calculatedRankings[idx-1].totalScore) rank = idx + 1;
          item.rank = rank;
        });

        setRankings(calculatedRankings);
      } catch (error) {
        console.error('Erreur chargement classement:', error);
        toast.error('Erreur lors du calcul du classement');
      } finally {
        setLoadingRankings(false);
      }
    };

    fetchRankingData();
  }, [selectedCycle]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="font-bold text-muted-foreground w-8 text-center inline-block">{rank}</span>;
  };

  const getBadges = (learner) => {
    const badges = [];
    if (learner.totalScore >= 500) badges.push({ label: 'Élite', color: 'amber', icon: Crown });
    else if (learner.totalScore >= 300) badges.push({ label: 'Expert', color: 'purple', icon: Star });
    if (learner.averagePercentage >= 85) badges.push({ label: 'Excellent', color: 'green', icon: Award });
    if (learner.totalQuizzes >= 10) badges.push({ label: 'Hyperactif', color: 'blue', icon: BookOpen });
    else if (learner.totalQuizzes >= 5) badges.push({ label: 'Régulier', color: 'teal', icon: BookOpen });
    return badges;
  };

  if (loadingCycles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Aucun cycle disponible</h3>
        <p className="text-muted-foreground">Vous n'êtes rattaché à aucun cycle.</p>
      </div>
    );
  }

  const top3 = rankings.slice(0, 3);
  const totalPoints = rankings.reduce((acc, r) => acc + r.totalScore, 0);
  const avgPoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0;
  const totalQuizzes = rankings.reduce((acc, r) => acc + r.totalQuizzes, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Classement Général</h2>
            <p className="text-muted-foreground">Performance des apprenants (points cumulés).</p>
          </div>
        </div>
        
        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Sélectionnez un cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(cycle => (
              <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistiques globales */}
      {rankings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Leader</h3>
              <p className="text-muted-foreground">{top3[0]?.user?.full_name || '-'}</p>
              <p className="text-sm font-semibold text-primary mt-1">{top3[0]?.totalScore} pts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Moyenne points</h3>
              <p className="text-2xl font-bold mt-1">{avgPoints} pts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Quiz complétés</h3>
              <p className="text-2xl font-bold mt-1">{totalQuizzes}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top 3 */}
      {!loadingRankings && rankings.length > 0 && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {top3.map((learner, index) => (
            <Card key={learner.id} className={`overflow-hidden ${index === 0 ? 'ring-2 ring-amber-500/50 shadow-lg' : ''}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex-shrink-0 relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={learner.user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {learner.user.full_name ? learner.user.full_name.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-0.5 shadow">
                    {getRankIcon(learner.rank)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg truncate">{learner.user.full_name || 'Anonyme'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="font-bold">
                      {learner.totalScore} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">{learner.totalQuizzes} quiz</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tableau complet */}
      <Card>
        <CardHeader>
          <CardTitle>Classement complet</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-center">Rang</TableHead>
                <TableHead>Apprenant</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">Quiz</TableHead>
                <TableHead className="text-center">Moyenne</TableHead>
                <TableHead className="text-right pr-6">Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRankings ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-6 w-20 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : !selectedCycle ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Sélectionnez un cycle pour voir le classement.
                  </TableCell>
                </TableRow>
              ) : rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Aucune donnée de classement disponible pour ce cycle.
                  </TableCell>
                </TableRow>
              ) : (
                rankings.map(learner => {
                  const badges = getBadges(learner);
                  return (
                    <TableRow key={learner.id} className={learner.rank <= 3 ? "bg-muted/20" : ""}>
                      <TableCell className="text-center">{getRankIcon(learner.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={learner.user.avatar} />
                            <AvatarFallback>
                              {learner.user.full_name ? learner.user.full_name.substring(0, 2).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{learner.user.full_name || 'Anonyme'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{learner.totalScore}</TableCell>
                      <TableCell className="text-center">{learner.totalQuizzes}</TableCell>
                      <TableCell className="text-center">{learner.averagePercentage}%</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {badges.map((badge, idx) => (
                            <Badge key={idx} variant="outline" className={`bg-${badge.color}-500/10 text-${badge.color}-600 border-${badge.color}-200`}>
                              <badge.icon className="h-3 w-3 mr-1" /> {badge.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingLeaderboard;