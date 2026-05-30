import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { WalletCards, SmartphoneNfc } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';

const PaymentMethodSelector = ({ onSelect }) => {
  const [methods, setMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const { data: records, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMethods(records || []);
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMethods();
  }, []);

  useEffect(() => {
    if (selectedMethodId) {
      const fetchAccounts = async () => {
        try {
          const { data: records, error } = await supabase
            .from('payment_method_accounts')
            .select('*')
            .eq('payment_method_id', selectedMethodId)
            .eq('is_active', true);

          if (error) throw error;
          setAccounts(records || []);
          if (records?.length === 1) {
            handleAccountSelect(records[0].id);
          } else {
            handleAccountSelect(null);
          }
        } catch (err) {
          console.error('Error fetching accounts:', err);
        }
      };
      fetchAccounts();
    } else {
      setAccounts([]);
    }
  }, [selectedMethodId]);

  const handleMethodSelect = (id) => {
    setSelectedMethodId(id);
    setSelectedAccountId(null);
    onSelect(null, null);
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
    const method = methods.find(m => m.id === selectedMethodId);
    const account = accounts.find(a => a.id === accountId);
    if (method && account) {
      onSelect(method, account);
    } else {
      onSelect(null, null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map((method) => (
          <Card 
            key={method.id} 
            className={`cursor-pointer transition-all duration-200 border-2 ${selectedMethodId === method.id ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 bg-card hover:border-primary/50 hover:bg-muted/30'}`}
            onClick={() => handleMethodSelect(method.id)}
          >
            <CardContent className="p-5 flex flex-col items-center text-center gap-3 h-full justify-center">
              <div className={`p-3 rounded-xl ${selectedMethodId === method.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {method.icon ? (
                  <img src={method.icon} alt={method.name} className="h-8 w-8 object-contain" />
                ) : (
                  <SmartphoneNfc className="h-8 w-8" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{method.name}</h4>
                {method.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{method.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedMethodId && accounts.length > 0 && (
        <div className="p-5 bg-muted/20 border border-border/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Label className="text-sm font-medium">Sélectionnez le compte de destination</Label>
          <Select value={selectedAccountId || ''} onValueChange={handleAccountSelect}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Choisir un compte de paiement..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.account_name} - {acc.account_number} {acc.country ? `(${acc.country})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedMethodId && accounts.length === 0 && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm text-center">
          Aucun compte disponible pour cette méthode de paiement pour le moment.
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
