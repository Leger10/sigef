// src/components/AdminShareLink.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Copy, CheckCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx'; // ← AJOUTER CETTE LIGNE
import { supabase } from '@/lib/supabaseClient.js'; // ← Ajouter aussi pour la config

export const AdminShareLink = () => {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [adminConfig, setAdminConfig] = useState(null);

  // 🔥 Optionnel : Récupérer le nom personnalisé de l'admin
  useEffect(() => {
    const fetchAdminConfig = async () => {
      if (!currentUser?.id) return;
      const { data } = await supabase
        .from("admin_config")
        .select("site_name")
        .eq("admin_id", currentUser.id)
        .maybeSingle();
      if (data) setAdminConfig(data);
    };
    fetchAdminConfig();
  }, [currentUser]);

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return null;
  }

  // Lien propre vers la page de l'admin (utilise la nouvelle route)
  const shareLink = `${window.location.origin}/admin/${currentUser.id}`;
  const adminName = adminConfig?.site_name || currentUser.full_name;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(`Lien vers votre espace "${adminName}" copié ! Partagez-le avec vos apprenants.`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Impossible de copier le lien');
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 p-5 rounded-xl border shadow-sm my-6">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Partagez votre espace personnalisé</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Ce lien unique permet à vos apprenants de voir <strong>vos formations avec votre identité visuelle</strong> (logo, couleurs, bannière).
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={shareLink}
          readOnly
          className="bg-background font-mono text-sm flex-1"
          onClick={(e) => e.target.select()}
        />
        <Button onClick={copyToClipboard} variant="outline" className="gap-2">
          {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copié !' : 'Copier le lien'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Envoyez ce lien par email, WhatsApp, ou publiez‑le sur votre espace privé.
        <br />
        <span className="text-primary">✨ Vos apprenants verront votre marque et uniquement vos formations.</span>
      </p>
    </div>
  );
};