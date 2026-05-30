// src/pages/super-admin/PlatformConfig.jsx
import React, { useState, useEffect } from "react";
import { supabase, uploadFile, getFileUrl } from "@/lib/supabaseClient.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Save, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PlatformConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("admin_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      setConfig(data || {
        site_name: "SIGEF",
        site_description: "Plateforme de formation professionnelle",
        site_color_primary: "#1a56db",
        site_color_secondary: "#7e3af2",
        site_color_accent: "#f59e0b",
        contact_email: "",
        contact_phone: "",
        contact_address: "",
        footer_text: "",
      });
      if (data?.site_logo) setLogoPreview(getFileUrl("admin_config", data.site_logo));
      if (data?.site_favicon) setFaviconPreview(getFileUrl("admin_config", data.site_favicon));
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Erreur lors du chargement");
    } finally { setLoading(false); }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 2 Mo"); return; }
    const previewUrl = URL.createObjectURL(file);
    if (type === "logo") { setLogoFile(file); setLogoPreview(previewUrl); }
    else { setFaviconFile(file); setFaviconPreview(previewUrl); }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      let logoPath = config.site_logo;
      let faviconPath = config.site_favicon;
      if (logoFile) {
        const fileName = `logo_${Date.now()}.${logoFile.name.split(".").pop()}`;
        logoPath = await uploadFile("admin_config", `logos/${fileName}`, logoFile);
      }
      if (faviconFile) {
        const fileName = `favicon_${Date.now()}.${faviconFile.name.split(".").pop()}`;
        faviconPath = await uploadFile("admin_config", `favicons/${fileName}`, faviconFile);
      }
      const updateData = {
        site_name: config.site_name,
        site_description: config.site_description,
        site_color_primary: config.site_color_primary,
        site_color_secondary: config.site_color_secondary,
        site_color_accent: config.site_color_accent,
        contact_email: config.contact_email,
        contact_phone: config.contact_phone,
        contact_address: config.contact_address,
        footer_text: config.footer_text,
        site_logo: logoPath,
        site_favicon: faviconPath,
        updated_at: new Date().toISOString(),
      };
      if (config.id) {
        const { error } = await supabase.from("admin_config").update(updateData).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_config").insert(updateData);
        if (error) throw error;
      }
      toast.success("Configuration enregistrée");
      fetchConfig();
      setLogoFile(null); setFaviconFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!config) return <div>Erreur de chargement</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuration Globale</h2>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div><Label>Nom de la plateforme</Label><Input value={config.site_name} onChange={e => setConfig({...config, site_name: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={config.site_description} onChange={e => setConfig({...config, site_description: e.target.value})} /></div>
            <div><Label>Texte du footer</Label><Input value={config.footer_text} onChange={e => setConfig({...config, footer_text: e.target.value})} /></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Couleur primaire</Label><div className="flex gap-2"><Input type="color" value={config.site_color_primary} onChange={e => setConfig({...config, site_color_primary: e.target.value})} className="w-16 h-10 p-1" /><Input value={config.site_color_primary} onChange={e => setConfig({...config, site_color_primary: e.target.value})} /></div></div>
              <div><Label>Couleur secondaire</Label><div className="flex gap-2"><Input type="color" value={config.site_color_secondary} onChange={e => setConfig({...config, site_color_secondary: e.target.value})} className="w-16 h-10 p-1" /><Input value={config.site_color_secondary} onChange={e => setConfig({...config, site_color_secondary: e.target.value})} /></div></div>
              <div><Label>Couleur d'accent</Label><div className="flex gap-2"><Input type="color" value={config.site_color_accent} onChange={e => setConfig({...config, site_color_accent: e.target.value})} className="w-16 h-10 p-1" /><Input value={config.site_color_accent} onChange={e => setConfig({...config, site_color_accent: e.target.value})} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Logo</Label><div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer" onClick={() => document.getElementById("logo-input")?.click()}><div>{logoPreview ? <img src={logoPreview} alt="Logo" className="max-h-24 mx-auto" /> : config.site_logo ? <img src={getFileUrl("admin_config", config.site_logo)} alt="Logo" className="max-h-24 mx-auto" /> : <div className="py-8"><ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Cliquez pour uploader</p></div>}</div></div><input id="logo-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "logo")} /></div>
              <div><Label>Favicon</Label><div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer" onClick={() => document.getElementById("favicon-input")?.click()}><div>{faviconPreview ? <img src={faviconPreview} alt="Favicon" className="h-16 mx-auto" /> : config.site_favicon ? <img src={getFileUrl("admin_config", config.site_favicon)} alt="Favicon" className="h-16 mx-auto" /> : <div className="py-8"><ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Cliquez pour uploader</p></div>}</div></div><input id="favicon-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "favicon")} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div><Label>Email de contact</Label><Input type="email" value={config.contact_email} onChange={e => setConfig({...config, contact_email: e.target.value})} /></div>
            <div><Label>Téléphone</Label><Input value={config.contact_phone} onChange={e => setConfig({...config, contact_phone: e.target.value})} /></div>
            <div><Label>Adresse</Label><Input value={config.contact_address} onChange={e => setConfig({...config, contact_address: e.target.value})} /></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />Enregistrer la configuration</Button></div>
    </div>
  );
};

export default PlatformConfig;