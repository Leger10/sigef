// src/pages/HomePage.jsx - Version avec carrousel à défilement automatique
import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useAdminConfig } from "@/contexts/AdminConfigContext.jsx";
import { supabase, getFileUrl } from "@/lib/supabaseClient.js";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  BookOpen,
  Video,
  Crown,
  ArrowRight,
  Settings,
  Loader2,
  ChevronUp,
  MessageSquare,
  Calendar,
  Target,
  Award,
  Sparkles,
  Users,
  Star,
  Headphones,
  BarChart3,
  UserCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Trophy,
  Shield,
  GraduationCap,
  Briefcase,
  Sparkle,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { toast } from "sonner";

// Mapping statique des icônes pour les fonctionnalités marketing
const iconMap = {
  Target: Target,
  Video: Video,
  MessageSquare: MessageSquare,
  Calendar: Calendar,
  Headphones: Headphones,
  Award: Award,
  Users: Users,
  BarChart3: BarChart3,
  Crown: Crown,
  BookOpen: BookOpen,
  Settings: Settings,
  Sparkles: Sparkles,
  Star: Star,
  CheckCircle: CheckCircle,
  Shield: Shield,
  Trophy: Trophy,
};

const Header = lazy(() => import("@/components/Header.jsx"));
const Footer = lazy(() => import("@/components/Footer.jsx"));

// Composant pour le carrousel à défilement automatique
// Composant pour le carrousel à défilement automatique (optimisé mobile)
const AutoScrollCarousel = ({ testimonials }) => {
  const scrollContainerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollIntervalRef = useRef(null);
  const autoScrollTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si c'est un mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fonction pour faire défiler automatiquement
  const startAutoScroll = () => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    
    scrollIntervalRef.current = setInterval(() => {
      if (!isPaused && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        // Vitesse adaptée selon l'appareil
        const scrollAmount = isMobile ? 2 : 1.5;
        
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 5) {
          // Revenir au premier témoignage en douceur
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollLeft += scrollAmount;
        }
      }
    }, isMobile ? 25 : 30); // Intervalle plus rapide sur mobile pour fluidité
  };

  // Démarrer le défilement automatique
  useEffect(() => {
    startAutoScroll();
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
    };
  }, [isMobile]);

  // Redémarrer après pause
  useEffect(() => {
    if (!isPaused) {
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = setTimeout(() => {
        startAutoScroll();
      }, 3000);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, [isPaused]);

  const handleManualNavigation = () => {
    setIsPaused(true);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      handleManualNavigation();
      const scrollDistance = isMobile ? window.innerWidth - 50 : 380;
      scrollContainerRef.current.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      handleManualNavigation();
      const scrollDistance = isMobile ? window.innerWidth - 50 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    }
  };

  // Gestion du swipe sur mobile
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      setIsPaused(true); // Pause au toucher
    };

    const handleTouchMove = (e) => {
      touchEndX = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (touchStartX - touchEndX > 50) {
        // Swipe gauche -> suivant
        scrollRight();
      } else if (touchEndX - touchStartX > 50) {
        // Swipe droite -> précédent
        scrollLeft();
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="relative group">
      {/* Bouton gauche - visible sur desktop, caché sur mobile (préférer le swipe) */}
      {!isMobile && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 dark:bg-gray-800/95 rounded-full p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-gray-700"
          aria-label="Témoignage précédent"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

    

      {/* Conteneur défilant */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scroll-smooth snap-mandatory snap-x flex gap-4 md:gap-6 pb-4"
        style={{ 
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="snap-start shrink-0 w-[85vw] sm:w-80 md:w-96 bg-card rounded-xl p-4 sm:p-6 shadow-lg border hover:shadow-2xl transition-all testimonial-card"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-lg sm:text-xl shadow-md">
                {testimonial.avatar || testimonial.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-base sm:text-lg">{testimonial.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
            <div className="flex mb-2 sm:mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${i < testimonial.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                />
              ))}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground italic leading-relaxed line-clamp-4">
              "{testimonial.content}"
            </p>
          </div>
        ))}
      </div>

      {/* Bouton droit - visible sur desktop, caché sur mobile */}
      {!isMobile && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 dark:bg-gray-800/95 rounded-full p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-gray-700"
          aria-label="Témoignage suivant"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Indicateurs de progression - responsive */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary/30 hover:bg-primary transition-all duration-300 hover:scale-150"
            onClick={() => {
              if (scrollContainerRef.current) {
                handleManualNavigation();
                const cardWidth = scrollContainerRef.current.children[0]?.offsetWidth || (isMobile ? window.innerWidth - 40 : 350);
                scrollContainerRef.current.scrollTo({
                  left: idx * (cardWidth + (isMobile ? 16 : 24)),
                  behavior: 'smooth'
                });
              }
            }}
          />
        ))}
      </div>

      {/* Indice pour swipe sur mobile */}
      {isMobile && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          ← Glissez pour voir plus de témoignages →
        </p>
      )}
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { adminId: urlAdminId } = useParams();
  const { isAuthenticated, currentUser } = useAuth();
  const { config: defaultConfig, loading: defaultConfigLoading } = useAdminConfig();
  
  // États pour la vue admin personnalisée
  const [adminCustomConfig, setAdminCustomConfig] = useState(null);
  const [targetAdminId, setTargetAdminId] = useState(null);
  const [isAdminPublicView, setIsAdminPublicView] = useState(false);
  const [adminCustomAdmins, setAdminCustomAdmins] = useState([]);
  const [adminCustomLoading, setAdminCustomLoading] = useState(true);
  
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [animated, setAnimated] = useState({
    hero: false,
    admins: false,
    features: false,
    pro: false,
    marketing: false,
    testimonials: false,
  });

  // Animation du badge
  const [badgeVisible, setBadgeVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeVisible(prev => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Références
  const testimonialsRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const heroRef = useRef(null);
  const adminsRef = useRef(null);
  const featuresRef = useRef(null);
  const proRef = useRef(null);
  const marketingRef = useRef(null);

  // Catégories
  const categories = [
    { id: "all", label: "Tous les cycles", icon: Sparkle, color: "from-gray-500 to-gray-400" },
    { id: "direct", label: "Concours direct", icon: GraduationCap, color: "from-blue-600 to-blue-400" },
    { id: "professional", label: "Concours professionnel", icon: Briefcase, color: "from-green-600 to-green-400" },
    { id: "other", label: "Autres formations", icon: Sparkles, color: "from-purple-600 to-purple-400" },
  ];

  // Charger la configuration personnalisée de l'admin
  useEffect(() => {
    const loadAdminCustomConfig = async () => {
      if (urlAdminId) {
        setIsAdminPublicView(true);
        setTargetAdminId(urlAdminId);
        
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url, bio, specialty, role")
            .eq("id", urlAdminId)
            .maybeSingle();
          
          if (userError || !userData || userData.role !== 'admin') {
            console.error("Admin non trouvé");
            setIsAdminPublicView(false);
            return;
          }
          
          const { data: configData, error: configError } = await supabase
            .from("admin_config")
            .select("*")
            .eq("admin_id", urlAdminId)
            .maybeSingle();
          
          if (!configError && configData) {
            setAdminCustomConfig({
              ...configData,
              site_logo_url: configData.site_logo ? getFileUrl("sessions", configData.site_logo) : null,
              site_banner_url: configData.site_banner_image ? getFileUrl("sessions", configData.site_banner_image) : null,
              footer_logo_url: configData.footer_logo ? getFileUrl("sessions", configData.footer_logo) : null,
              footer_background_color: configData.footer_background_color || "#1f2937",
              footer_text: configData.footer_text || "",
              contact_email: configData.contact_email || "",
              contact_phone: configData.contact_phone || "",
              contact_address: configData.contact_address || "",
              social_media: configData.social_media || {},
            });
          } else {
            setAdminCustomConfig({
              site_name: userData.full_name,
              site_logo_url: userData.avatar_url ? getFileUrl("avatars", userData.avatar_url) : null,
              site_banner_url: null,
              site_color_primary: "#1a56db",
              site_color_secondary: "#7e3af2",
              site_description: userData.bio || `Formations proposées par ${userData.full_name}`,
              footer_logo_url: null,
              footer_background_color: "#1f2937",
              footer_text: "",
              contact_email: "",
              contact_phone: "",
              contact_address: "",
              social_media: {},
              home_marketing_features: defaultConfig?.home_marketing_features || [],
              home_testimonials: defaultConfig?.home_testimonials || [],
              home_sections: defaultConfig?.home_sections || { features: true, testimonials: true, marketing: true },
              marketing_offer_enabled: defaultConfig?.marketing_offer_enabled ?? true,
              marketing_offer_title: defaultConfig?.marketing_offer_title,
              marketing_offer_subtitle: defaultConfig?.marketing_offer_subtitle,
              marketing_offer_button_text: defaultConfig?.marketing_offer_button_text,
              hero_badge_text: defaultConfig?.hero_badge_text,
              hero_badge_bg_color: defaultConfig?.hero_badge_bg_color,
              hero_badge_text_color: defaultConfig?.hero_badge_text_color,
            });
          }
        } catch (err) {
          console.error("Error loading admin config:", err);
        }
      } else {
        setIsAdminPublicView(false);
        setTargetAdminId(null);
        setAdminCustomConfig(null);
      }
    };
    
    loadAdminCustomConfig();
  }, [urlAdminId, defaultConfig]);

  // Version modifiée de fetchAdminsWithCycles pour la vue admin personnalisée
  const fetchAdminCustomAdmins = useCallback(async () => {
    if (!isAdminPublicView || !targetAdminId) return [];
    
    try {
      const { data: cyclesData, error: cyclesError } = await supabase
        .from("cycles")
        .select("id, name, description, admin_id, is_active, category")
        .eq("admin_id", targetAdminId)
        .eq("is_active", true);
      
      if (cyclesError) throw cyclesError;
      if (!cyclesData || cyclesData.length === 0) return [];
      
      const { data: adminsData, error: adminsError } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, bio, specialty")
        .eq("id", targetAdminId);
      
      if (adminsError) throw adminsError;
      
      const custom = adminCustomConfig || {};
      
      const result = adminsData.map((admin) => ({
        ...admin,
        display_name: custom.site_name || admin.full_name,
        display_avatar_url: custom.site_logo_url || admin.avatar_url,
        cycles: cyclesData,
        cycles_count: cyclesData.length,
      }));
      
      return result;
    } catch (err) {
      console.error("Error fetching admin custom cycles:", err);
      return [];
    }
  }, [isAdminPublicView, targetAdminId, adminCustomConfig]);

  // Version originale pour la vue normale
  const fetchAdminsWithCycles = useCallback(async () => {
    try {
      let targetAdminIds = null;

      if (isAuthenticated && currentUser) {
        if (currentUser.role === "super_admin") {
          targetAdminIds = null;
        } else if (currentUser.role === "admin") {
          targetAdminIds = [currentUser.id];
        } else {
          if (currentUser.cycle_id) {
            const { data: cycle, error: cycleError } = await supabase
              .from("cycles")
              .select("admin_id")
              .eq("id", currentUser.cycle_id)
              .maybeSingle();
            if (!cycleError && cycle?.admin_id) {
              targetAdminIds = [cycle.admin_id];
            }
          } else if (currentUser.admin_id) {
            targetAdminIds = [currentUser.admin_id];
          }
        }
      }

      let cyclesQuery = supabase
        .from("cycles")
        .select("id, name, description, admin_id, is_active, category")
        .eq("is_active", true)
        .not("admin_id", "is", null);

      if (selectedCategory !== "all") {
        cyclesQuery = cyclesQuery.eq("category", selectedCategory);
      }

      if (targetAdminIds && targetAdminIds.length > 0) {
        cyclesQuery = cyclesQuery.in("admin_id", targetAdminIds);
      }

      const { data: cyclesData, error: cyclesError } = await cyclesQuery;
      if (cyclesError) throw cyclesError;

      const cyclesByAdmin = {};
      cyclesData.forEach((cycle) => {
        if (!cyclesByAdmin[cycle.admin_id]) cyclesByAdmin[cycle.admin_id] = [];
        cyclesByAdmin[cycle.admin_id].push(cycle);
      });

      const adminIds = Object.keys(cyclesByAdmin);
      if (adminIds.length === 0) return [];

      const { data: adminsData, error: adminsError } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, bio, specialty")
        .in("id", adminIds);
      if (adminsError) throw adminsError;

      const { data: adminConfigs, error: configError } = await supabase
        .from("admin_config")
        .select("admin_id, site_name, site_logo")
        .in("admin_id", adminIds);
      if (configError)
        console.warn("Impossible de récupérer les configs admin", configError);

      const configMap = new Map();
      if (adminConfigs) {
        adminConfigs.forEach((config) => {
          configMap.set(config.admin_id, {
            site_name: config.site_name,
            site_logo_url: config.site_logo
              ? getFileUrl("sessions", config.site_logo)
              : null,
          });
        });
      }

      const result = adminsData.map((admin) => {
        const custom = configMap.get(admin.id) || {};
        return {
          ...admin,
          display_name: custom.site_name || admin.full_name,
          display_avatar_url: custom.site_logo_url || admin.avatar_url,
          cycles: cyclesByAdmin[admin.id] || [],
          cycles_count: cyclesByAdmin[admin.id]?.length || 0,
        };
      });
      return result;
    } catch (err) {
      console.error("Error fetching admins with cycles:", err);
      return [];
    }
  }, [isAuthenticated, currentUser, selectedCategory]);

  // Chargement des données selon le mode
  useEffect(() => {
    const loadData = async () => {
      if (isAdminPublicView) {
        setAdminCustomLoading(true);
        const result = await fetchAdminCustomAdmins();
        setAdminCustomAdmins(result);
        setAdminCustomLoading(false);
      } else {
        setAdminsLoading(true);
        const result = await fetchAdminsWithCycles();
        setAdmins(result);
        setAdminsLoading(false);
      }
    };
    loadData();
  }, [fetchAdminsWithCycles, fetchAdminCustomAdmins, isAdminPublicView]);

  // Gestion du scroll
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animations au scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAnimated((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.2 },
    );
    const sections = [
      heroRef,
      adminsRef,
      featuresRef,
      proRef,
      marketingRef,
      testimonialsRef,
    ];
    sections.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSelectCycle = (adminId, cycleId, cycleName) => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      localStorage.setItem("selected_admin_id", adminId);
      localStorage.setItem("selected_cycle_id", cycleId);
      localStorage.setItem("selected_cycle_name", cycleName);
      navigate("/signup");
    }
  };

  // Déterminer la config active et les données à afficher
  const activeConfig = isAdminPublicView ? adminCustomConfig : defaultConfig;
  const configLoading = isAdminPublicView ? false : defaultConfigLoading;
  const displayAdmins = isAdminPublicView ? adminCustomAdmins : admins;
  const displayAdminsLoading = isAdminPublicView ? adminCustomLoading : adminsLoading;

  // Attendre le chargement initial
  if (configLoading && !activeConfig) {
    return (
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<div className="h-16 bg-background" />}>
          <Header customConfig={activeConfig} />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Suspense fallback={<div className="h-32 bg-background" />}>
          <Footer customConfig={activeConfig} />
        </Suspense>
      </div>
    );
  }

  // Valeurs de configuration
  const siteName = activeConfig?.site_name || "SIGEF";
  const siteDescription = activeConfig?.site_description || "Rejoignez des milliers de candidats...";
  const primaryColor = activeConfig?.site_color_primary || "#1a56db";
  const secondaryColor = activeConfig?.site_color_secondary || "#7e3af2";
  const bannerUrl = activeConfig?.site_banner_url || null;
  const logoUrl = activeConfig?.site_logo_url || null;

  const marketingFeatures = activeConfig?.home_marketing_features || [];
  const testimonials = activeConfig?.home_testimonials || [];
  const sections = activeConfig?.home_sections || {
    features: true,
    testimonials: true,
    marketing: true,
  };
  const offer = {
    enabled: activeConfig?.marketing_offer_enabled ?? true,
    title: activeConfig?.marketing_offer_title || "Offre Spéciale -20%",
    subtitle: activeConfig?.marketing_offer_subtitle || "Profitez de -20% sur votre premier mois d'abonnement PRO",
    buttonText: activeConfig?.marketing_offer_button_text || "Je profite de l'offre",
  };

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-8 w-8" /> : <Crown className="h-8 w-8" />;
  };

  return (
    <>
      <Helmet>
        <title>{siteName} - Préparation aux Concours</title>
        <meta name="description" content={siteDescription} />
        <meta name="theme-color" content={primaryColor} />
      </Helmet>
      <style>{`
        :root { --primary-custom: ${primaryColor}; --secondary-custom: ${secondaryColor}; }
        
        /* Animations élégantes */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.6); }
        }
        
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        
        @keyframes slideInFromBottom {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes blinkSoft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.98); }
        }
        
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fadeInLeft { animation: fadeInLeft 0.8s ease-out forwards; }
        .animate-fadeInRight { animation: fadeInRight 0.8s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.6s ease-out forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 2s infinite; }
        .animate-bounceIn { animation: bounceIn 0.6s ease-out forwards; }
        .animate-slideInFromBottom { animation: slideInFromBottom 0.8s ease-out forwards; }
        .animate-blinkSoft { animation: blinkSoft 4s ease-in-out infinite; }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.25); }
        
        .gradient-text { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        
        .admin-card { transition: all 0.3s ease; }
        .admin-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 25px 30px -12px rgba(0, 0, 0, 0.3); }
        
        .cycle-item { transition: all 0.3s ease; cursor: pointer; }
        .cycle-item:hover { transform: translateX(8px); border-color: ${primaryColor}; background: ${primaryColor}10; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .feature-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .feature-card:hover { transform: translateY(-8px) scale(1.05); }
        
        .testimonial-card { transition: all 0.3s ease; }
        .testimonial-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 30px -15px rgba(0, 0, 0, 0.2); }
      `}</style>

      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<div className="h-16 bg-background" />}>
          <Header customConfig={activeConfig} />
        </Suspense>

        {isAuthenticated && currentUser?.role === "super_admin" && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounceIn">
            <Button
              size="lg"
              className="shadow-xl rounded-full px-6 gap-2 hover-lift"
              asChild
              style={{ backgroundColor: primaryColor, color: "#fff" }}
            >
              <Link to="/super-admin">
                <Settings className="w-5 h-5" /> Administration
              </Link>
            </Button>
          </div>
        )}

        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-bounceIn hover-lift"
            style={{ backgroundColor: primaryColor }}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}

        {/* Hero Section */}
        <section
          ref={heroRef}
          id="hero"
          className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Bannière"
                className="w-full h-full object-cover animate-scaleIn"
                loading="eager"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.parentElement)
                    e.target.parentElement.style.backgroundColor = primaryColor;
                }}
              />
            ) : (
              <div
                className="w-full h-full animate-scaleIn"
                style={{
                  backgroundColor: primaryColor,
                  backgroundImage: `radial-gradient(circle at 10% 20%, ${primaryColor}dd, ${secondaryColor}dd)`,
                }}
              ></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/70"></div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12">
            <div className="max-w-3xl">
              {logoUrl && (
                <div className={`mb-6 ${animated.hero ? "animate-fadeInUp delay-100" : "opacity-100"}`}>
                  <img src={logoUrl} alt={siteName} className="h-16 w-auto object-contain animate-float" loading="eager" />
                </div>
              )}
              
              <div className={`${animated.hero ? "animate-fadeInUp delay-100" : "opacity-100"}`}>
                <Badge
                  className={`mb-6 text-sm sm:text-base py-1 px-3 font-bold transition-all duration-1000 ease-in-out animate-blinkSoft`}
                  style={{
                    backgroundColor: activeConfig?.hero_badge_bg_color || primaryColor + "20",
                    color: activeConfig?.hero_badge_text_color || primaryColor,
                    borderColor: (activeConfig?.hero_badge_bg_color || primaryColor) + "40",
                  }}
                >
                  {activeConfig?.hero_badge_text || "Plateforme SaaS Multi-Tenant de Gestion Académique et Formation en Ligne"}
                </Badge>
              </div>
              
              <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${animated.hero ? "animate-fadeInUp delay-300" : "opacity-100"}`}>
                {siteName}
              </h1>
              
              <p className={`text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-2xl ${animated.hero ? "animate-fadeInUp delay-400" : "opacity-100"}`}>
                {siteDescription}
              </p>
              
              <div className={`flex flex-col sm:flex-row gap-4 ${animated.hero ? "animate-fadeInUp delay-500" : "opacity-100"}`}>
                {isAuthenticated ? (
                  <Button className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift animate-pulse-glow" asChild style={{ backgroundColor: primaryColor, color: "#fff" }}>
                    <Link to="/dashboard" className="flex items-center justify-center gap-2">
                      Aller au tableau de bord <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift animate-pulse-glow" asChild style={{ backgroundColor: primaryColor, color: "#fff" }}>
                      <Link to="/signup" className="flex items-center justify-center gap-2">
                        Commencer gratuitement <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift" asChild>
                      <Link to="/pricing" className="flex items-center justify-center gap-2">
                        Voir les tarifs
                      </Link>
                    </Button>
                    <Button variant="outline" className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift" asChild>
                      <Link to="/login" className="flex items-center justify-center">
                        Connexion
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section Catégories */}
        <section className="py-8 px-4 bg-background border-b animate-slideInFromBottom">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-wrap justify-center gap-4">
              {categories.map((cat, idx) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <Button
                    key={cat.id}
                    variant={isActive ? "default" : "outline"}
                    className={`gap-2 rounded-full px-6 transition-all duration-300 hover-lift ${
                      isActive ? `bg-gradient-to-r ${cat.color} text-white shadow-lg scale-105` : ""
                    } animate-fadeInUp delay-${idx * 100}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section Admins & Cycles */}
        <section ref={adminsRef} id="admins" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12 sm:mb-16">
              {isAuthenticated && displayAdmins.length === 1 ? (
                <>
                  <h2 className="mb-4 text-3xl font-bold text-foreground animate-fadeInUp">Votre formateur</h2>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeInUp delay-100">
                    Voici le formateur qui vous accompagne. Sélectionnez votre cycle de formation.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-4 text-3xl font-bold text-foreground animate-fadeInUp">
                    {selectedCategory === "all" && "Tous nos formateurs"}
                    {selectedCategory === "direct" && "Formateurs Concours direct"}
                    {selectedCategory === "professional" && "Formateurs Concours professionnel"}
                    {selectedCategory === "other" && "Formateurs Autres formations"}
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeInUp delay-100">
                    {selectedCategory === "all" && "Découvrez nos formateurs experts et sélectionnez le cycle qui correspond à vos objectifs"}
                    {selectedCategory === "direct" && "Préparez-vous efficacement aux concours directs"}
                    {selectedCategory === "professional" && "Spécialistes des concours professionnels"}
                    {selectedCategory === "other" && "Diversifiez vos compétences avec nos autres formations"}
                  </p>
                </>
              )}
            </div>
            {displayAdminsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : displayAdmins.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl animate-scaleIn">
                <UserCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium">Aucun formateur disponible dans cette catégorie</p>
                <p className="text-sm text-muted-foreground mt-1">Revenez plus tard ou explorez d'autres catégories</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayAdmins.map((admin, index) => (
                  <Card key={admin.id} className={`admin-card overflow-hidden ${animated.admins ? `animate-fadeInUp delay-${((index % 6) + 1) * 100}` : "opacity-100"}`}>
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-background hover-scale">
                        <AvatarImage src={admin.display_avatar_url} />
                        <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                          {admin.display_name?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-bold">{admin.display_name}</h3>
                      {admin.specialty && <Badge variant="secondary" className="mt-2">{admin.specialty}</Badge>}
                      {admin.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{admin.bio}</p>}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span className="text-sm">Cycles proposés</span>
                        </div>
                        <Badge variant="outline">{admin.cycles_count} formation(s)</Badge>
                      </div>
                      <div className="space-y-3">
                        {admin.cycles.map((cycle) => (
                          <div
                            key={cycle.id}
                            className="cycle-item p-3 rounded-lg border transition-all cursor-pointer hover:border-primary hover:bg-primary/5"
                            onClick={() => handleSelectCycle(admin.id, cycle.id, cycle.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-primary hover:text-primary/80 transition">{cycle.name}</p>
                                {cycle.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{cycle.description}</p>}
                                <Badge className="mt-1 text-xs" variant="outline">
                                  {cycle.category === "direct" && "Concours direct"}
                                  {cycle.category === "professional" && "Concours professionnel"}
                                  {cycle.category === "other" && "Autre formation"}
                                </Badge>
                              </div>
                              <ChevronRight className="h-5 w-5 text-primary/50 group-hover:text-primary transition" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section Marketing */}
        {sections.marketing !== false && marketingFeatures.length > 0 && (
          <section ref={marketingRef} id="marketing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <Badge 
                  className="mb-5 text-sm sm:text-base py-1 px-3 text-white animate-scaleIn" 
                  style={{ 
                    backgroundColor: secondaryColor,
                    borderColor: secondaryColor
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1 inline" /> 
                  Pourquoi passer à PRO ?
                </Badge>
                <h2 className="mb-4 text-3xl md:text-4xl font-bold animate-fadeInUp">
                  <span className="text-gray-200">Tout ce dont vous avez besoin pour</span>{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-bold drop-shadow-lg animate-float">
                    réussir
                  </span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeInUp delay-100">
                  Découvrez les avantages exclusifs réservés aux abonnés PRO
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {marketingFeatures.map((feature, idx) => {
                  const IconComponent = getIcon(feature.icon);
                  return (
                    <Card key={idx} className={`group hover:shadow-xl transition-all duration-500 hover-lift overflow-hidden feature-card ${animated.marketing ? `animate-fadeInUp delay-${((idx % 8) + 1) * 100}` : "opacity-100"}`}>
                      <div className={`h-1 w-full bg-gradient-to-r ${feature.color || "from-blue-500 to-cyan-500"} group-hover:h-1.5 transition-all duration-300`} />
                      <CardContent className="pt-6 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color || "from-blue-500 to-cyan-500"} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}>
                          {IconComponent}
                        </div>
                        <Badge className="mb-3" variant="secondary">{feature.badge}</Badge>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {offer.enabled && (
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center text-white ${animated.marketing ? "animate-scaleIn delay-600" : "opacity-100"} hover-lift`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse-glow" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 animate-pulse-glow" />
                  <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-200 animate-float" />
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">{offer.title}</h3>
                  <p className="text-lg mb-4 opacity-90">{offer.subtitle}</p>
                  <Button size="lg" className="bg-white text-amber-600 hover:bg-gray-100 shadow-lg hover-lift" asChild>
                    <Link to="/subscription">{offer.buttonText} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></Link>
                  </Button>
                  <p className="text-xs mt-4 opacity-75">Offre valable pour tout nouvel abonnement</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section Features */}
        {sections.features !== false && (
          <section ref={featuresRef} id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/50 border-y">
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="mb-4 text-3xl font-bold text-foreground animate-fadeInUp">Une plateforme complète pour réussir</h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeInUp delay-100">
                  Tous les outils et ressources nécessaires pour une préparation efficace
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6 rounded-2xl bg-card border border-primary/10 hover-lift feature-card animate-fadeInUp delay-200">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Bibliothèque complète</h3>
                  <p className="text-muted-foreground">Accès à des centaines de ressources pédagogiques</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-card border border-secondary/10 hover-lift feature-card animate-fadeInUp delay-400">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Video className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Sessions Live</h3>
                  <p className="text-muted-foreground">Cours en direct avec des formateurs expérimentés</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-card border border-accent/10 hover-lift feature-card animate-fadeInUp delay-600">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Chat en direct</h3>
                  <p className="text-muted-foreground">Échangez en temps réel avec votre communauté</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section Témoignages avec défilement automatique */}
        {sections.testimonials !== false && testimonials.length > 0 && (
          <section ref={testimonialsRef} id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <Badge className="mb-4 animate-scaleIn" variant="secondary">
                  <Star className="w-3 h-3 mr-1 inline fill-current" /> Ils nous font confiance
                </Badge>
                <h2 className="mb-4 text-3xl font-bold text-foreground animate-fadeInUp">Ce que disent nos apprenants</h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeInUp delay-100">
                  Des centaines de candidats ont déjà réussi leur concours grâce à nous
                </p>
              </div>
              
              <AutoScrollCarousel testimonials={testimonials} />
            </div>
          </section>
        )}

        {/* PRO Section - Call to Action */}
        <section ref={proRef} id="pro" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-secondary/10">
          <div className="container mx-auto max-w-7xl text-center">
            <Badge className="mb-5 text-sm sm:text-base py-1 px-3 font-bold text-white animate-scaleIn" style={{ backgroundColor: secondaryColor + "20", borderColor: secondaryColor + "40" }}>
              <Crown className="w-3 h-3 mr-1 inline text-white" /> Passez à la vitesse supérieure
            </Badge>
            <h2 className="mb-4 text-3xl md:text-4xl font-bold animate-fadeInUp">
              Prêt à <span className="gradient-text">réussir</span> votre concours ?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fadeInUp delay-100">
              Rejoignez des milliers d'apprenants qui ont déjà choisi SIGEF
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fadeInUp delay-200">
              <Button size="lg" className="min-h-12 text-base px-8 hover-lift animate-pulse-glow" asChild style={{ backgroundColor: primaryColor, color: "#fff" }}>
                <Link to="/subscription" className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5" /> Commencer mon abonnement PRO <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="min-h-12 text-base px-8 hover-lift" asChild>
                <Link to="/pricing">Découvrir nos packs</Link>
              </Button>
              {!isAuthenticated && (
                <Button variant="outline" size="lg" className="min-h-12 text-base px-8 hover-lift" asChild>
                  <Link to="/signup">Créer un compte gratuit</Link>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-6 animate-fadeInUp delay-300">Sans engagement - Annulation à tout moment</p>
          </div>
        </section>

        <Suspense fallback={<div className="h-32 bg-background" />}>
          <Footer customConfig={activeConfig} />
        </Suspense>
      </div>
    </>
  );
};

export default HomePage;