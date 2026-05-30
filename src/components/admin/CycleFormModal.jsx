// src/components/admin/CycleFormModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

export const CycleFormModal = ({ isOpen, onClose, cycle, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (cycle) {
      setFormData({
        name: cycle.name || '',
        description: cycle.description || '',
        is_active: cycle.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    }
  }, [cycle, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom du cycle est requis');
      return;
    }

    setLoading(true);
    try {
      if (cycle) {
        // Mise à jour
        const { error } = await supabase
          .from('cycles')
          .update({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', cycle.id);

        if (error) throw error;
        toast.success('Cycle modifié avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('cycles')
          .insert({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            admin_id: currentUser?.id
          });

        if (error) throw error;
        toast.success('Cycle créé avec succès');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving cycle:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cycle ? 'Modifier le cycle' : 'Nouveau cycle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du cycle *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Concours Direct 2024"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du cycle..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Cycle actif</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cycle ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
