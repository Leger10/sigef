import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, getFileUrl } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";

const AdminConfigContext = createContext();

export const useAdminConfig = () => useContext(AdminConfigContext);

// Configuration par défaut
const DEFAULT_CONFIG = {
  site_name: "SIGEF",
  site_description:
    "Plateforme de formation professionnelle pour les candidats aux concours direct et professionnel.",
  site_color_primary: "#1a56db",
  site_color_secondary: "#7e3af2",
  site_color_accent: "#f59e0b",
  contact_email: "contact@sigef.app",
  contact_phone: "+226 00 00 00 00",
  contact_address: "Ouagadougou, Burkina Faso",
  footer_text:
    "Plateforme de formation professionnelle pour les candidats audirect et professionnel.",
  footer_background_color: "#1f2937",
  // Nouvelles propriétés pour la page d'accueil
  home_marketing_features: [
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
  ],
  home_testimonials: [
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
  ],
  home_sections: { features: true, testimonials: true, marketing: true },
  marketing_offer_enabled: true,
  marketing_offer_title: "Offre Spéciale -20%",
  marketing_offer_subtitle:
    "Profitez de -20% sur votre premier mois d'abonnement PRO",
  marketing_offer_button_text: "Je profite de l'offre",
};

export const AdminConfigProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);

  const resolveAdminIdFromUser = async () => {
    if (!currentUser) return null;
    if (currentUser.role === "admin" || currentUser.role === "super_admin") {
      return currentUser.id;
    }
    if (currentUser.cycle_id) {
      const { data: cycle, error } = await supabase
        .from("cycles")
        .select("admin_id")
        .eq("id", currentUser.cycle_id)
        .maybeSingle();
      if (!error && cycle?.admin_id) return cycle.admin_id;
    }
    return null;
  };

  const resolvePublicAdminId = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();
    if (!error && data) return data.id;
    return null;
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      let targetAdminId = null;
      if (currentUser) {
        targetAdminId = await resolveAdminIdFromUser();
      } else {
        targetAdminId = await resolvePublicAdminId();
      }
      setAdminId(targetAdminId);

      if (!targetAdminId) {
        setConfig(DEFAULT_CONFIG);
        return;
      }

      const cached = localStorage.getItem(`admin_config_${targetAdminId}`);
      if (cached) {
        setConfig(JSON.parse(cached));
      }

      const { data, error } = await supabase
        .from("admin_config")
        .select("*")
        .eq("admin_id", targetAdminId)
        .maybeSingle();

      if (error) throw error;

      let finalConfig = { ...DEFAULT_CONFIG };
      if (data) {
        finalConfig = {
          ...data,
          site_logo_url: data.site_logo
            ? getFileUrl("sessions", data.site_logo)
            : null,
          site_banner_url: data.site_banner_image
            ? getFileUrl("sessions", data.site_banner_image)
            : null,
          footer_logo_url: data.footer_logo
            ? getFileUrl("sessions", data.footer_logo)
            : null,
          // Fusion des tableaux JSONB avec les valeurs par défaut si absents
          home_marketing_features:
            data.home_marketing_features ||
            DEFAULT_CONFIG.home_marketing_features,
          home_testimonials:
            data.home_testimonials || DEFAULT_CONFIG.home_testimonials,
          home_sections: data.home_sections || DEFAULT_CONFIG.home_sections,
          marketing_offer_enabled:
            data.marketing_offer_enabled ??
            DEFAULT_CONFIG.marketing_offer_enabled,
          marketing_offer_title:
            data.marketing_offer_title || DEFAULT_CONFIG.marketing_offer_title,
          marketing_offer_subtitle:
            data.marketing_offer_subtitle ||
            DEFAULT_CONFIG.marketing_offer_subtitle,
          marketing_offer_button_text:
            data.marketing_offer_button_text ||
            DEFAULT_CONFIG.marketing_offer_button_text,
        };
      }
      setConfig(finalConfig);
      localStorage.setItem(
        `admin_config_${targetAdminId}`,
        JSON.stringify(finalConfig),
      );
    } catch (err) {
      console.error("AdminConfigContext error:", err);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [currentUser]);

  return (
    <AdminConfigContext.Provider
      value={{ config, loading, adminId, refetch: fetchConfig }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
};
