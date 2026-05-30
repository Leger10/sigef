
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Bell, Send, History, Mail, Gift, AlertCircle, Eye, Calendar, Clock, UserCheck as UserSearch, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';

const AdminNotifications = () => {
  const { currentUser } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState('compose');
  const [activeComposeTab, setActiveComposeTab] = useState('global');
  
  // Data for selects
  const [cycles, setCycles] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Form States
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipients_type: 'all', // all, pro_only, non_pro, by_cycle, by_user
    recipients_cycle: '',
    target_user: '', 
    scheduled_date: ''
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    fetchCycles();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeMainTab === 'history') {
      fetchHistory();
    }
  }, [activeMainTab]);

  const fetchCycles = async () => {
    try {
      const records = await supabase.from('cycles').getFullList({ sort: 'name', $autoCancel: false });
      setCycles(records);
    } catch (e) {
      console.error('Error fetching cycles:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const records = await supabase.from('users').getList(1, 100, { sort: '-created', $autoCancel: false });
      setUsers(records.items);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchHistory = async () => {
    console.log('Fetching notifications history...');
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const records = await supabase.from('notifications').getList(1, 50, {
        sort: '-created',
        expand: 'created_by,recipients_cycle',
        $autoCancel: false
      });
      console.log('Fetched notifications successfully:', records.items);
      setHistory(records.items);
    } catch (error) {
      console.error('Error fetching history:', error, error.response);
      setHistoryError(error.message || 'Erreur de chargement');
      toast.error(`Erreur lors du chargement de l'historique: ${error.message}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleComposeChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Le titre et le message sont obligatoires.');
      return false;
    }
    if (formData.recipients_type === 'by_cycle' && !formData.recipients_cycle) {
      toast.error('Veuillez sélectionner un cycle.');
      return false;
    }
    if (activeComposeTab === 'individual' && !formData.target_user) {
      toast.error('Veuillez sélectionner un utilisateur.');
      return false;
    }
    return true;
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsConfirmOpen(true);
    }
  };

  const executeSend = async () => {
    setSending(true);
    try {
      const typeMap = {
        global: 'global',
        individual: 'individual',
        offer: 'offer'
      };

      const typeValue = typeMap[activeComposeTab];
      const rType = activeComposeTab === 'individual' ? 'by_user' : formData.recipients_type;

      const payload = {
        type: typeValue,
        title: formData.title,
        message: formData.message,
        recipients_type: rType,
        status: 'pending',
        created_by: currentUser?.id,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        recipients_count: 0 // Default, backend hook might update this
      };

      if (rType === 'by_cycle' && formData.recipients_cycle) {
        payload.recipients_cycle = formData.recipients_cycle;
      }
      
      if (rType === 'by_user' && formData.target_user) {
        payload.target_user_id = formData.target_user; 
      }

      if (formData.scheduled_date) {
        payload.scheduled_date = formData.scheduled_date;
      }

      console.log('Sending notification with payload:', payload);
      const record = await supabase.from('notifications').create(payload, { $autoCancel: false });
      console.log('Notification saved successfully:', record);
      
      toast.success('Notification programmée/envoyée avec succès.');
      setFormData({
        title: '',
        message: '',
        recipients_type: 'all',
        recipients_cycle: '',
        target_user: '',
        scheduled_date: ''
      });
      setIsConfirmOpen(false);
      
      // Auto refresh history
      fetchHistory();
      
      setTimeout(() => setActiveMainTab('history'), 500);

    } catch (error) {
      console.error('Error saving notification:', error, error.response);
      toast.error(`Une erreur est survenue lors de l'envoi: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'sent': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">Envoyé</span>;
      case 'pending': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">En attente</span>;
      case 'failed': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Échoué</span>;
      default: return status;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Centre de Notifications</h2>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <div className="border-b border-border mb-6">
          <TabsList className="bg-transparent h-12 p-0 w-full justify-start rounded-none">
            <TabsTrigger 
              value="compose" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
            >
              <Send className="h-4 w-4 mr-2" /> Composer
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
            >
              <History className="h-4 w-4 mr-2" /> Historique
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="compose" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3">
              <div className="flex flex-col gap-2 sticky top-24">
                <button 
                  onClick={() => setActiveComposeTab('global')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors font-medium flex items-center gap-3 ${activeComposeTab === 'global' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <Mail className="h-4 w-4" /> Message Global
                </button>
                <button 
                  onClick={() => setActiveComposeTab('individual')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors font-medium flex items-center gap-3 ${activeComposeTab === 'individual' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <UserSearch className="h-4 w-4" /> Message Individuel
                </button>
                <button 
                  onClick={() => setActiveComposeTab('offer')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors font-medium flex items-center gap-3 ${activeComposeTab === 'offer' ? 'bg-secondary/10 text-secondary' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <Gift className="h-4 w-4" /> Offre Spéciale
                </button>
              </div>
            </div>

            <div className="lg:col-span-9">
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <form onSubmit={handlePreSubmit} className="p-6 sm:p-8 space-y-6">
                  <div className="border-b pb-4 mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {activeComposeTab === 'global' && 'Envoyer un message de masse'}
                      {activeComposeTab === 'individual' && 'Envoyer un message individuel'}
                      {activeComposeTab === 'offer' && 'Programmer une offre promotionnelle'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeComposeTab === 'global' && 'Diffusez des informations importantes à un ou plusieurs groupes.'}
                      {activeComposeTab === 'individual' && 'Contactez directement un apprenant ou formateur spécifique.'}
                      {activeComposeTab === 'offer' && 'Envoyez des réductions ou des incitations ciblées.'}
                    </p>
                  </div>

                  {activeComposeTab === 'individual' && (
                    <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                      <Label>Destinataire</Label>
                      <Select 
                        value={formData.target_user} 
                        onValueChange={(v) => handleComposeChange('target_user', v)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Sélectionnez un utilisateur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name || u.email} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(activeComposeTab === 'global' || activeComposeTab === 'offer') && (
                    <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border">
                      <Label className="text-base font-semibold">Audience cible</Label>
                      <RadioGroup 
                        value={formData.recipients_type} 
                        onValueChange={(val) => handleComposeChange('recipients_type', val)}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        <div className="flex items-center space-x-2 bg-background p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="all" id="r-all" />
                          <Label htmlFor="r-all" className="cursor-pointer flex-1 font-normal">Tous les utilisateurs</Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-background p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="pro_only" id="r-pro" />
                          <Label htmlFor="r-pro" className="cursor-pointer flex-1 font-normal">Abonnés PRO uniquement</Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-background p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="non_pro" id="r-nonpro" />
                          <Label htmlFor="r-nonpro" className="cursor-pointer flex-1 font-normal">Non-abonnés uniquement</Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-background p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="by_cycle" id="r-cycle" />
                          <Label htmlFor="r-cycle" className="cursor-pointer flex-1 font-normal">Par Cycle spécifique</Label>
                        </div>
                      </RadioGroup>

                      {formData.recipients_type === 'by_cycle' && (
                        <div className="mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                          <Label className="mb-2 block">Sélectionnez le cycle</Label>
                          <Select 
                            value={formData.recipients_cycle} 
                            onValueChange={(v) => handleComposeChange('recipients_cycle', v)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Choisir un cycle..." />
                            </SelectTrigger>
                            <SelectContent>
                              {cycles.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base">Titre du message</Label>
                      <Input 
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleComposeChange('title', e.target.value)}
                        placeholder="Sujet de votre notification"
                        className="text-base min-h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-base">Contenu du message</Label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleComposeChange('message', e.target.value)}
                        placeholder="Rédigez votre message ici..."
                        className="w-full min-h-[200px] p-4 rounded-xl border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-base resize-y"
                      />
                    </div>
                  </div>

                  {activeComposeTab === 'offer' && (
                    <div className="space-y-2 border-t pt-6">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Programmer l'envoi (Optionnel)
                      </Label>
                      <Input 
                        type="datetime-local"
                        value={formData.scheduled_date}
                        onChange={(e) => handleComposeChange('scheduled_date', e.target.value)}
                        className="w-full sm:w-auto"
                      />
                      <p className="text-sm text-muted-foreground">Laissez vide pour envoyer immédiatement.</p>
                    </div>
                  )}

                  <div className="pt-6 border-t flex justify-end">
                    <Button type="submit" size="lg" className="min-h-12 px-8 shadow-sm">
                      <Send className="h-4 w-4 mr-2" />
                      {activeComposeTab === 'offer' && formData.scheduled_date ? 'Programmer' : 'Envoyer la notification'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold">Historique des envois</h3>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[40%]">Titre</TableHead>
                    <TableHead>Destinataires</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'envoi</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : historyError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-destructive">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>{historyError}</p>
                        <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-4">Réessayer</Button>
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-muted-foreground">Aucun historique disponible</p>
                        <p className="text-sm text-muted-foreground">Les notifications envoyées apparaîtront ici.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map(notif => (
                      <TableRow key={notif.id}>
                        <TableCell className="capitalize text-muted-foreground font-medium">
                          {notif.type}
                        </TableCell>
                        <TableCell className="font-medium line-clamp-1 max-w-[200px] sm:max-w-none border-b-0">
                          {notif.title}
                        </TableCell>
                        <TableCell>
                          {notif.recipients_count || '0'}
                        </TableCell>
                        <TableCell>
                          {renderStatus(notif.status)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(notif.sent_at || notif.created).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedNotification(notif)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Confirmer l'envoi
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2 pt-2">
              <p>Êtes-vous sûr de vouloir envoyer cette notification ?</p>
              <div className="bg-muted p-3 rounded-lg text-foreground text-sm">
                <strong>Type :</strong> {activeComposeTab}<br/>
                <strong>Cible :</strong> {activeComposeTab === 'individual' ? 'Utilisateur spécifique' : formData.recipients_type}<br/>
                <strong>Titre :</strong> {formData.title}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend} disabled={sending} className="min-w-[100px]">
              {sending ? 'Envoi...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Détails de la notification</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4 pt-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Titre</h4>
                <p className="font-medium text-lg">{selectedNotification.title}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</h4>
                <div className="bg-muted p-4 rounded-xl text-sm whitespace-pre-wrap">
                  {selectedNotification.message}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Statut</h4>
                  <div>{renderStatus(selectedNotification.status)}</div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date d'envoi</h4>
                  <p className="text-sm">{new Date(selectedNotification.sent_at || selectedNotification.created).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cible</h4>
                  <p className="text-sm capitalize">{selectedNotification.recipients_type}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Destinataires touchés</h4>
                  <p className="text-sm font-semibold">{selectedNotification.recipients_count || '0'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNotification(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotifications;
