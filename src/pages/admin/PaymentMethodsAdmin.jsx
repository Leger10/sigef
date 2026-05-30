// src/pages/admin/PaymentMethodsAdmin.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Edit, Plus, Trash2, SmartphoneNfc, Loader2, CreditCard, Wallet, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const PaymentMethodsAdmin = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // Types globaux
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    payment_method_id: '',
    account_name: '',
    account_number: '',
    account_holder: '',
    instructions: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // 1. Charger les types de paiement globaux
      const { data: methods, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (methodsError) throw methodsError;
      setPaymentMethods(methods || []);

      // 2. Charger les comptes de paiement de l'admin
      const { data: accountsData, error: accountsError } = await supabase
        .from('payment_method_accounts')
        .select(`
          *,
          payment_method:payment_method_id (*)
        `)
        .eq('admin_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        payment_method_id: account.payment_method_id,
        account_name: account.account_name || '',
        account_number: account.account_number || '',
        account_holder: account.account_holder || '',
        instructions: account.instructions || '',
        is_active: account.is_active
      });
    } else {
      setEditingAccount(null);
      setFormData({
        payment_method_id: '',
        account_name: '',
        account_number: '',
        account_holder: '',
        instructions: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.payment_method_id) {
      toast.error('Veuillez sélectionner un type de paiement');
      return;
    }
    
    if (!formData.account_name.trim()) {
      toast.error('Veuillez entrer un nom de compte');
      return;
    }
    
    if (!formData.account_number.trim()) {
      toast.error('Veuillez entrer un numéro de compte');
      return;
    }

    setSaving(true);
    try {
      const accountData = {
        admin_id: currentUser.id,
        payment_method_id: formData.payment_method_id,
        account_name: formData.account_name.trim(),
        account_number: formData.account_number.trim(),
        account_holder: formData.account_holder.trim() || null,
        instructions: formData.instructions.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingAccount) {
        // Mise à jour
        result = await supabase
          .from('payment_method_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
      } else {
        // Création
        result = await supabase
          .from('payment_method_accounts')
          .insert([accountData]);
      }

      if (result.error) throw result.error;

      toast.success(editingAccount ? 'Compte mis à jour' : 'Compte ajouté');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving payment account:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce compte de paiement ?')) return;
    
    try {
      const { error } = await supabase
        .from('payment_method_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Compte supprimé');
      fetchData();
    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('payment_method_accounts')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setAccounts(accounts.map(acc => 
        acc.id === id ? { ...acc, is_active: !currentStatus } : acc
      ));
      toast.success(`Compte ${!currentStatus ? 'activé' : 'désactivé'}`);
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const getMethodIcon = (methodName) => {
    const name = methodName?.toLowerCase() || '';
    if (name.includes('orange')) return '💰';
    if (name.includes('moov')) return '📱';
    if (name.includes('wave')) return '🌊';
    if (name.includes('banque') || name.includes('bank')) return '🏦';
    return '💳';
  };

  const getMethodColor = (methodName) => {
    const name = methodName?.toLowerCase() || '';
    if (name.includes('orange')) return 'bg-orange-100 text-orange-700';
    if (name.includes('moov')) return 'bg-blue-100 text-blue-700';
    if (name.includes('wave')) return 'bg-teal-100 text-teal-700';
    if (name.includes('banque') || name.includes('bank')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            Comptes de paiement
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les comptes bancaires et Mobile Money pour recevoir les paiements de vos apprenants.
          </p>
        </div>
        
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un compte
        </Button>
      </div>

      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Titulaire</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Banknote className="h-12 w-12 text-muted-foreground/50" />
                    <p>Aucun compte de paiement configuré</p>
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal()} className="mt-2">
                      <Plus className="h-4 w-4 mr-1" /> Ajouter un compte
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getMethodIcon(account.payment_method?.name)}</span>
                      {account.account_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMethodColor(account.payment_method?.name)} variant="secondary">
                      {account.payment_method?.name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {account.account_number}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.account_holder || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch 
                        checked={account.is_active} 
                        onCheckedChange={() => toggleStatus(account.id, account.is_active)} 
                      />
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenModal(account)} 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(account.id)} 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal d'ajout/modification */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {editingAccount ? 'Modifier le compte' : 'Ajouter un compte de paiement'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Type de paiement <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.payment_method_id} 
                onValueChange={(value) => setFormData({ ...formData, payment_method_id: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <span>{getMethodIcon(method.name)}</span>
                        {method.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom du compte <span className="text-destructive">*</span></Label>
              <Input 
                value={formData.account_name} 
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} 
                placeholder="Ex: Compte Orange Money Principal"
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Numéro de compte / Téléphone <span className="text-destructive">*</span></Label>
              <Input 
                value={formData.account_number} 
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} 
                placeholder="Ex: 70123456 ou Numéro de compte bancaire"
                className="bg-background font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Titulaire du compte (optionnel)</Label>
              <Input 
                value={formData.account_holder} 
                onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })} 
                placeholder="Nom du bénéficiaire"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Instructions (optionnel)</Label>
              <Textarea 
                value={formData.instructions} 
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} 
                placeholder="Instructions supplémentaires pour l'apprenant (ex: mettre le nom en référence)..."
                rows={3}
                className="bg-background resize-none"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-border mt-2">
              <Label className="cursor-pointer">Compte actif</Label>
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} 
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsAdmin;