// src/pages/admin/GeneralSettings.jsx
import React, { useState, useEffect } from "react";
import { Settings, Save, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { supabase, getFileUrl, uploadFile } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

const GeneralSettings = () => {
  const { currentUser } = useAuth();
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    platform_name: "",
    description: "",
    support_email: "",
    support_phone: "",
    address: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bgPreview, setBgPreview] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Récupérer la config de l'admin connecté
      const { data, error } = await supabase
        .from("admin_config")
        .select("*")
        .eq("admin_id", currentUser?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setFormData({
          platform_name: data.site_name || "",
          description: data.site_description || "",
          support_email: data.contact_email || "",
          support_phone: data.contact_phone || "",
          address: data.contact_address || "",
        });

        if (data.site_logo)
          setLogoPreview(getFileUrl("admin_config", data.site_logo));
        if (data.site_banner_image)
          setBgPreview(getFileUrl("admin_config", data.site_banner_image));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [currentUser?.id]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === "logo") {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setBgFile(file);
      setBgPreview(previewUrl);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.platform_name.trim()) {
      toast.error("Le nom de la plateforme est requis");
      return;
    }

    setSaving(true);
    try {
      let logoUrl = null;
      let bgUrl = null;

      // Upload logo si nécessaire
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `logo_${currentUser?.id}_${Date.now()}.${fileExt}`;
        const filePath = `settings/${fileName}`;
        const uploadedPath = await uploadFile(
          "admin_config",
          filePath,
          logoFile,
        );
        const {
          data: { publicUrl },
        } = supabase.storage.from("admin_config").getPublicUrl(uploadedPath);
        logoUrl = uploadedPath;
      }

      // Upload background si nécessaire
      if (bgFile) {
        const fileExt = bgFile.name.split(".").pop();
        const fileName = `bg_${currentUser?.id}_${Date.now()}.${fileExt}`;
        const filePath = `settings/${fileName}`;
        const uploadedPath = await uploadFile("admin_config", filePath, bgFile);
        bgUrl = uploadedPath;
      }

      const updateData = {
        site_name: formData.platform_name,
        site_description: formData.description,
        contact_email: formData.support_email,
        contact_phone: formData.support_phone,
        contact_address: formData.address,
        updated_at: new Date().toISOString(),
      };

      if (logoUrl) updateData.site_logo = logoUrl;
      if (bgUrl) updateData.site_banner_image = bgUrl;

      if (settingsId) {
        const { error } = await supabase
          .from("admin_config")
          .update(updateData)
          .eq("id", settingsId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_config").insert({
          ...updateData,
          admin_id: currentUser?.id,
        });
        if (error) throw error;
      }

      toast.success("Configuration enregistrée avec succès");
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Configuration Générale
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez l'identité visuelle et les informations de contact de votre
            espace.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Informations Principales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="platformName" className="font-bold">
                Nom de votre espace <span className="text-destructive">*</span>
              </Label>
              <Input
                id="platformName"
                value={formData.platform_name}
                onChange={(e) =>
                  setFormData({ ...formData, platform_name: e.target.value })
                }
                placeholder="Ex: SIGEF"
                required
                className="min-h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-bold">
                Description courte
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Slogan ou description de votre espace..."
                className="min-h-[120px] resize-none text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label className="font-bold">Logo de votre espace</Label>
                <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/80 bg-muted/20 rounded-2xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[220px] relative">
                  {logoPreview ? (
                    <div className="relative w-full h-32 flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                      <span className="text-sm font-semibold">
                        Aucun logo sélectionné
                      </span>
                    </div>
                  )}
                  <div className="w-full mt-auto">
                    <Label
                      htmlFor="logo-upload"
                      className="flex items-center justify-center w-full min-h-12 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors text-sm font-bold shadow-sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir une image
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "logo")}
                    />
                  </div>
                </div>
              </div>

              {/* Background Upload */}
              <div className="space-y-3">
                <Label className="font-bold">Image de fond (Accueil)</Label>
                <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/80 bg-muted/20 rounded-2xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[220px] relative">
                  {bgPreview ? (
                    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-lg shadow-sm border border-border">
                      <img
                        src={bgPreview}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                      <span className="text-sm font-semibold">
                        Aucune image sélectionnée
                      </span>
                    </div>
                  )}
                  <div className="w-full mt-auto">
                    <Label
                      htmlFor="bg-upload"
                      className="flex items-center justify-center w-full min-h-12 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors text-sm font-bold shadow-sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir une image
                    </Label>
                    <input
                      id="bg-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "bg")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border space-y-6">
              <h3 className="text-xl font-bold tracking-tight">
                Contacts & Support
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail" className="font-bold">
                    Email de support
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={formData.support_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        support_email: e.target.value,
                      })
                    }
                    placeholder="support@exemple.com"
                    className="min-h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone" className="font-bold">
                    Téléphone de support
                  </Label>
                  <Input
                    id="supportPhone"
                    type="tel"
                    value={formData.support_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        support_phone: e.target.value,
                      })
                    }
                    placeholder="+226 00 00 00 00 00"
                    className="min-h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold">
                  Adresse physique
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Adresse complète..."
                  className="min-h-[100px] resize-none text-base"
                />
              </div>
            </div>

            <div className="pt-8 flex justify-end border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="min-h-12 w-full sm:w-auto px-10 text-base font-bold"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving
                  ? "Enregistrement en cours..."
                  : "Enregistrer la configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default GeneralSettings;
