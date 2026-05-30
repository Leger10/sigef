import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx'; // ✅ import ajouté
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Trophy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const ApprenantRanking = () => {
  const { currentUser } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownRank, setOwnRank] = useState(null);

  useEffect(() => {
    const fetchRanking = async () => {
      if (!currentUser?.cycle_id) {
        setLoading(false);
        return;
      }
      try {
        // Récupérer tous les apprenants du cycle
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, avatar')
          .eq('cycle_id', currentUser.cycle_id)
          .eq('role', 'apprenant');

        if (usersError) throw usersError;

        if (!users || users.length === 0) {
          setRankings([]);
          setLoading(false);
          return;
        }

        // Récupérer toutes les tentatives de quiz de ces utilisateurs
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('user_id, score, total_possible')
          .in('user_id', users.map(u => u.id));

        if (attemptsError) throw attemptsError;

        // Calculer le score moyen de chaque utilisateur
        const userScores = users.map(user => {
          const userAttempts = attempts?.filter(a => a.user_id === user.id) || [];
          const avgScore = userAttempts.length > 0
            ? Math.round(userAttempts.reduce((acc, a) => acc + (a.score / a.total_possible * 100), 0) / userAttempts.length)
            : 0;
          return {
            ...user,
            avgScore,
            totalQuizzes: userAttempts.length
          };
        });

        // Trier par score décroissant
        userScores.sort((a, b) => b.avgScore - a.avgScore);
        const ranked = userScores.map((user, idx) => ({ ...user, rank: idx + 1 }));
        setRankings(ranked);

        // Trouver le rang de l'utilisateur connecté
        const myRank = ranked.find(r => r.id === currentUser.id);
        if (myRank) setOwnRank(myRank.rank);
      } catch (error) {
        console.error('Erreur classement:', error);
        toast.error('Impossible de charger le classement');
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [currentUser]);

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (rankings.length === 0) {
    return (
      <Card className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucune donnée de classement disponible.</p>
      </Card>
    );
  }

  const top3 = rankings.slice(0, 3);
  const avgScore = Math.round(rankings.reduce((acc, r) => acc + r.avgScore, 0) / rankings.length);
  const totalQuizzes = rankings.reduce((acc, r) => acc + r.totalQuizzes, 0);

  return (
    <div className="space-y-8">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">Champion</h3>
            <p className="text-muted-foreground">{top3[0]?.full_name || '-'}</p>
            <p className="text-sm font-semibold text-primary mt-1">{top3[0]?.avgScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">Score Moyen</h3>
            <p className="text-2xl font-bold mt-1">{avgScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">Quiz complétés</h3>
            <p className="text-2xl font-bold mt-1">{totalQuizzes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {top3.map((learner, idx) => (
          <Card key={learner.id} className={`overflow-hidden ${idx === 0 ? 'ring-2 ring-amber-500/50' : ''}`}>
            <CardContent className="p-6 flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={learner.avatar} />
                <AvatarFallback>{learner.full_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-lg">{learner.full_name}</p>
                <p className="text-sm text-muted-foreground">Score : {learner.avgScore}%</p>
                <p className="text-xs text-primary">Rang #{learner.rank}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <TableHead className="text-center">Score moyen</TableHead>
                <TableHead className="text-center">Quiz complétés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map(learner => (
                <TableRow key={learner.id} className={learner.id === currentUser?.id ? "bg-primary/5" : ""}>
                  <TableCell className="text-center font-bold">{learner.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={learner.avatar} />
                        <AvatarFallback>{learner.full_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{learner.full_name}</span>
                      {learner.id === currentUser?.id && (
                        <Badge variant="outline" className="ml-2">Vous</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{learner.avgScore}%</TableCell>
                  <TableCell className="text-center">{learner.totalQuizzes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprenantRanking;