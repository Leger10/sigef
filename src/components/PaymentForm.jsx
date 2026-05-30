import React, { useState, useRef } from "react";
import { supabase, uploadFile } from "@/lib/supabaseClient.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Copy, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PaymentForm = ({
  apprenantId,
  subscription,
  paymentMethod,
  paymentAccount,
  onSuccess,
  onCancel,
}) => {
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Numéro copié !");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image est trop volumineuse (max 5MB)");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setScreenshot(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !reference || !screenshot) {
      toast.error(
        "Veuillez remplir tous les champs et fournir une capture d'écran",
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload de la capture d'écran vers Supabase Storage
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `payment_${apprenantId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const uploadedPath = await uploadFile("documents", filePath, screenshot);

      // Obtenir l'URL publique
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(uploadedPath);

      // 2. Créer la transaction dans la base de données
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: apprenantId,
          subscription_id: subscription.id,
          amount: subscription.price_final || subscription.price || 0,
          payment_method: paymentMethod.name,
          reference: reference,
          status: "pending",
          proof_image: publicUrl,
          apprenant_phone: phone,
          payment_method_account_id: paymentAccount.id,
        });

      if (transactionError) throw transactionError;

      // 3. Mettre à jour la table subscriptions pour indiquer le paiement en attente
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "pending",
          payment_reference: reference,
          payment_method: paymentMethod.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) throw updateError;

      toast.success("Paiement soumis avec succès. En attente de validation.");
      onSuccess();
    } catch (err) {
      console.error("Error submitting payment:", err);
      toast.error("Erreur lors de la soumission du paiement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-primary/5 p-6 border-b border-border/50 flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold mb-2">Instructions de dépôt</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          Veuillez effectuer un transfert de{" "}
          <strong className="text-foreground">
            {subscription.price_final || subscription.price} XOF
          </strong>{" "}
          sur le compte ci-dessous via{" "}
          <strong className="text-foreground">{paymentMethod.name}</strong>,
          puis remplissez le formulaire avec les détails de la transaction.
        </p>

        <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between w-full max-w-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
              {paymentAccount.account_name}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {paymentAccount.account_number}
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleCopy(paymentAccount.account_number)}
            className="shrink-0 h-10 w-10"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          <div className="space-y-2">
            <Label htmlFor="phone">
              Votre numéro de téléphone (ayant effectué le transfert)
            </Label>
            <Input
              id="phone"
              placeholder="Ex: +226 70 12 34 56"
              className="bg-background text-foreground"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Référence de transaction (ID)</Label>
            <Input
              id="reference"
              placeholder="Ex: BF240515.1432.A12345"
              className="bg-background text-foreground font-mono"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Capture d'écran du SMS/Reçu</Label>
            {!preview ? (
              <div
                className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Cliquez ou glissez une image ici
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG ou WEBP (max 5MB)
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black aspect-video flex items-center justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-full object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !phone || !reference || !screenshot}
              className="min-w-[140px]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Soumettre"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
