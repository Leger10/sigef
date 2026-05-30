// src/pages/admin/PaymentAccountsAdmin.jsx - Version avec débogage
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Edit, Plus, Trash2, Loader2, RefreshCw, Wallet, AlertCircle, Smartphone, CreditCard, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const PaymentAccountsAdmin = () => {
  const { currentUser } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [initializing, setInitializing] = useState(false);
  
  const [formData, setFormData] = useState({
    payment_method_id: '',
    account_number: '',
    account_name: '',
    account_holder: '',
    instructions: '',
    country: 'Burkina Faso',
    is_active: true
  });

  // Créer les méthodes de paiement par défaut
  const initializeDefaultPaymentMethods = async () => {
    if (!currentUser) return false;
    
    setInitializing(true);
    try {
      const { data: existingMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('admin_id', currentUser.id)
        .limit(1);
      
      if (existingMethods && existingMethods.length > 0) {
        return false;
      }
      
      const defaultConfigs = [
        { name: 'Wave', account_number: '', account_name: 'Compte Wave' },
        { name: 'Orange Money', account_number: '', account_name: 'Compte Orange Money' },
        { name: 'Moov Money', account_number: '', account_name: 'Compte Moov Money' }
      ];
      
      for (const config of defaultConfigs) {
        const { data: method, error: methodError } = await supabase
          .from('payment_methods')
          .insert({
            name: config.name,
            admin_id: currentUser.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (methodError) {
          console.error(`Error creating method ${config.name}:`, methodError);
          continue;
        }
        
        const { error: accountError } = await supabase
          .from('payment_method_accounts')
          .insert({
            payment_method_id: method.id,
            account_number: '',
            account_name: config.account_name,
            account_holder: currentUser.full_name || 'Administrateur',
            country: 'Burkina Faso',
            admin_id: currentUser.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (accountError) {
          console.error(`Error creating account for ${config.name}:`, accountError);
        }
      }
      
      toast.success('Méthodes de paiement par défaut créées');
      return true;
      
    } catch (err) {
      console.error('Error initializing payment methods:', err);
      return false;
    } finally {
      setInitializing(false);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name, is_active')
        .eq('admin_id', currentUser.id)
        .order('name');

      if (error) throw error;
      
      setPaymentMethods(data || []);
      
      if (!data || data.length === 0) {
        const initialized = await initializeDefaultPaymentMethods();
        if (initialized) {
          const { data: newData } = await supabase
            .from('payment_methods')
            .select('id, name, is_active')
            .eq('admin_id', currentUser.id)
            .order('name');
          setPaymentMethods(newData || []);
        }
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      toast.error('Erreur chargement des méthodes');
    }
  };

  const fetchAccounts = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_method_accounts')
        .select(`
          *,
          payment_method:payment_method_id (id, name)
        `)
        .eq('admin_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast.error('Erreur chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPaymentMethods();
    }
  }, [currentUser]);

  useEffect(() => {
    if (paymentMethods.length > 0 || !loading) {
      fetchAccounts();
    }
  }, [paymentMethods]);

  const handleAddMethod = async () => {
    const methodName = window.prompt('Nom de la nouvelle méthode de paiement (ex: PayPal, Bank Transfer, etc.)');
    if (!methodName || !methodName.trim()) return;
    
    try {
      const { data: newMethod, error } = await supabase
        .from('payment_methods')
        .insert({
          name: methodName.trim(),
          admin_id: currentUser.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`Méthode "${methodName}" ajoutée`);
      await fetchPaymentMethods();
      
      if (window.confirm(`Voulez-vous ajouter un compte pour "${methodName}" maintenant ?`)) {
        setFormData({
          payment_method_id: newMethod.id,
          account_number: '',
          account_name: '',
          account_holder: currentUser.full_name || '',
          instructions: '',
          country: 'Burkina Faso',
          is_active: true
        });
        setEditingAccount(null);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Error adding method:', err);
      toast.error('Erreur lors de l\'ajout de la méthode');
    }
  };

  const handleDeleteMethod = async (methodId, methodName) => {
    const associatedAccounts = accounts.filter(a => a.payment_method_id === methodId);
    
    let message = `Supprimer la méthode "${methodName}" ?`;
    if (associatedAccounts.length > 0) {
      message = `La méthode "${methodName}" a ${associatedAccounts.length} compte(s) associé(s). La suppression supprimera également ces comptes. Confirmer ?`;
    }
    
    if (!window.confirm(message)) return;
    
    try {
      const { error: accountsError } = await supabase
        .from('payment_method_accounts')
        .delete()
        .eq('payment_method_id', methodId);
      
      if (accountsError) throw accountsError;
      
      const { error: methodError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);
      
      if (methodError) throw methodError;
      
      toast.success(`Méthode "${methodName}" supprimée`);
      await fetchPaymentMethods();
      await fetchAccounts();
    } catch (err) {
      console.error('Error deleting method:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        payment_method_id: account.payment_method_id,
        account_number: account.account_number || '',
        account_name: account.account_name || '',
        account_holder: account.account_holder || '',
        instructions: account.instructions || '',
        country: account.country || 'Burkina Faso',
        is_active: account.is_active
      });
    } else {
      setEditingAccount(null);
      setFormData({
        payment_method_id: paymentMethods.length > 0 ? paymentMethods[0].id : '',
        account_number: '',
        account_name: '',
        account_holder: currentUser?.full_name || '',
        instructions: '',
        country: 'Burkina Faso',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('[DEBUG] Form submission started');
    console.log('[DEBUG] Form data:', formData);
    console.log('[DEBUG] Editing account:', editingAccount);
    console.log('[DEBUG] Current user:', currentUser);
    
    // Validation
    if (!formData.payment_method_id) {
      toast.error('Sélectionnez une méthode de paiement');
      return;
    }
    if (!formData.account_number || formData.account_number.trim() === '') {
      toast.error('Le numéro de téléphone/compte est requis');
      return;
    }
    if (!formData.account_name || formData.account_name.trim() === '') {
      toast.error('Le nom du compte est requis');
      return;
    }

    setSaving(true);
    try {
      const accountData = {
        admin_id: currentUser.id,
        payment_method_id: formData.payment_method_id,
        account_number: formData.account_number.trim(),
        account_name: formData.account_name.trim(),
        account_holder: formData.account_holder.trim() || null,
        instructions: formData.instructions.trim() || null,
        country: formData.country,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };
      
      console.log('[DEBUG] Account data to save:', accountData);

      let result;
      if (editingAccount) {
        console.log('[DEBUG] Updating account:', editingAccount.id);
        result = await supabase
          .from('payment_method_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        
        console.log('[DEBUG] Update result:', result);
        
        if (result.error) throw result.error;
        toast.success('Numéro mis à jour avec succès');
      } else {
        console.log('[DEBUG] Creating new account');
        result = await supabase
          .from('payment_method_accounts')
          .insert([accountData]);
        
        console.log('[DEBUG] Insert result:', result);
        
        if (result.error) throw result.error;
        toast.success('Numéro ajouté avec succès');
      }
      
      setIsModalOpen(false);
      await fetchAccounts();
      
    } catch (err) {
      console.error('[DEBUG] Error saving account:', err);
      console.error('[DEBUG] Error details:', err.message, err.details, err.hint);
      toast.error(`Erreur: ${err.message || 'Erreur lors de la sauvegarde'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Supprimer ce numéro de réception ?')) return;
    try {
      const { error } = await supabase
        .from('payment_method_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Numéro supprimé');
      fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('Erreur suppression');
    }
  };

  const toggleAccountStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('payment_method_accounts')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setAccounts(accounts.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
      toast.success(`Compte ${!currentStatus ? 'activé' : 'désactivé'}`);
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Erreur modification statut');
    }
  };

  const toggleMethodStatus = async (methodId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', methodId);

      if (error) throw error;
      setPaymentMethods(paymentMethods.map(m => m.id === methodId ? { ...m, is_active: !currentStatus } : m));
      toast.success(`Méthode ${!currentStatus ? 'activée' : 'désactivée'}`);
    } catch (err) {
      console.error('Error toggling method status:', err);
      toast.error('Erreur modification statut');
    }
  };

  const getMethodIcon = (methodName) => {
    const name = methodName?.toLowerCase() || '';
    if (name.includes('wave')) return '🌊';
    if (name.includes('orange')) return '🍊';
    if (name.includes('moov')) return '📱';
    if (name.includes('paypal')) return '💙';
    if (name.includes('bank') || name.includes('banque')) return '🏦';
    return '💳';
  };

  if (loading || initializing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const accountsWithoutNumber = accounts.filter(a => !a.account_number || a.account_number === '' || a.account_number === 'A MODIFIER');

  return (
    <div className="space-y-6">
      {accountsWithoutNumber.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-600 font-medium">Numéros manquants</p>
            <p className="text-sm text-amber-600/80">
              Vous avez {accountsWithoutNumber.length} compte(s) sans numéro de téléphone.
              Veuillez cliquer sur le crayon ✏️ pour les modifier.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Moyens de paiement
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les méthodes de paiement et les numéros où vos apprenants enverront leurs paiements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAccounts} title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleAddMethod} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle méthode
          </Button>
        </div>
      </div>

      {/* Section: Méthodes de paiement */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-muted/30 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Méthodes de paiement
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Types de paiement acceptés
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Méthode</TableHead>
                <TableHead className="text-white text-center">Statut</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Aucune méthode configurée
                  </TableCell>
                </TableRow>
              ) : (
                paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getMethodIcon(method.name)}</span>
                        <span className="font-medium">{method.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch 
                          checked={method.is_active} 
                          onCheckedChange={() => toggleMethodStatus(method.id, method.is_active)} 
                        />
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteMethod(method.id, method.name)}
                        className="text-destructive hover:bg-destructive/10"
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

      {/* Section: Comptes de réception (avec numéros) */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-muted/30 border-b flex justify-between items-center">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Numéros de réception
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Les apprenants verront ces numéros pour effectuer leurs paiements
            </p>
          </div>
          <Button size="sm" onClick={() => handleOpenModal()} disabled={paymentMethods.length === 0}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter un numéro
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Méthode</TableHead>
                <TableHead className="text-white">Numéro / Compte</TableHead>
                <TableHead className="text-white">Nom du compte</TableHead>
                <TableHead className="text-white">Titulaire</TableHead>
                <TableHead className="text-white text-center">Statut</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucun numéro configuré. Cliquez sur "Ajouter un numéro" pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <span>{getMethodIcon(account.payment_method?.name)}</span>
                        {account.payment_method?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!account.account_number || account.account_number === '' || account.account_number === 'A MODIFIER' ? (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          À renseigner
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-lg">{account.account_number}</span>
                      )}
                    </TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.account_holder || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch 
                          checked={account.is_active} 
                          onCheckedChange={() => toggleAccountStatus(account.id, account.is_active)} 
                        />
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(account)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(account.id)}>
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

      {/* Modal d'ajout/modification de compte */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              {editingAccount ? 'Modifier le numéro' : 'Ajouter un numéro de réception'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Méthode de paiement *</Label>
              <Select 
                value={formData.payment_method_id} 
                onValueChange={v => setFormData({...formData, payment_method_id: v})}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionnez une méthode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Numéro de téléphone / compte *</Label>
              <Input 
                value={formData.account_number} 
                onChange={e => setFormData({...formData, account_number: e.target.value})} 
                placeholder="Ex: 70123456"
                className="bg-background font-mono text-lg"
                required
              />
              <p className="text-xs text-muted-foreground">
                Le numéro où les apprenants doivent envoyer l'argent
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nom du compte *</Label>
              <Input 
                value={formData.account_name} 
                onChange={e => setFormData({...formData, account_name: e.target.value})} 
                placeholder="Ex: Compte Orange Money Principal"
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Titulaire du compte</Label>
              <Input 
                value={formData.account_holder} 
                onChange={e => setFormData({...formData, account_holder: e.target.value})} 
                placeholder="Nom du bénéficiaire"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Instructions (optionnel)</Label>
              <Textarea 
                value={formData.instructions} 
                onChange={e => setFormData({...formData, instructions: e.target.value})} 
                placeholder="Instructions pour l'apprenant (ex: mettre le nom en référence)..."
                rows={3}
                className="bg-background resize-none"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-border">
              <Label className="cursor-pointer">Compte actif</Label>
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={(c) => setFormData({...formData, is_active: c})} 
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

export default PaymentAccountsAdmin;