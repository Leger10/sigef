import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase, uploadFile } from '@/lib/supabaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PaymentUpload = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('La taille du fichier doit être inférieure à 5 Mo');
        return;
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Veuillez télécharger un fichier image');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Veuillez sélectionner une capture d\'écran');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setUploading(true);

    try {
      // 1. Upload du fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `payment_${currentUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;
      
      const uploadedPath = await uploadFile('documents', filePath, file);
      
      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(uploadedPath);

      // 2. Créer la transaction dans la base de données
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          amount: parseFloat(amount),
          proof_image: publicUrl,
          status: 'pending',
          payment_method: 'manual',
          reference: `PAY_${Date.now()}_${currentUser.id.substring(0, 8)}`
        });

      if (transactionError) throw transactionError;

      setUploaded(true);
      toast.success('Preuve de paiement soumise avec succès. En attente de validation.');
      
      setFile(null);
      setAmount('');
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Échec de la soumission de la preuve de paiement. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Paiement soumis</h3>
        <p className="text-sm text-muted-foreground">
          Votre paiement est en cours d'examen. Vous recevrez une notification une fois validé.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant payé (FCFA)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50000"
          required
          className="text-foreground"
        />
      </div>

      <div>
        <Label htmlFor="screenshot">Capture d'écran du paiement</Label>
        <div className="mt-2">
          <Input
            id="screenshot"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-foreground"
            required
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Sélectionné : {file.name}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Téléchargement...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Soumettre la preuve de paiement
          </>
        )}
      </Button>
    </form>
  );
};

export default PaymentUpload;
