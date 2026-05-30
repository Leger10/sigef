// src/pages/admin/TrainersManagement.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Activity, UserCheck, AlertCircle, Loader2, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TrainersManagement = ({ cycleId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  
  const [trainers, setTrainers] = useState([]);
  const [apprenants, setApprenants] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cyclesMap, setCyclesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nominationForm, setNominationForm] = useState({ userId: '', specialty: '', cycle_id: '' });

  const fetchTrainers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Récupérer tous les cycles pour le mapping
      let cyclesQuery = supabase.from('cycles').select('id, name, admin_id');
      if (!isSuperAdmin && currentUser) {
        cyclesQuery = cyclesQuery.eq('admin_id', currentUser.id);
      }
      const { data: cyclesData, error: cyclesError } = await cyclesQuery;
      
      const map = {};
      if (!cyclesError && cyclesData) {
        setCycles(cyclesData);
        cyclesData.forEach(cycle => {
          map[cycle.id] = cycle.name;
        });
        setCyclesMap(map);
      }

      // 2. Récupérer les formateurs SANS jointure
      let trainersQuery = supabase
        .from('users')
        .select('id, email, full_name, phone, role, specialty, cycle_id, admin_id, created_at, updated_at')
        .eq('role', 'formateur')
        .order('full_name', { ascending: true });

      // Filtrer par cycle si fourni
      if (cycleId) {
        trainersQuery = trainersQuery.eq('cycle_id', cycleId);
      }

      if (!isSuperAdmin && currentUser) {
        trainersQuery = trainersQuery.eq('admin_id', currentUser.id);
      }

      const { data: trainersData, error: trainersError } = await trainersQuery;

      if (trainersError) throw trainersError;

      console.log('[TrainersManagement] Trainers found:', trainersData?.length || 0);

      // Enrichir les formateurs avec le nom du cycle
      const enrichedTrainers = (trainersData || []).map(trainer => ({
        ...trainer,
        cycle_name: map[trainer.cycle_id] || 'Non assigné'
      }));

      setTrainers(enrichedTrainers);

      // 3. Récupérer les apprenants (pour nomination) - UNIQUEMENT ceux du même cycle/admin
      let apprenantsQuery = supabase
        .from('users')
        .select('id, email, full_name, phone, cycle_id')
        .eq('role', 'apprenant')
        .order('full_name', { ascending: true });

      if (!isSuperAdmin && currentUser) {
        apprenantsQuery = apprenantsQuery.eq('admin_id', currentUser.id);
      }
      
      // Si un cycle est sélectionné, filtrer aussi par cycle
      if (cycleId) {
        apprenantsQuery = apprenantsQuery.eq('cycle_id', cycleId);
      }

      const { data: apprenantsData, error: apprenantsError } = await apprenantsQuery;

      if (apprenantsError) throw apprenantsError;

      // Enrichir les apprenants avec le nom du cycle
      const enrichedApprenants = (apprenantsData || []).map(apprenant => ({
        ...apprenant,
        cycle_name: map[apprenant.cycle_id] || 'Non assigné'
      }));

      console.log('[TrainersManagement] Apprenants for nomination:', enrichedApprenants.length);
      setApprenants(enrichedApprenants);
    } catch (err) {
      console.error('[TrainersManagement] Error:', err);
      setError(err.message || 'Erreur lors du chargement des formateurs');
      toast.error('Impossible de charger la liste des formateurs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, [isSuperAdmin, currentUser?.id, cycleId]);

  const handleNominate = async (e) => {
    e.preventDefault();
    
    if (!nominationForm.userId) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }
    
    // Récupérer l'apprenant sélectionné
    const selectedApprenant = apprenants.find(a => a.id === nominationForm.userId);
    if (!selectedApprenant) {
      toast.error('Utilisateur non trouvé');
      return;
    }
    
    // Déterminer le cycle_id à utiliser
    let targetCycleId = nominationForm.cycle_id || cycleId || selectedApprenant.cycle_id;
    
    if (!targetCycleId) {
      toast.error('Veuillez sélectionner un cycle pour ce formateur');
      return;
    }
    
    // Déterminer l'admin_id
    const targetAdminId = isSuperAdmin ? currentUser?.id : currentUser?.id;
    
    setSubmitting(true);
    try {
      // Mettre à jour le rôle de l'utilisateur avec cycle_id et admin_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          role: 'formateur',
          specialty: nominationForm.specialty || null,
          cycle_id: targetCycleId,
          admin_id: targetAdminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', nominationForm.userId);

      if (updateError) throw updateError;

      toast.success(`${selectedApprenant.full_name} est maintenant formateur !`);
      setIsNominateModalOpen(false);
      setNominationForm({ userId: '', specialty: '', cycle_id: '' });
      fetchTrainers();
    } catch (err) {
      console.error('[TrainersManagement] Nomination error:', err);
      toast.error('Erreur lors de la nomination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (trainer) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir révoquer les droits de formateur de ${trainer.full_name || trainer.email} ?`)) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: 'apprenant', 
          specialty: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainer.id);

      if (error) throw error;

      toast.success('Droits révoqués avec succès.');
      fetchTrainers();
    } catch (err) {
      console.error('[TrainersManagement] Revoke error:', err);
      toast.error('Erreur lors de la révocation');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Erreur de chargement</h3>
            <p className="text-sm opacity-90">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTrainers} className="mt-2">
              Réessayer
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Gestion des Formateurs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {trainers.length} formateur(s) - Gérez l'équipe pédagogique et leurs spécialités.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTrainers} title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsNominateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nommer Formateur
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Nom / Email</TableHead>
                <TableHead className="text-white">Cycle</TableHead>
                <TableHead className="text-white">Spécialité</TableHead>
                <TableHead className="text-white text-center">Statut</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : trainers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    Aucun formateur enregistré.
                    <Button 
                      variant="link" 
                      onClick={() => setIsNominateModalOpen(true)}
                      className="mt-2"
                    >
                      Nommer un formateur
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                trainers.map(trainer => (
                  <TableRow key={trainer.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-bold text-foreground">{trainer.full_name || 'Sans nom'}</p>
                      <p className="text-xs text-muted-foreground">{trainer.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {trainer.cycle_name || 'Non assigné'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">
                        {trainer.specialty || 'Général'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Shield className="w-3 h-3 mr-1" /> Actif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10" 
                        onClick={() => handleRevoke(trainer)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de nomination */}
      <Dialog open={isNominateModalOpen} onOpenChange={setIsNominateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Nommer un nouveau formateur
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un apprenant existant pour lui accorder les droits de formateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNominate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sélectionner l'apprenant *</Label>
              <Select value={nominationForm.userId} onValueChange={(v) => setNominationForm({...nominationForm, userId: v})}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Rechercher un apprenant..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {apprenants.length === 0 ? (
                    <SelectItem value="none" disabled>Aucun apprenant disponible</SelectItem>
                  ) : (
                    apprenants.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.full_name || 'Anonyme'} - {app.cycle_name || 'Sans cycle'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {apprenants.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Aucun apprenant disponible. Inscrivez d'abord des apprenants.
                </p>
              )}
            </div>

            {/* Sélection du cycle (si plusieurs cycles) */}
            {cycles.length > 1 && (
              <div className="space-y-2">
                <Label>Cycle d'affectation</Label>
                <Select 
                  value={nominationForm.cycle_id} 
                  onValueChange={(v) => setNominationForm({...nominationForm, cycle_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map(cycle => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser le cycle actuel de l'apprenant
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Domaine d'expertise / Spécialité</Label>
              <Input 
                placeholder="Ex: Droit Pénal, Logique, Maths..." 
                value={nominationForm.specialty}
                onChange={e => setNominationForm({...nominationForm, specialty: e.target.value})}
                className="bg-background"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsNominateModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || !nominationForm.userId}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer la nomination
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainersManagement;