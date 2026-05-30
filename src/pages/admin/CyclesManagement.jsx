// src/pages/admin/CyclesManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog.jsx';
import { Users, UserCheck, Calendar, BookOpen, Shield, ChevronRight, Plus, Loader2, Edit, Trash2, Copy, Globe, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const CyclesManagement = () => {
  const { currentUser } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  
  const [newCycle, setNewCycle] = useState({
    name: '',
    description: '',
    is_active: true,
    category: 'other'
  });
  
  const [editCycle, setEditCycle] = useState({
    id: null,
    name: '',
    description: '',
    is_active: true,
    category: 'other'
  });

  const categories = [
    { value: 'direct', label: 'Concours direct' },
    { value: 'professional', label: 'Concours professionnel' },
    { value: 'other', label: 'Autre formation' },
  ];

  useEffect(() => {
    if (currentUser?.id) {
      fetchAdminCycles();
    }
  }, [currentUser, categoryFilter]);

 const fetchAdminCycles = async () => {
  setLoading(true);
  try {
  let query = supabase
  .from('cycles')
  .select('*')
  .eq('admin_id', currentUser?.id)
  .order('created_at', { ascending: false });

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    setCycles(data || []);
    
    if (data && data.length > 0 && (!selectedCycle || !data.find(c => c.id === selectedCycle.id))) {
      setSelectedCycle(data[0]);
      await fetchCycleStats(data[0].id);
    } else if (selectedCycle) {
      await fetchCycleStats(selectedCycle.id);
    } else {
      setSelectedCycle(null);
    }
  } catch (error) {
    console.error('Error fetching cycles:', error);
    toast.error('Erreur lors du chargement des cycles');
  } finally {
    setLoading(false);
  }
};

  const fetchCycleStats = async (cycleId) => {
    try {
      const [apprenants, formateurs, sessions, courses] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('cycle_id', cycleId).eq('role', 'apprenant'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('cycle_id', cycleId).eq('role', 'formateur'),
        supabase.from('live_sessions').select('*', { count: 'exact', head: true }).eq('cycle_id', cycleId),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('cycle_id', cycleId)
      ]);

      setStats(prev => ({
        ...prev,
        [cycleId]: {
          totalApprenants: apprenants.count || 0,
          totalFormateurs: formateurs.count || 0,
          totalSessions: sessions.count || 0,
          totalCourses: courses.count || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCycleChange = async (cycle) => {
    setSelectedCycle(cycle);
    if (!stats[cycle.id]) {
      await fetchCycleStats(cycle.id);
    }
  };

  const handleCreateCycle = async () => {
    if (!newCycle.name.trim()) {
      toast.error('Le nom du cycle est requis');
      return;
    }

    if (!currentUser?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingCycle, error: checkError } = await supabase
        .from('cycles')
        .select('id')
        .eq('name', newCycle.name.trim())
        .eq('admin_id', currentUser.id)
        .maybeSingle();

      if (existingCycle) {
        toast.error(`Un cycle nommé "${newCycle.name}" existe déjà pour votre compte`);
        setIsSubmitting(false);
        return;
      }

      const { data: createdCycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          name: newCycle.name.trim(),
          description: newCycle.description.trim() || null,
          admin_id: currentUser.id,
          is_active: newCycle.is_active,
          is_default: false,
          category: newCycle.category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      if (createdCycle) {
        toast.success(`Cycle "${createdCycle.name}" créé avec succès !`);
        setNewCycle({ name: '', description: '', is_active: true, category: 'other' });
        setIsCreateModalOpen(false);
        await fetchAdminCycles();
        setSelectedCycle(createdCycle);
        await fetchCycleStats(createdCycle.id);
      }
      
    } catch (error) {
      console.error('Error creating cycle:', error);
      toast.error(error.message || 'Erreur lors de la création du cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCycle = async () => {
    if (!editCycle.name.trim()) {
      toast.error('Le nom du cycle est requis');
      return;
    }

    setIsSubmitting(true);
    try {
      // Vérifier si le nouveau nom n'existe pas déjà (sauf pour lui-même)
      const { data: existingCycle } = await supabase
        .from('cycles')
        .select('id')
        .eq('name', editCycle.name.trim())
        .eq('admin_id', currentUser.id)
        .neq('id', editCycle.id)
        .maybeSingle();

      if (existingCycle) {
        toast.error(`Un cycle nommé "${editCycle.name}" existe déjà pour votre compte`);
        setIsSubmitting(false);
        return;
      }

      const { data: updatedCycle, error: updateError } = await supabase
        .from('cycles')
        .update({
          name: editCycle.name.trim(),
          description: editCycle.description.trim() || null,
          is_active: editCycle.is_active,
          category: editCycle.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', editCycle.id)
        .eq('admin_id', currentUser.id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success(`Cycle "${updatedCycle.name}" modifié avec succès !`);
      setIsEditModalOpen(false);
      await fetchAdminCycles();
      
      if (selectedCycle?.id === editCycle.id) {
        setSelectedCycle(updatedCycle);
        await fetchCycleStats(updatedCycle.id);
      }
      
    } catch (error) {
      console.error('Error updating cycle:', error);
      toast.error(error.message || 'Erreur lors de la modification du cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateCycle = async (cycle) => {
    setIsSubmitting(true);
    try {
      const newName = `${cycle.name} (copie)`;
      
      const { data: createdCycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          name: newName,
          description: cycle.description,
          admin_id: currentUser.id,
          is_active: true,
          is_default: false,
          category: cycle.category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      toast.success(`Cycle "${newName}" créé à partir de "${cycle.name}"`);
      await fetchAdminCycles();
      
    } catch (error) {
      console.error('Error duplicating cycle:', error);
      toast.error('Erreur lors de la duplication du cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCycle = async () => {
    if (!cycleToDelete) return;
    
    setIsSubmitting(true);
    try {
      const statsToCheck = stats[cycleToDelete.id];
      
      if (statsToCheck && (statsToCheck.totalApprenants > 0 || statsToCheck.totalSessions > 0)) {
        toast.error(`Impossible de supprimer ce cycle car il contient ${statsToCheck.totalApprenants} apprenant(s) et ${statsToCheck.totalSessions} session(s).`);
        setIsDeleteDialogOpen(false);
        setCycleToDelete(null);
        setIsSubmitting(false);
        return;
      }
      
      const { error: deleteError } = await supabase
        .from('cycles')
        .delete()
        .eq('id', cycleToDelete.id)
        .eq('admin_id', currentUser.id);
      
      if (deleteError) throw deleteError;
      
      toast.success(`Cycle "${cycleToDelete.name}" supprimé avec succès !`);
      setIsDeleteDialogOpen(false);
      setCycleToDelete(null);
      await fetchAdminCycles();
      
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast.error(error.message || 'Erreur lors de la suppression du cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (cycle) => {
    setEditCycle({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description || '',
      is_active: cycle.is_active,
      category: cycle.category || 'other'
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (cycle) => {
    setCycleToDelete(cycle);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const currentCycleStats = selectedCycle ? stats[selectedCycle.id] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mes Cycles de Formation</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos cycles et leurs contenus
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="direct">Concours direct</SelectItem>
              <SelectItem value="professional">Concours professionnel</SelectItem>
              <SelectItem value="other">Autre formation</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau cycle
          </Button>
        </div>
      </div>

      {cycles.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {cycles.map(cycle => {
            const isDefault = cycle.is_default;
            const isOwner = cycle.admin_id === currentUser?.id;
            const categoryLabel = categories.find(c => c.value === cycle.category)?.label || 'Autre';
            
            return (
              <div key={cycle.id} className="relative group">
              <Button
  variant={selectedCycle?.id === cycle.id ? 'default' : 'outline'}
  onClick={() => handleCycleChange(cycle)}
  className="gap-2 pr-8"
>
  <Shield className="w-4 h-4" />
  {cycle.name}
  <Badge variant="secondary" className="ml-1 text-xs">
    {categories.find(c => c.value === cycle.category)?.label || 'Autre'}
  </Badge>
  {!cycle.is_active && <Badge variant="secondary" className="ml-1 text-xs">Inactif</Badge>}
</Button>
                {isOwner && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(cycle);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateCycle(cycle);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cycles.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun cycle</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier cycle dès maintenant !
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer mon premier cycle
            </Button>
          </CardContent>
        </Card>
      ) : selectedCycle && currentCycleStats && (
        <>
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    {selectedCycle.is_default ? <Globe className="w-6 h-6 text-primary" /> : <Shield className="w-6 h-6 text-primary" />}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{selectedCycle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCycle.description || 'Cycle de formation'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">
                        {categories.find(c => c.value === selectedCycle.category)?.label || 'Autre'}
                      </Badge>
                      {selectedCycle.is_default && (
                        <Badge variant="outline">Cycle par défaut</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={selectedCycle.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                    {selectedCycle.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  {selectedCycle.admin_id === currentUser?.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(selectedCycle)}
                        className="gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(selectedCycle)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Créé le {new Date(selectedCycle.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentCycleStats.totalApprenants}</p>
                  <p className="text-xs text-muted-foreground">Apprenants</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentCycleStats.totalFormateurs}</p>
                  <p className="text-xs text-muted-foreground">Formateurs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentCycleStats.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions live</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentCycleStats.totalCourses}</p>
                  <p className="text-xs text-muted-foreground">Cours</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start gap-3 h-auto py-4" asChild>
              <Link to={`/admin/users?cycle=${selectedCycle.id}`}>
                <Users className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-semibold">Gérer les apprenants</p>
                  <p className="text-xs text-muted-foreground">Promouvoir, bloquer, supprimer</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4" asChild>
              <Link to={`/admin/sessions?cycle=${selectedCycle.id}`}>
                <Calendar className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-semibold">Sessions live</p>
                  <p className="text-xs text-muted-foreground">Créer et gérer</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4" asChild>
              <Link to={`/admin/courses?cycle=${selectedCycle.id}`}>
                <BookOpen className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-semibold">Cours et contenus</p>
                  <p className="text-xs text-muted-foreground">Ajouter des supports</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* Modal Création */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Créer un nouveau cycle
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau cycle de formation. Vous serez automatiquement l'administrateur de ce cycle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cycle-name">Nom du cycle *</Label>
              <Input
                id="cycle-name"
                value={newCycle.name}
                onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                placeholder="Ex: Cyber-sécurité Police"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cycle-description">Description</Label>
              <Textarea
                id="cycle-description"
                value={newCycle.description}
                onChange={(e) => setNewCycle({ ...newCycle, description: e.target.value })}
                placeholder="Décrivez le contenu et les objectifs..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={newCycle.category} onValueChange={(val) => setNewCycle({ ...newCycle, category: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Concours direct</SelectItem>
                  <SelectItem value="professional">Concours professionnel</SelectItem>
                  <SelectItem value="other">Autre formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCycle.is_active}
                  onChange={(e) => setNewCycle({ ...newCycle, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Cycle actif</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Un cycle inactif n'est pas visible par les apprenants
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCycle} disabled={isSubmitting || !newCycle.name.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer le cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Modification */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Modifier le cycle
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations de votre cycle de formation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du cycle *</Label>
              <Input
                value={editCycle.name}
                onChange={(e) => setEditCycle({ ...editCycle, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editCycle.description}
                onChange={(e) => setEditCycle({ ...editCycle, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={editCycle.category} onValueChange={(val) => setEditCycle({ ...editCycle, category: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Concours direct</SelectItem>
                  <SelectItem value="professional">Concours professionnel</SelectItem>
                  <SelectItem value="other">Autre formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCycle.is_active}
                  onChange={(e) => setEditCycle({ ...editCycle, is_active: e.target.checked })}
                />
                <span>Cycle actif</span>
              </Label>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditCycle} disabled={isSubmitting || !editCycle.name.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer le cycle
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le cycle <strong>{cycleToDelete?.name}</strong> ?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {cycleToDelete && stats[cycleToDelete.id] && (stats[cycleToDelete.id].totalApprenants > 0 || stats[cycleToDelete.id].totalSessions > 0) ? (
                <span className="text-amber-600">
                  ⚠️ Attention: Ce cycle contient {stats[cycleToDelete.id].totalApprenants} apprenant(s) et {stats[cycleToDelete.id].totalSessions} session(s).
                  Veuillez les transférer ou les supprimer avant de supprimer ce cycle.
                </span>
              ) : (
                "Cette action supprimera définitivement le cycle."
              )}
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCycle} 
              disabled={isSubmitting || (cycleToDelete && stats[cycleToDelete.id] && (stats[cycleToDelete.id].totalApprenants > 0 || stats[cycleToDelete.id].totalSessions > 0))}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Oui, supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CyclesManagement;