// src/pages/admin/GeneralConfiguration.jsx
import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Image as ImageIcon,
  Upload,
  Palette,
  Layout,
  Star,
  Tag,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { supabase, getFileUrl, uploadFile } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

// Liste des icônes disponibles pour les fonctionnalités marketing
const AVAILABLE_ICONS = [
  "Target",
  "Video",
  "MessageSquare",
  "Calendar",
  "Headphones",
  "Award",
  "Users",
  "BarChart3",
  "Crown",
  "BookOpen",
  "Settings",
  "Sparkles",
  "Star",
  "CheckCircle",
  "Shield",
  "Trophy",
];

// Dégradés de couleurs prédéfinis
const COLOR_GRADIENTS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-amber-500 to-yellow-500",
  "from-teal-500 to-cyan-500",
  "from-rose-500 to-pink-500",
];

const GeneralConfiguration = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Informations générales
  const [formData, setFormData] = useState({
    site_name: "",
    site_description: "",
    hero_badge_text: "",
    hero_badge_bg_color: "",
    hero_badge_text_color: "",
    site_color_primary: "#3b82f6",
    site_color_secondary: "#10b981",
    site_color_accent: "#f59e0b",
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    footer_text: "",
    footer_background_color: "#1f2937",
    social_facebook: "",
    social_twitter: "",
    social_instagram: "",
    social_linkedin: "",
    social_youtube: "",
    social_tiktok: "",
  });

  // Nouvelles données pour la page d'accueil
  const [homeSections, setHomeSections] = useState({
    features: true,
    testimonials: true,
    marketing: true,
  });
  const [marketingOffer, setMarketingOffer] = useState({
    enabled: true,
    title: "Offre Spéciale -20%",
    subtitle: "Profitez de -20% sur votre premier mois d'abonnement PRO",
    buttonText: "Je profite de l'offre",
  });

  // Gestion des fonctionnalités marketing (tableau modifiable)
  const [marketingFeatures, setMarketingFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  // États temporaires pour l'édition d'un élément
  const [editingFeatureIndex, setEditingFeatureIndex] = useState(null);
  const [editingTestimonialIndex, setEditingTestimonialIndex] = useState(null);
  const [newFeature, setNewFeature] = useState({
    icon: "Target",
    title: "",
    description: "",
    badge: "",
    color: "from-blue-500 to-cyan-500",
  });
  const [newTestimonial, setNewTestimonial] = useState({
    name: "",
    role: "",
    content: "",
    rating: 5,
    avatar: "",
  });

  const [files, setFiles] = useState({
    site_logo: null,
    site_favicon: null,
    site_banner_image: null,
    footer_logo: null,
  });

  const [previews, setPreviews] = useState({
    site_logo: "",
    site_favicon: "",
    site_banner_image: "",
    footer_logo: "",
  });

  // Valeurs par défaut
  const defaultMarketingFeatures = [
    {
      icon: "Target",
      title: "Programmes personnalisés",
      description: "Des parcours adaptés à chaque cycle",
      badge: "Sur mesure",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: "Video",
      title: "Sessions Live",
      description: "Interagissez en direct avec vos formateurs",
      badge: "En direct",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: "MessageSquare",
      title: "Chat en direct",
      description: "Échangez en temps réel",
      badge: "Instantané",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: "Calendar",
      title: "Planning structuré",
      description: "Cours programmés à l'avance",
      badge: "Anticipé",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: "Headphones",
      title: "Support prioritaire",
      description: "Assistance dédiée 7j/7",
      badge: "Premium",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: "Award",
      title: "Certification officielle",
      description: "Attestation de formation reconnue",
      badge: "Reconnu",
      color: "from-amber-500 to-yellow-500",
    },
    {
      icon: "Users",
      title: "Communauté exclusive",
      description: "Réseau d'entraide",
      badge: "Entraide",
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: "BarChart3",
      title: "Statistiques détaillées",
      description: "Suivez votre progression",
      badge: "Analyse",
      color: "from-rose-500 to-pink-500",
    },
  ];

  const defaultTestimonials = [
    {
      name: "Jean Dupont",
      role: "Apprenant PRO - Officier",
      content: "Grâce à l'abonnement PRO, j'ai réussi mon concours !",
      rating: 5,
      avatar: "JD",
    },
    {
      name: "Marie Koné",
      role: "Apprenante PRO - Commissaire",
      content:
        "Les programmes personnalisés m'ont permis de progresser rapidement.",
      rating: 5,
      avatar: "MK",
    },
    {
      name: "Amadou Diallo",
      role: "Apprenant PRO - Concours direct",
      content: "J'ai réussi mon concours du premier coup !",
      rating: 5,
      avatar: "AD",
    },
  ];

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_config")
        .select("*")
        .eq("admin_id", currentUser?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          site_name: data.site_name || "",
          site_description: data.site_description || "",
          hero_badge_text: data.hero_badge_text || "Plateforme SaaS Multi-Tenant de Gestion Académique et Formation en Ligne",
          hero_badge_bg_color: data.hero_badge_bg_color || "",
          hero_badge_text_color: data.hero_badge_text_color || "",
          site_color_primary: data.site_color_primary || "#3b82f6",
          site_color_secondary: data.site_color_secondary || "#10b981",
          site_color_accent: data.site_color_accent || "#f59e0b",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          contact_address: data.contact_address || "",
          footer_text: data.footer_text || "",
          footer_background_color: data.footer_background_color || "#1f2937",
          social_facebook: data.social_media?.facebook_url || "",
          social_twitter: data.social_media?.twitter_url || "",
          social_instagram: data.social_media?.instagram_url || "",
          social_linkedin: data.social_media?.linkedin_url || "",
          social_youtube: data.social_media?.youtube_url || "",
          social_tiktok: data.social_media?.tiktok_url || "",
        });

        setPreviews({
          site_logo: data.site_logo ? getFileUrl("sessions", data.site_logo) : "",
          site_favicon: data.site_favicon ? getFileUrl("sessions", data.site_favicon) : "",
          site_banner_image: data.site_banner_image ? getFileUrl("sessions", data.site_banner_image) : "",
          footer_logo: data.footer_logo ? getFileUrl("sessions", data.footer_logo) : "",
        });

        setHomeSections(
          data.home_sections || {
            features: true,
            testimonials: true,
            marketing: true,
          },
        );
        setMarketingOffer({
          enabled: data.marketing_offer_enabled ?? true,
          title: data.marketing_offer_title || "Offre Spéciale -20%",
          subtitle: data.marketing_offer_subtitle || "Profitez de -20% sur votre premier mois d'abonnement PRO",
          buttonText: data.marketing_offer_button_text || "Je profite de l'offre",
        });
        setMarketingFeatures(data.home_marketing_features || defaultMarketingFeatures);
        setTestimonials(data.home_testimonials || defaultTestimonials);
      } else {
        setMarketingFeatures(defaultMarketingFeatures);
        setTestimonials(defaultTestimonials);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [currentUser?.id]);

  // Compression d'image
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          let maxWidth = 1024;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas to Blob failed"));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.8,
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = async (e, fieldName) => {
    let file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 20 Mo");
      return;
    }
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setFiles((prev) => ({ ...prev, [fieldName]: compressed }));
      setPreviews((prev) => ({ ...prev, [fieldName]: previewUrl }));
      toast.success(`Image compressée : ${(compressed.size / 1024).toFixed(0)} Ko`);
    } catch (err) {
      console.error("Compression error:", err);
      const previewUrl = URL.createObjectURL(file);
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
      setPreviews((prev) => ({ ...prev, [fieldName]: previewUrl }));
      toast.warning("Compression impossible, utilisation de l'image originale");
    }
  };

  const uploadFileToStorage = async (file, folder) => {
    if (!file) return null;
    const fileExt = "jpg";
    const fileName = `${folder}_${currentUser?.id}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const uploadFileObj = new File([file], fileName, { type: "image/jpeg" });
    const uploadedPath = await uploadFile("sessions", filePath, uploadFileObj);
    return uploadedPath;
  };

  // Gestion des fonctionnalités marketing
  const addMarketingFeature = () => {
    if (!newFeature.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setMarketingFeatures([...marketingFeatures, { ...newFeature }]);
    setNewFeature({
      icon: "Target",
      title: "",
      description: "",
      badge: "",
      color: "from-blue-500 to-cyan-500",
    });
    setEditingFeatureIndex(null);
  };

  const updateMarketingFeature = (index) => {
    if (!newFeature.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    const updated = [...marketingFeatures];
    updated[index] = { ...newFeature };
    setMarketingFeatures(updated);
    setEditingFeatureIndex(null);
    setNewFeature({
      icon: "Target",
      title: "",
      description: "",
      badge: "",
      color: "from-blue-500 to-cyan-500",
    });
  };

  const deleteMarketingFeature = (index) => {
    const updated = [...marketingFeatures];
    updated.splice(index, 1);
    setMarketingFeatures(updated);
    if (editingFeatureIndex === index) setEditingFeatureIndex(null);
  };

  const editMarketingFeature = (index) => {
    setNewFeature({ ...marketingFeatures[index] });
    setEditingFeatureIndex(index);
  };

  // Gestion des témoignages
  const addTestimonial = () => {
    if (!newTestimonial.name.trim() || !newTestimonial.content.trim()) {
      toast.error("Le nom et le contenu sont requis");
      return;
    }
    setTestimonials([...testimonials, { ...newTestimonial }]);
    setNewTestimonial({
      name: "",
      role: "",
      content: "",
      rating: 5,
      avatar: "",
    });
    setEditingTestimonialIndex(null);
  };

  const updateTestimonial = (index) => {
    if (!newTestimonial.name.trim() || !newTestimonial.content.trim()) {
      toast.error("Le nom et le contenu sont requis");
      return;
    }
    const updated = [...testimonials];
    updated[index] = { ...newTestimonial };
    setTestimonials(updated);
    setEditingTestimonialIndex(null);
    setNewTestimonial({
      name: "",
      role: "",
      content: "",
      rating: 5,
      avatar: "",
    });
  };

  const deleteTestimonial = (index) => {
    const updated = [...testimonials];
    updated.splice(index, 1);
    setTestimonials(updated);
    if (editingTestimonialIndex === index) setEditingTestimonialIndex(null);
  };

  const editTestimonial = (index) => {
    setNewTestimonial({ ...testimonials[index] });
    setEditingTestimonialIndex(index);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.site_name.trim()) {
      toast.error("Le nom de la plateforme est requis");
      return;
    }

    setSaving(true);
    try {
      const siteLogoPath = await uploadFileToStorage(files.site_logo, "logo");
      const siteFaviconPath = await uploadFileToStorage(files.site_favicon, "favicon");
      const siteBannerPath = await uploadFileToStorage(files.site_banner_image, "banner");
      const footerLogoPath = await uploadFileToStorage(files.footer_logo, "footer_logo");

      const socialMedia = {
        facebook_url: formData.social_facebook || null,
        twitter_url: formData.social_twitter || null,
        instagram_url: formData.social_instagram || null,
        linkedin_url: formData.social_linkedin || null,
        youtube_url: formData.social_youtube || null,
        tiktok_url: formData.social_tiktok || null,
      };

      const updateData = {
        site_name: formData.site_name,
        site_description: formData.site_description,
        hero_badge_text: formData.hero_badge_text,
        hero_badge_bg_color: formData.hero_badge_bg_color,
        hero_badge_text_color: formData.hero_badge_text_color,
        site_color_primary: formData.site_color_primary,
        site_color_secondary: formData.site_color_secondary,
        site_color_accent: formData.site_color_accent,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        footer_text: formData.footer_text,
        footer_background_color: formData.footer_background_color,
        social_media: socialMedia,
      };
      if (siteLogoPath) updateData.site_logo = siteLogoPath;
      if (siteFaviconPath) updateData.site_favicon = siteFaviconPath;
      if (siteBannerPath) updateData.site_banner_image = siteBannerPath;
      if (footerLogoPath) updateData.footer_logo = footerLogoPath;

      // Mise à jour via RPC avec les nouveaux paramètres
      const { error } = await supabase.rpc("upsert_admin_config", {
        p_admin_id: currentUser?.id,
        p_site_name: updateData.site_name,
        p_site_description: updateData.site_description,
        p_hero_badge_text: updateData.hero_badge_text,
        p_hero_badge_bg_color: updateData.hero_badge_bg_color,
        p_hero_badge_text_color: updateData.hero_badge_text_color,
        p_site_color_primary: updateData.site_color_primary,
        p_site_color_secondary: updateData.site_color_secondary,
        p_site_color_accent: updateData.site_color_accent,
        p_contact_email: updateData.contact_email,
        p_contact_phone: updateData.contact_phone,
        p_contact_address: updateData.contact_address,
        p_footer_text: updateData.footer_text,
        p_footer_background_color: updateData.footer_background_color,
        p_social_media: updateData.social_media,
        p_site_logo: updateData.site_logo || null,
        p_site_favicon: updateData.site_favicon || null,
        p_site_banner_image: updateData.site_banner_image || null,
        p_footer_logo: updateData.footer_logo || null,
      });
      if (error) throw error;

      // Mise à jour des données JSON (sections, marketing, témoignages)
      const { error: jsonError } = await supabase
        .from("admin_config")
        .update({
          home_sections: homeSections,
          home_marketing_features: marketingFeatures,
          home_testimonials: testimonials,
          marketing_offer_enabled: marketingOffer.enabled,
          marketing_offer_title: marketingOffer.title,
          marketing_offer_subtitle: marketingOffer.subtitle,
          marketing_offer_button_text: marketingOffer.buttonText,
          updated_at: new Date().toISOString(),
        })
        .eq("admin_id", currentUser?.id);

      if (jsonError) throw jsonError;

      toast.success("Configuration générale enregistrée avec succès");
      await fetchConfig();

      setFiles({
        site_logo: null,
        site_favicon: null,
        site_banner_image: null,
        footer_logo: null,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Configuration de votre espace
          </h2>
          <p className="text-muted-foreground mt-1">
            Personnalisez l'apparence, les contenus et la page d'accueil.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="general">Général & Apparence</TabsTrigger>
          <TabsTrigger value="home">Page d'accueil</TabsTrigger>
          <TabsTrigger value="contacts">Contacts & Footer</TabsTrigger>
          <TabsTrigger value="social">Réseaux sociaux</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Nom de votre espace *</Label>
                  <Input
                    id="site_name"
                    value={formData.site_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_description">Description (SEO)</Label>
                  <Textarea
                    id="site_description"
                    value={formData.site_description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hero_badge_text">Texte du badge (section Hero)</Label>
                  <Input
                    id="hero_badge_text"
                    value={formData.hero_badge_text}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    S'affiche sous forme de badge sur la page d'accueil, juste en dessous du logo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hero_badge_bg_color">Couleur de fond du badge</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="hero_badge_bg_color"
                        value={formData.hero_badge_bg_color}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.hero_badge_bg_color}
                        onChange={(e) => setFormData({ ...formData, hero_badge_bg_color: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Laisser vide pour utiliser la couleur primaire (avec transparence).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_badge_text_color">Couleur du texte du badge</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="hero_badge_text_color"
                        value={formData.hero_badge_text_color}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.hero_badge_text_color}
                        onChange={(e) => setFormData({ ...formData, hero_badge_text_color: e.target.value })}
                        placeholder="#000000"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Laisser vide pour utiliser la couleur primaire.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Couleur primaire</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="site_color_primary"
                        value={formData.site_color_primary}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.site_color_primary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            site_color_primary: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur secondaire</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="site_color_secondary"
                        value={formData.site_color_secondary}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.site_color_secondary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            site_color_secondary: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur d'accent</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="site_color_accent"
                        value={formData.site_color_accent}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.site_color_accent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            site_color_accent: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Logo principal</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {previews.site_logo && (
                        <img
                          src={previews.site_logo}
                          className="max-h-20 mx-auto mb-2"
                          alt="aperçu"
                        />
                      )}
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Choisir
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "site_logo")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {previews.site_favicon && (
                        <img
                          src={previews.site_favicon}
                          className="max-h-12 mx-auto mb-2"
                          alt="aperçu"
                        />
                      )}
                      <Label
                        htmlFor="favicon-upload"
                        className="cursor-pointer bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Choisir
                      </Label>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "site_favicon")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bannière (accueil)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {previews.site_banner_image && (
                        <img
                          src={previews.site_banner_image}
                          className="max-h-20 mx-auto mb-2"
                          alt="aperçu"
                        />
                      )}
                      <Label
                        htmlFor="banner-upload"
                        className="cursor-pointer bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Choisir
                      </Label>
                      <input
                        id="banner-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "site_banner_image")
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="home">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" /> Personnalisation de la page
                  d'accueil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Sections activation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Activer / désactiver des sections
                  </h3>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={homeSections.features}
                        onCheckedChange={(checked) =>
                          setHomeSections({
                            ...homeSections,
                            features: checked,
                          })
                        }
                      />
                      <Label>Section "Fonctionnalités" (3 cartes)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={homeSections.marketing}
                        onCheckedChange={(checked) =>
                          setHomeSections({
                            ...homeSections,
                            marketing: checked,
                          })
                        }
                      />
                      <Label>Section "Avantages PRO" (grille marketing)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={homeSections.testimonials}
                        onCheckedChange={(checked) =>
                          setHomeSections({
                            ...homeSections,
                            testimonials: checked,
                          })
                        }
                      />
                      <Label>Section "Témoignages"</Label>
                    </div>
                  </div>
                </div>

                {/* Offre spéciale */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Tag className="w-5 h-5" /> Offre spéciale
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Switch
                      checked={marketingOffer.enabled}
                      onCheckedChange={(checked) =>
                        setMarketingOffer({
                          ...marketingOffer,
                          enabled: checked,
                        })
                      }
                    />
                    <Label>Afficher l'offre spéciale</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input
                        value={marketingOffer.title}
                        onChange={(e) =>
                          setMarketingOffer({
                            ...marketingOffer,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sous-titre</Label>
                      <Input
                        value={marketingOffer.subtitle}
                        onChange={(e) =>
                          setMarketingOffer({
                            ...marketingOffer,
                            subtitle: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Texte du bouton</Label>
                      <Input
                        value={marketingOffer.buttonText}
                        onChange={(e) =>
                          setMarketingOffer({
                            ...marketingOffer,
                            buttonText: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Marketing Features - Interface simple */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">
                    Fonctionnalités marketing (section PRO)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez, modifiez ou supprimez les fonctionnalités. Chaque
                    fonctionnalité apparaîtra comme une carte.
                  </p>

                  <div className="space-y-3">
                    {marketingFeatures.map((feature, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-muted/20"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{feature.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {feature.badge}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {feature.icon}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editMarketingFeature(idx)}
                            >
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteMarketingFeature(idx)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {marketingFeatures.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        Aucune fonctionnalité. Cliquez sur "Ajouter" ci-dessous.
                      </p>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">
                      {editingFeatureIndex !== null
                        ? "Modifier la fonctionnalité"
                        : "Ajouter une fonctionnalité"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icône</Label>
                        <Select
                          value={newFeature.icon}
                          onValueChange={(v) =>
                            setNewFeature({ ...newFeature, icon: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ICONS.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                {icon}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input
                          value={newFeature.title}
                          onChange={(e) =>
                            setNewFeature({
                              ...newFeature,
                              title: e.target.value,
                            })
                          }
                          placeholder="Ex: Programmes personnalisés"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={newFeature.description}
                          onChange={(e) =>
                            setNewFeature({
                              ...newFeature,
                              description: e.target.value,
                            })
                          }
                          placeholder="Courte description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Badge</Label>
                        <Input
                          value={newFeature.badge}
                          onChange={(e) =>
                            setNewFeature({
                              ...newFeature,
                              badge: e.target.value,
                            })
                          }
                          placeholder="Ex: Sur mesure"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Couleur (dégradé)</Label>
                        <Select
                          value={newFeature.color}
                          onValueChange={(v) =>
                            setNewFeature({ ...newFeature, color: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_GRADIENTS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {editingFeatureIndex !== null ? (
                        <>
                          <Button
                            type="button"
                            onClick={() =>
                              updateMarketingFeature(editingFeatureIndex)
                            }
                          >
                            Mettre à jour
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingFeatureIndex(null);
                              setNewFeature({
                                icon: "Target",
                                title: "",
                                description: "",
                                badge: "",
                                color: "from-blue-500 to-cyan-500",
                              });
                            }}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={addMarketingFeature}>
                          Ajouter
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Témoignages - Carrousel interactif */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5" /> Témoignages
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez, modifiez ou supprimez des témoignages. Ils défilent
                    horizontalement sur le site.
                  </p>

                  <div className="space-y-3">
                    {testimonials.map((t, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-muted/20"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{t.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {t.role}
                            </p>
                            <p className="text-sm italic mt-1">
                              "{t.content.substring(0, 100)}..."
                            </p>
                            <div className="flex mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < t.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editTestimonial(idx)}
                            >
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteTestimonial(idx)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {testimonials.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        Aucun témoignage. Cliquez sur "Ajouter" ci-dessous.
                      </p>
                    )}
                  </div>

                  {/* Aperçu du carrousel pour l'admin */}
                  {testimonials.length > 0 && (
                    <div className="mt-6 border rounded-xl p-4 bg-muted/10">
                      <h4 className="text-sm font-medium mb-3">
                        Aperçu du défilement (côté utilisateur)
                      </h4>
                      <div className="relative">
                        <div className="overflow-x-auto scroll-smooth snap-mandatory snap-x flex gap-6 pb-4 hide-scrollbar">
                          {testimonials.map((t, idx) => (
                            <div
                              key={idx}
                              className="snap-start shrink-0 w-80 bg-card rounded-xl p-5 shadow-sm border"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {t.avatar || t.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold">{t.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t.role}
                                  </p>
                                </div>
                              </div>
                              <div className="flex mb-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < t.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground italic">
                                "{t.content}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        Sur le site, les utilisateurs peuvent faire défiler
                        horizontalement (glisser sur mobile ou flèches).
                      </p>
                    </div>
                  )}

                  {/* Formulaire d'ajout / édition */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">
                      {editingTestimonialIndex !== null
                        ? "Modifier le témoignage"
                        : "Ajouter un témoignage"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input
                          value={newTestimonial.name}
                          onChange={(e) =>
                            setNewTestimonial({
                              ...newTestimonial,
                              name: e.target.value,
                            })
                          }
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Input
                          value={newTestimonial.role}
                          onChange={(e) =>
                            setNewTestimonial({
                              ...newTestimonial,
                              role: e.target.value,
                            })
                          }
                          placeholder="Apprenant PRO - Officier"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Contenu *</Label>
                        <Textarea
                          value={newTestimonial.content}
                          onChange={(e) =>
                            setNewTestimonial({
                              ...newTestimonial,
                              content: e.target.value,
                            })
                          }
                          rows={3}
                          placeholder="Son témoignage..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Note (1-5)</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <Button
                              key={r}
                              type="button"
                              variant={
                                newTestimonial.rating >= r
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                setNewTestimonial({
                                  ...newTestimonial,
                                  rating: r,
                                })
                              }
                            >
                              {r}★
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Avatar (texte, ex: JD ou 😊)</Label>
                        <Input
                          value={newTestimonial.avatar}
                          onChange={(e) =>
                            setNewTestimonial({
                              ...newTestimonial,
                              avatar: e.target.value,
                            })
                          }
                          placeholder="JD"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {editingTestimonialIndex !== null ? (
                        <>
                          <Button
                            type="button"
                            onClick={() =>
                              updateTestimonial(editingTestimonialIndex)
                            }
                          >
                            Mettre à jour
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingTestimonialIndex(null);
                              setNewTestimonial({
                                name: "",
                                role: "",
                                content: "",
                                rating: 5,
                                avatar: "",
                              });
                            }}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={addTestimonial}>
                          Ajouter
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer toutes les modifications
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="contacts">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle>Contacts & Footer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email de contact</Label>
                    <Input
                      id="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Téléphone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_address">Adresse</Label>
                  <Textarea
                    id="contact_address"
                    value={formData.contact_address}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_text">Texte du footer</Label>
                  <Textarea
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Couleur de fond du footer</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="footer_background_color"
                        value={formData.footer_background_color}
                        onChange={handleInputChange}
                        className="w-14 h-10"
                      />
                      <Input
                        value={formData.footer_background_color}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            footer_background_color: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo du footer</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {previews.footer_logo && (
                        <img
                          src={previews.footer_logo}
                          className="max-h-12 mx-auto mb-2"
                        />
                      )}
                      <Label
                        htmlFor="footer-logo-upload"
                        className="cursor-pointer bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Choisir
                      </Label>
                      <input
                        id="footer-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "footer_logo")}
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="social">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle>Réseaux sociaux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input
                      id="social_facebook"
                      value={formData.social_facebook}
                      onChange={handleInputChange}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter / X</Label>
                    <Input
                      id="social_twitter"
                      value={formData.social_twitter}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      id="social_instagram"
                      value={formData.social_instagram}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      id="social_linkedin"
                      value={formData.social_linkedin}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    <Input
                      id="social_youtube"
                      value={formData.social_youtube}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok</Label>
                    <Input
                      id="social_tiktok"
                      value={formData.social_tiktok}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneralConfiguration;