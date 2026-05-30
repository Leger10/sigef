// src/components/formateur/QuizParticipantsModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const QuizParticipantsModal = ({ quizId, quizTitle, open, onClose }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  // Chargement initial et abonnement temps réel
  useEffect(() => {
    if (!open || !quizId) return;

    // Chargement initial
    fetchParticipants();

    // Écouter les changements en temps réel sur quiz_attempts pour ce quiz
    const channel = supabase
      .channel(`quiz_attempts_${quizId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'quiz_attempts',
          filter: `quiz_id=eq.${quizId}`,
        },
        () => {
          console.log('Changement détecté sur les tentatives du quiz, rechargement...');
          fetchParticipants();
        }
      )
      .subscribe();

    // Nettoyage à la fermeture du modal
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, quizId]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les tentatives pour ce quiz
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('id, user_id, score, total_possible, percentage, passed, completed_at')
        .eq('quiz_id', quizId)
        .order('percentage', { ascending: false });

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        setParticipants([]);
        setLoading(false);
        return;
      }

      // Récupérer les informations des utilisateurs (un par un pour éviter les problèmes RLS)
      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const usersMap = new Map();

      for (const userId of userIds) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email, phone, pro_status')
          .eq('id', userId)
          .single();

        if (!userError && user) {
          usersMap.set(userId, user);
        } else {
          usersMap.set(userId, {
            full_name: 'Utilisateur inconnu',
            email: 'N/A',
            phone: 'N/A',
            pro_status: false,
          });
        }
      }

      // Calcul du rang (même pourcentage = même rang)
      let rank = 1;
      const enriched = attempts.map((attempt, idx) => {
        if (idx > 0 && attempt.percentage < attempts[idx - 1].percentage) {
          rank = idx + 1;
        }
        const user = usersMap.get(attempt.user_id);
        return {
          id: attempt.id,
          rank,
          userName: user?.full_name || 'Anonyme',
          userEmail: user?.email || 'N/A',
          userPhone: user?.phone || 'N/A',
          isPro: user?.pro_status || false,
          score: attempt.score,
          total_possible: attempt.total_possible,
          percentage: attempt.percentage,
          passed: attempt.passed,
          completed_at: attempt.completed_at,
        };
      });

      setParticipants(enriched);
    } catch (error) {
      console.error('Erreur lors du chargement des participants :', error);
      toast.error('Impossible de charger les participants');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    setExporting('excel');
    try {
      const data = participants.map(p => ({
        Rang: p.rank,
        'Nom complet': p.userName,
        Email: p.userEmail,
        Téléphone: p.userPhone,
        'Statut PRO': p.isPro ? 'Oui' : 'Non',
        'Points obtenus': p.score,
        'Points totaux': p.total_possible,
        'Score (%)': p.percentage,
        Résultat: p.passed ? 'Réussi' : 'Échec',
        'Date de complétion': new Date(p.completed_at).toLocaleString(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');
      XLSX.writeFile(wb, `quiz_${quizTitle}_participants.xlsx`);
      toast.success('Export Excel réussi');
    } catch (err) {
      console.error('Erreur export Excel:', err);
      toast.error('Erreur lors de l’export Excel : ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(`Participants du quiz : ${quizTitle}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 14, 25);

      const tableColumn = ['Rang', 'Nom', 'Email', 'Téléphone', 'PRO', 'Score', 'Total', '%', 'Résultat', 'Date'];
      const tableRows = participants.map(p => [
        p.rank,
        p.userName,
        p.userEmail,
        p.userPhone,
        p.isPro ? 'Oui' : 'Non',
        p.score,
        p.total_possible,
        `${p.percentage}%`,
        p.passed ? 'Réussi' : 'Échec',
        new Date(p.completed_at).toLocaleDateString(),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35, left: 10, right: 10 }
      });

      doc.save(`quiz_${quizTitle}_participants.pdf`);
      toast.success('Export PDF réussi');
    } catch (err) {
      console.error('Erreur export PDF:', err);
      toast.error('Erreur lors de l’export PDF : ' + (err.message || 'Vérifiez les dépendances jspdf'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Participants - {quizTitle}</DialogTitle>
          <DialogDescription>
            Liste des apprenants ayant participé à ce quiz. Classement par score décroissant.
            {!loading && <span className="ml-2 text-green-600">(Mise à jour en temps réel)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting === 'excel' || loading || participants.length === 0}
          >
            {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting === 'pdf' || loading || participants.length === 0}
          >
            {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            PDF
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune participation pour ce quiz.</p>
            <p className="text-sm mt-2">Vérifiez que des apprenants ont bien soumis le quiz.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rang</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>PRO</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Score (%)</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.rank}</TableCell>
                    <TableCell>{p.userName}</TableCell>
                    <TableCell>{p.userEmail}</TableCell>
                    <TableCell>{p.userPhone}</TableCell>
                    <TableCell>
                      {p.isPro ? <Badge className="bg-amber-500">PRO</Badge> : <Badge variant="outline">Standard</Badge>}
                    </TableCell>
                    <TableCell>{p.score} / {p.total_possible}</TableCell>
                    <TableCell>{p.percentage}%</TableCell>
                    <TableCell>
                      <Badge className={p.passed ? 'bg-green-500' : 'bg-red-500'}>
                        {p.passed ? 'Réussi' : 'Échec'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(p.completed_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizParticipantsModal;