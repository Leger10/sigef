// src/pages/admin/SubscriptionPlansManagement.jsx
import React, { useState, useEffect } from 'react';
import { Tag, AlertCircle, Plus, Edit, Trash2, CheckCircle2, XCircle, Loader2, Percent, DollarSign, Plus as PlusIcon, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SubscriptionPlansManagement = () => {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [useDiscount, setUseDiscount] = useState(false);
  const [durationType, setDurationType] = useState('preset'); // 'preset' ou 'custom'
  
  const [formData, setFormData] = useState({
    name: '',
    duration_months: 3,
    duration_days: 90,
    price: 0,
    discounted_price: 0,
    discount_percentage: 0,
    description: '',
    features: [],
    is_active: true
  });

  // Convertir mois en jours
  const monthsToDays = (months) => {
    return months * 30;
  };

  // Convertir jours en mois approximatif
  const daysToMonths = (days) => {
    return Math.round(days / 30);
  };

  // Mettre à jour les jours quand les mois changent
  const updateDuration = (months) => {
    const newMonths = Math.max(1, Math.min(60, months)); // Max 60 mois (5 ans)
    setFormData({
      ...formData,
      duration_months: newMonths,
      duration_days: monthsToDays(newMonths)
    });
  };

  const incrementMonths = () => {
    updateDuration(formData.duration_months + 1);
  };

  const decrementMonths = () => {
    if (formData.duration_months > 1) {
      updateDuration(formData.duration_months - 1);
    }
  };

  const handleCustomDaysChange = (days) => {
    const newDays = parseInt(days) || 0;
    const newMonths = daysToMonths(newDays);
    setFormData({
      ...formData,
      duration_months: newMonths,
      duration_days: newDays
    });
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('admin_id', currentUser?.id)
        .order('duration_days', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('[SubscriptionPlansManagement] Error:', err);
      setError(err.message || 'Erreur lors du chargement des forfaits');
      toast.error('Impossible de charger les forfaits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchPlans();
    }
  }, [currentUser?.id]);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      const hasDiscount = plan.discounted_price > 0 || plan.discount_percentage > 0;
      setUseDiscount(hasDiscount);
      const months = daysToMonths(plan.duration_days);
      const isCustom = ![30, 60, 90, 120, 180, 365, 540, 720].includes(plan.duration_days);
      setDurationType(isCustom ? 'custom' : 'preset');
      setFormData({
        name: plan.name || '',
        duration_months: months,
        duration_days: plan.duration_days || 90,
        price: plan.price || 0,
        discounted_price: plan.discounted_price || 0,
        discount_percentage: plan.discount_percentage || 0,
        description: plan.description || '',
        features: plan.features || [],
        is_active: plan.is_active ?? true
      });
    } else {
      setEditingPlan(null);
      setUseDiscount(false);
      setDurationType('preset');
      setFormData({
        name: '',
        duration_months: 3,
        duration_days: 90,
        price: 0,
        discounted_price: 0,
        discount_percentage: 0,
        description: '',
        features: [],
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handlePriceChange = (price) => {
    setFormData({ ...formData, price: parseInt(price) || 0 });
  };

  const handleDiscountChange = (type, value) => {
    const price = formData.price;
    let discounted_price = 0;
    let discount_percentage = 0;
    
    if (type === 'percentage') {
      discount_percentage = parseInt(value) || 0;
      discounted_price = price - (price * discount_percentage / 100);
    } else {
      discounted_price = parseInt(value) || 0;
      discount_percentage = price > 0 ? Math.round((price - discounted_price) / price * 100) : 0;
    }
    
    setFormData({
      ...formData,
      discounted_price: Math.max(0, discounted_price),
      discount_percentage: Math.min(100, Math.max(0, discount_percentage))
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const dataToSave = {
        name: formData.name,
        duration_days: Number(formData.duration_days),
        price: Number(formData.price),
        discounted_price: useDiscount ? Number(formData.discounted_price) : null,
        discount_percentage: useDiscount ? Number(formData.discount_percentage) : 0,
        description: formData.description,
        features: formData.features,
        is_active: formData.is_active,
        admin_id: currentUser?.id,
        updated_at: new Date().toISOString()
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(dataToSave)
          .eq('id', editingPlan.id);
        
        if (error) throw error;
        toast.success('Forfait mis à jour');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert({
            ...dataToSave,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        toast.success('Forfait créé');
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error('[SubscriptionPlansManagement] Save error:', err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce forfait ?')) return;
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Forfait supprimé');
      fetchPlans();
    } catch (err) {
      console.error('[SubscriptionPlansManagement] Delete error:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      toast.success(`Forfait ${!plan.is_active ? 'activé' : 'désactivé'}`);
      fetchPlans();
    } catch (err) {
      console.error('[SubscriptionPlansManagement] Toggle error:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  const getDurationLabel = (days) => {
    const months = days / 30;
    if (days === 30) return '1 mois';
    if (days === 60) return '2 mois';
    if (days === 90) return '3 mois';
    if (days === 120) return '4 mois';
    if (days === 150) return '5 mois';
    if (days === 180) return '6 mois';
    if (days === 210) return '7 mois';
    if (days === 240) return '8 mois';
    if (days === 270) return '9 mois';
    if (days === 300) return '10 mois';
    if (days === 330) return '11 mois';
    if (days === 365) return '12 mois';
    if (days % 30 === 0) return `${months} mois`;
    return `${days} jours (${Math.floor(days / 30)} mois)`;
  };

  const quickPlans = [
    { duration_days: 30, name: '1 mois', months: 1 },
    { duration_days: 60, name: '2 mois', months: 2 },
    { duration_days: 90, name: '3 mois', months: 3 },
    { duration_days: 120, name: '4 mois', months: 4 },
    { duration_days: 150, name: '5 mois', months: 5 },
    { duration_days: 180, name: '6 mois', months: 6 },
    { duration_days: 210, name: '7 mois', months: 7 },
    { duration_days: 240, name: '8 mois', months: 8 },
    { duration_days: 270, name: '9 mois', months: 9 },
    { duration_days: 300, name: '10 mois', months: 10 },
    { duration_days: 330, name: '11 mois', months: 11 },
    { duration_days: 365, name: '12 mois', months: 12 }
  ];

  const handleQuickCreate = (quickPlan) => {
    setEditingPlan(null);
    setUseDiscount(false);
    setDurationType('preset');
    setFormData({
      name: `Forfait ${quickPlan.name}`,
      duration_months: quickPlan.months,
      duration_days: quickPlan.duration_days,
      price: 0,
      discounted_price: 0,
      discount_percentage: 0,
      description: `Abonnement ${quickPlan.name}`,
      features: ['Accès illimité aux cours', 'Sessions en direct', 'Certificat', 'Support prioritaire'],
      is_active: true
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Erreur de chargement</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Cartes de création rapide - TOUS LES MOIS DE 1 À 12 */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
        {quickPlans.map((plan) => (
          <Card 
            key={plan.duration_days}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary"
            onClick={() => handleQuickCreate(plan)}
          >
            <CardContent className="p-2 text-center">
              <Tag className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-semibold text-xs">{plan.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Forfaits d'Abonnement</h2>
            <p className="text-sm text-muted-foreground">Gérez les offres PRO disponibles sur votre espace.</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau Forfait
        </Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nom du Forfait</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Prix normal</TableHead>
              <TableHead>Prix promo</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun forfait configuré. Créez votre premier forfait !
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-bold">{plan.name}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {getDurationLabel(plan.duration_days)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {plan.price.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {plan.discounted_price ? (
                      <span className="text-green-600 font-bold">
                        {plan.discounted_price.toLocaleString()} FCFA
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.discount_percentage > 0 ? (
                      <Badge className="bg-green-500 text-white">
                        -{plan.discount_percentage}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleToggleActive(plan)}
                      className={plan.is_active ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground'}
                    >
                      {plan.is_active ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {plan.is_active ? 'Actif' : 'Inactif'}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(plan)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(plan.id)}>
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

      {/* Modal Création/Modification */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Modifier le forfait' : 'Créer un forfait'}</DialogTitle>
            <DialogDescription>
              Configurez les détails de votre forfait d'abonnement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du forfait *</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Forfait Premium"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Durée *</Label>
                <div className="flex gap-2">
                  <Select value={durationType} onValueChange={setDurationType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preset">Mois prédéfinis</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {durationType === 'preset' ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={decrementMonths}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold">{formData.duration_months}</span>
                        <span className="text-muted-foreground ml-1">
                          mois ({formData.duration_days} jours)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={incrementMonths}
                        className="h-10 w-10"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Input 
                        type="number" 
                        min="1"
                        value={formData.duration_days}
                        onChange={e => handleCustomDaysChange(e.target.value)}
                        placeholder="Nombre de jours"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Soit environ {daysToMonths(formData.duration_days)} mois
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix normal (FCFA) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    min="0" 
                    value={formData.price} 
                    onChange={e => handlePriceChange(e.target.value)} 
                    className="pl-9"
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Prix avec réduction</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Appliquer une réduction</span>
                    <Switch checked={useDiscount} onCheckedChange={setUseDiscount} />
                  </div>
                </div>
                {useDiscount && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            value={formData.discount_percentage} 
                            onChange={e => handleDiscountChange('percentage', e.target.value)} 
                            className="pl-9"
                            placeholder="%"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            min="0" 
                            value={formData.discounted_price} 
                            onChange={e => handleDiscountChange('amount', e.target.value)} 
                            className="pl-9"
                            placeholder="Prix promo"
                          />
                        </div>
                      </div>
                    </div>
                    {formData.discount_percentage > 0 && (
                      <p className="text-xs text-green-600">
                        Réduction de {formData.discount_percentage}% - Économisez {(formData.price - formData.discounted_price).toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Décrivez ce forfait..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Avantages (un par ligne)</Label>
              <Textarea 
                value={formData.features?.join('\n') || ''} 
                onChange={e => setFormData({...formData, features: e.target.value.split('\n').filter(f => f.trim())})} 
                placeholder="Accès illimité aux cours&#10;Sessions en direct&#10;Certificat à la fin&#10;Support prioritaire"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
              <Label className="font-bold">Forfait Actif</Label>
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={c => setFormData({...formData, is_active: c})} 
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPlan ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPlansManagement;