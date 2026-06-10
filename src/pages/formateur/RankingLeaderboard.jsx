// src/pages/formateur/RankingLeaderboard.jsx - Version complète avec exports corrigés
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Trophy, TrendingUp, BookOpen, Crown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RankingLeaderboard = ({ cycleId }) => {
  const { currentUser } = useAuth();
  
  const [cycle, setCycle] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!cycleId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: cycleData } = await supabase
          .from('cycles')
          .select('name')
          .eq('id', cycleId)
          .single();
        setCycle(cycleData);

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, avatar, pro_status, pro_expiry, phone')
          .eq('cycle_id', cycleId)
          .eq('role', 'apprenant');

        if (usersError) throw usersError;

        if (!users || users.length === 0) {
          setRankings([]);
          setLoading(false);
          return;
        }

        const userIds = users.map(u => u.id);
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .in('user_id', userIds);

        if (attemptsError) throw attemptsError;

        const calculatedRankings = users.map(user => {
          const userAttempts = attempts?.filter(a => a.user_id === user.id) || [];
          
          const bestByQuiz = new Map();
          userAttempts.forEach(attempt => {
            const existing = bestByQuiz.get(attempt.quiz_id);
            if (!existing || attempt.percentage > existing.percentage) {
              bestByQuiz.set(attempt.quiz_id, attempt);
            }
          });
          
          const bestAttempts = Array.from(bestByQuiz.values());
          const totalScore = bestAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
          const totalPossible = bestAttempts.reduce((sum, a) => sum + (a.total_possible || 0), 0);
          const avgPercent = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
          const passedCount = bestAttempts.filter(a => a.passed === true).length;
          
          return {
            id: user.id,
            full_name: user.full_name || 'Anonyme',
            email: user.email,
            phone: user.phone || '-',
            avatar: user.avatar,
            totalScore: totalScore,
            averagePercentage: avgPercent,
            totalQuizzes: bestAttempts.length,
            passedQuizzes: passedCount,
            isProActive: user.pro_status === true && (!user.pro_expiry || new Date(user.pro_expiry) > new Date())
          };
        });

        calculatedRankings.sort((a, b) => b.totalScore - a.totalScore);
        
        let rank = 1;
        calculatedRankings.forEach((item, idx) => {
          if (idx > 0 && item.totalScore < calculatedRankings[idx-1].totalScore) rank = idx + 1;
          item.rank = rank;
        });
        
        setRankings(calculatedRankings);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du calcul du classement');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cycleId]);

  const exportToExcel = () => {
    setExporting('excel');
    try {
      const exportData = rankings.map(learner => ({
        'Rang': learner.rank,
        'Apprenant': learner.full_name,
        'Email': learner.email,
        'Téléphone': learner.phone,
        'Points': learner.totalScore,
        'Quiz tentés': learner.totalQuizzes,
        'Quiz réussis': learner.passedQuizzes,
        'Moyenne': `${learner.averagePercentage}%`,
        'Statut PRO': learner.isProActive ? 'PRO Actif' : 'Standard'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Classement');
      
      ws['!cols'] = [
        { wch: 6 },  // Rang
        { wch: 25 }, // Apprenant
        { wch: 30 }, // Email
        { wch: 15 }, // Téléphone
        { wch: 8 },  // Points
        { wch: 12 }, // Quiz tentés
        { wch: 12 }, // Quiz réussis
        { wch: 10 }, // Moyenne
        { wch: 12 }  // Statut PRO
      ];
      
      const fileName = `classement_${(cycle?.name || 'cycle').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Export Excel réussi');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’export Excel');
    } finally {
      setExporting(null);
    }
  };
// Export PDF - Version simplifiée sans accents
const exportToPDF = () => {
  setExporting('pdf');
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Supprimer les accents et caractères spéciaux
    const removeAccents = (str) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ØßÆÜÈÊ]/g, '')
        .replace(/[^\x00-\x7F]/g, '');
    };
    
    // En-tête
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('CLASSEMENT GENERAL', 14, 20);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(removeAccents(cycle?.name) || 'Cycle', 14, 32);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Exporte le ${new Date().toLocaleString('fr-FR')}`, 14, 40);
    
    // Statistiques
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Resume', 14, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const totalPoints = rankings.reduce((acc, r) => acc + r.totalScore, 0);
    const avgPoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0;
    const totalPassed = rankings.reduce((acc, r) => acc + r.passedQuizzes, 0);
    
    doc.text(`Total apprenants : ${rankings.length}`, 14, 62);
    doc.text(`Moyenne des points : ${avgPoints} pts`, 14, 70);
    doc.text(`Total quiz reussis : ${totalPassed}`, 14, 78);
    doc.text(`Total points cumules : ${totalPoints} pts`, 14, 86);
    
    // Tableau
    const tableColumn = ['Rang', 'Apprenant', 'Email', 'Telephone', 'Points', 'Quiz tentes', 'Quiz reussis', 'Moyenne', 'Statut'];
    const tableRows = rankings.map(learner => [
      learner.rank,
      removeAccents(learner.full_name),
      learner.email,
      learner.phone || '-',
      learner.totalScore,
      learner.totalQuizzes,
      learner.passedQuizzes,
      `${learner.averagePercentage}%`,
      learner.isProActive ? 'PRO Actif' : 'Standard'
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 95,
      theme: 'striped',
      styles: { 
        fontSize: 9, 
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center'
      },
      columnStyles: {
        1: { halign: 'left' },
        2: { halign: 'left' }
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 95, left: 10, right: 10 }
    });
    
    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('SIGEF - Plateforme de formation', 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} / ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }
    
    const fileName = `classement_${(cycle?.name || 'cycle').replace(/[^a-z0-9]/gi, '_').substring(0, 50)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('Export PDF reussi');
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de l\'export PDF');
  } finally {
    setExporting(null);
  }
};

  const getRankIcon = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="font-bold text-muted-foreground w-8 text-center inline-block">{rank}</span>;
  };

  if (!cycleId) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Chargement...</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const top3 = rankings.slice(0, 3);
  const totalPoints = rankings.reduce((acc, r) => acc + r.totalScore, 0);
  const avgPoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0;
  const totalQuizzes = rankings.reduce((acc, r) => acc + r.totalQuizzes, 0);
  const totalPassed = rankings.reduce((acc, r) => acc + r.passedQuizzes, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Classement Général</h2>
            <p className="text-muted-foreground">
              {cycle?.name || 'Cycle'} - Performance des apprenants
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {rankings.length} apprenant(s) - {totalQuizzes} quiz tentés - {totalPassed} réussis
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting === 'excel' || rankings.length === 0}
            className="gap-2"
          >
            {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting === 'pdf' || rankings.length === 0}
            className="gap-2"
          >
            {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />}
            PDF
          </Button>
        </div>
      </div>

      {rankings.length > 0 && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Leader</h3>
              <p className="text-muted-foreground">{top3[0]?.full_name || '-'}</p>
              <p className="text-sm font-semibold text-primary mt-1">{top3[0]?.totalScore} pts</p>
              <p className="text-xs text-muted-foreground">{top3[0]?.passedQuizzes} quiz réussis</p>
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
              <h3 className="text-lg font-bold">Quiz réussis</h3>
              <p className="text-2xl font-bold mt-1">{totalPassed}</p>
            </CardContent>
          </Card>
        </div>
      )}

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
                <TableHead className="text-center">Quiz tentés</TableHead>
                <TableHead className="text-center">Quiz réussis</TableHead>
                <TableHead className="text-center">Moyenne</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    Aucune donnée de classement disponible.
                  </TableCell>
                </TableRow>
              ) : (
                rankings.map(learner => (
                  <TableRow key={learner.id} className={learner.rank <= 3 ? "bg-muted/20" : ""}>
                    <TableCell className="text-center">{getRankIcon(learner.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={learner.avatar} />
                          <AvatarFallback>
                            {learner.full_name ? learner.full_name.substring(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{learner.full_name}</span>
                          <p className="text-xs text-muted-foreground">{learner.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">{learner.totalScore}</TableCell>
                    <TableCell className="text-center">{learner.totalQuizzes}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={learner.passedQuizzes > 0 ? "default" : "secondary"}>
                        {learner.passedQuizzes}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={learner.averagePercentage >= 70 ? "default" : "secondary"}>
                        {learner.averagePercentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {learner.isProActive ? (
                        <Badge className="bg-amber-500 text-white">
                          <Crown className="h-3 w-3 mr-1" /> PRO
                        </Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
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

export default RankingLeaderboard;