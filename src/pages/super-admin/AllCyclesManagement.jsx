// src/pages/super-admin/AllCyclesManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Plus, Edit, Trash2, Loader2, Filter, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const AllCyclesManagement = () => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    category: 'other',
    admin_id: ''
  });

  const categories = [
    { value: 'direct', label: 'Concours direct' },
    { value: 'professional', label: 'Concours professionnel' },
    { value: 'other', label: 'Autre formation' },
  ];

  useEffect(() => {
    fetchAdmins();
    fetchCycles();
  }, [categoryFilter, adminFilter]);

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('role', ['admin', 'super_admin'])
      .order('full_name');
    setAdmins(data || []);
  };

  const fetchCycles = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les cycles avec filtres
      let query = supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (adminFilter !== 'all') {
        query = query.eq('admin_id', adminFilter);
      }

      const { data: cyclesData, error: cyclesError } = await query;
      if (cyclesError) throw cyclesError;

      if (!cyclesData || cyclesData.length === 0) {
        setCycles([]);
        setLoading(false);
        return;
      }

      // 2. Récupérer les informations des admins (ids uniques)
      const adminIds = [...new Set(cyclesData.map(c => c.admin_id).filter(id => id))];
      let adminsMap = new Map();
      if (adminIds.length > 0) {
        const { data: adminsData, error: adminsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', adminIds);
        if (!adminsError && adminsData) {
          adminsData.forEach(admin => {
            adminsMap.set(admin.id, admin);
          });
        }
      }

      // 3. Fusionner
      const cyclesWithAdmin = cyclesData.map(cycle => ({
        ...cycle,
        admin: cycle.admin_id ? adminsMap.get(cycle.admin_id) : null
      }));

      setCycles(cyclesWithAdmin);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast.error('Erreur lors du chargement des cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cycle = null) => {
    if (cycle) {
      setEditingCycle(cycle);
      setFormData({
        name: cycle.name,
        description: cycle.description || '',
        is_active: cycle.is_active,
        category: cycle.category || 'other',
        admin_id: cycle.admin_id || ''
      });
    } else {
      setEditingCycle(null);
      setFormData({
        name: '',
        description: '',
        is_active: true,
        category: 'other',
        admin_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Le nom du cycle est requis');
      return;
    }

    setSubmitting(true);
    try {
      const dataToSave = {
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active,
        category: formData.category,
        updated_at: new Date().toISOString()
      };

      if (editingCycle) {
        const { error } = await supabase
          .from('cycles')
          .update(dataToSave)
          .eq('id', editingCycle.id);
        
        if (error) throw error;
        toast.success('Cycle modifié avec succès');
      } else {
        if (!formData.admin_id) {
          toast.error('Veuillez sélectionner un administrateur pour ce cycle');
          setSubmitting(false);
          return;
        }
        dataToSave.admin_id = formData.admin_id;
        dataToSave.created_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('cycles')
          .insert(dataToSave);
        
        if (error) throw error;
        toast.success('Cycle créé avec succès');
      }
      
      setIsModalOpen(false);
      fetchCycles();
    } catch (error) {
      console.error('Error saving cycle:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cycle) => {
    if (!window.confirm(`Supprimer définitivement le cycle "${cycle.name}" ?`)) return;
    
    try {
      const { error } = await supabase
        .from('cycles')
        .delete()
        .eq('id', cycle.id);

      if (error) throw error;
      
      toast.success('Cycle supprimé');
      fetchCycles();
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredCycles = cycles.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadge = (category) => {
    const styles = {
      direct: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      professional: 'bg-green-500/10 text-green-600 border-green-500/20',
      other: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    };
    const label = categories.find(c => c.value === category)?.label || 'Autre';
    return <Badge variant="outline" className={styles[category] || ''}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tous les Cycles de Formation</h2>
          <p className="text-sm text-muted-foreground">
            Gérez tous les cycles de la plateforme (super admin)
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau cycle
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un cycle..." 
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="direct">Concours direct</SelectItem>
            <SelectItem value="professional">Concours professionnel</SelectItem>
            <SelectItem value="other">Autre formation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={adminFilter} onValueChange={setAdminFilter}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrer par centre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les centres</SelectItem>
            {admins.map(admin => (
              <SelectItem key={admin.id} value={admin.id}>
                {admin.full_name || admin.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nom du cycle</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Administrateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Aucun cycle trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCycles.map(cycle => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.name}</TableCell>
                    <TableCell>{getCategoryBadge(cycle.category)}</TableCell>
                    <TableCell className="max-w-md truncate">{cycle.description || '-'}</TableCell>
                    <TableCell>
                      {cycle.admin ? (
                        <div className="flex items-center gap-2">
                          <span>{cycle.admin.full_name || cycle.admin.email}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">Non assigné</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {cycle.is_active ? (
                        <Badge className="bg-green-500 text-white">Actif</Badge>
                      ) : (
                        <Badge variant="outline">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(cycle.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cycle)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cycle)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCycle ? 'Modifier le cycle' : 'Nouveau cycle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nom du cycle *</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Concours direct Police"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select 
                value={formData.category} 
                onValueChange={val => setFormData({...formData, category: val})}
              >
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
            {!editingCycle && (
              <div className="space-y-2">
                <Label>Administrateur responsable *</Label>
                <Select 
                  value={formData.admin_id} 
                  onValueChange={val => setFormData({...formData, admin_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un administrateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.full_name || admin.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Cycle actif</Label>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={c => setFormData({...formData, is_active: c})}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCycle ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllCyclesManagement;