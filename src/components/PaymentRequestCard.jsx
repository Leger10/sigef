import React, { useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const PaymentRequestCard = ({ payment, onUpdate }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');

  const handleValidate = async () => {
    setLoading(true);
    try {
      // 1. Mettre à jour la transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          validated_by: currentUser?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (transactionError) throw transactionError;

      // 2. Mettre à jour l'abonnement si existe
      if (payment.subscription_id) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: expiryDate.toISOString()
          })
          .eq('id', payment.subscription_id);

        if (subscriptionError) throw subscriptionError;
      }

      // 3. Mettre à jour l'utilisateur (statut PRO)
      const { error: userError } = await supabase
        .from('users')
        .update({
          pro_status: true,
          pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', payment.user_id);

      if (userError) throw userError;

      toast.success('Paiement validé avec succès');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleRefuse = async () => {
    if (!refusalReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    setLoading(true);
    try {
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          refusal_reason: refusalReason,
          validated_by: currentUser?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (transactionError) throw transactionError;

      toast.success('Paiement refusé');
      setShowRefuseForm(false);
      setRefusalReason('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Refusal error:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setLoading(false);
    }
  };

  const screenshotUrl = payment.proof_image || payment.screenshot_url;

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold">{payment.user?.full_name || payment.user?.name || 'Utilisateur'}</p>
          <p className="text-sm text-muted-foreground">{payment.user?.email}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary tabular-nums">{payment.amount} FCFA</p>
          <p className="text-xs text-muted-foreground">
            {new Date(payment.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {screenshotUrl && (
        <div className="mb-4">
          <a
            href={screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Voir la capture d'écran
          </a>
        </div>
      )}

      {payment.payment_method && (
        <div className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium">Méthode:</span> {payment.payment_method}
        </div>
      )}

      {payment.reference && (
        <div className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium">Référence:</span> {payment.reference}
        </div>
      )}

      {payment.status === 'pending' && !showRefuseForm && (
        <div className="flex gap-2">
          <Button
            onClick={handleValidate}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Valider
          </Button>
          <Button
            onClick={() => setShowRefuseForm(true)}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Refuser
          </Button>
        </div>
      )}

      {showRefuseForm && (
        <div className="space-y-3">
          <Textarea
            value={refusalReason}
            onChange={(e) => setRefusalReason(e.target.value)}
            placeholder="Raison du refus..."
            className="text-foreground"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRefuse}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmer le refus
            </Button>
            <Button
              onClick={() => {
                setShowRefuseForm(false);
                setRefusalReason('');
              }}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {payment.status === 'completed' && (
        <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm font-medium">
          ✓ Validé le {new Date(payment.validated_at).toLocaleDateString('fr-FR')}
        </div>
      )}

      {payment.status === 'failed' && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          <p className="font-medium">✗ Refusé</p>
          {payment.refusal_reason && (
            <p className="mt-1 opacity-80">{payment.refusal_reason}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentRequestCard;
