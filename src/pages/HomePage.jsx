// src/pages/HomePage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
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

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const { config, loading: configLoading } = useAdminConfig();
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all', 'direct', 'professional', 'other'
  const [animated, setAnimated] = useState({
    hero: false,
    admins: false,
    features: false,
    pro: false,
    marketing: false,
    testimonials: false,
  });

  // Références pour le carrousel des témoignages
  const testimonialsRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const heroRef = useRef(null);
  const adminsRef = useRef(null);
  const featuresRef = useRef(null);
  const proRef = useRef(null);
  const marketingRef = useRef(null);

  // Catégories disponibles
  const categories = [
    { id: "all", label: "Tous les cycles", icon: Sparkle, color: "from-gray-500 to-gray-400" },
    { id: "direct", label: "Concours direct", icon: GraduationCap, color: "from-blue-600 to-blue-400" },
    { id: "professional", label: "Concours professionnel", icon: Briefcase, color: "from-green-600 to-green-400" },
    { id: "other", label: "Autres formations", icon: Sparkles, color: "from-purple-600 to-purple-400" },
  ];

  // Récupération des admins avec leurs cycles (et personnalisation)
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

      // Infos de base des admins
      const { data: adminsData, error: adminsError } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, bio, specialty")
        .in("id", adminIds);
      if (adminsError) throw adminsError;

      // Configurations personnalisées (nom du site, logo)
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

  useEffect(() => {
    const loadAdmins = async () => {
      setAdminsLoading(true);
      const adminsResult = await fetchAdminsWithCycles();
      setAdmins(adminsResult);
      setAdminsLoading(false);
    };
    loadAdmins();
  }, [fetchAdminsWithCycles]);

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

  // Fonctions de navigation du carrousel
  const scrollTestimonials = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // largeur d'une carte + gap
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  if (configLoading && !config) {
    return (
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<div className="h-16 bg-background" />}>
          <Header />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Suspense fallback={<div className="h-32 bg-background" />}>
          <Footer />
        </Suspense>
      </div>
    );
  }

  const siteName = config?.site_name || "SIGEF";
  const siteDescription =
    config?.site_description || "Rejoignez des milliers de candidats...";
  const primaryColor = config?.site_color_primary || "#1a56db";
  const secondaryColor = config?.site_color_secondary || "#7e3af2";
  const bannerUrl = config?.site_banner_url || null;
  const logoUrl = config?.site_logo_url || null;

  // Données dynamiques
  const marketingFeatures = config?.home_marketing_features || [];
  const testimonials = config?.home_testimonials || [];
  const sections = config?.home_sections || {
    features: true,
    testimonials: true,
    marketing: true,
  };
  const offer = {
    enabled: config?.marketing_offer_enabled ?? true,
    title: config?.marketing_offer_title || "Offre Spéciale -20%",
    subtitle:
      config?.marketing_offer_subtitle ||
      "Profitez de -20% sur votre premier mois d'abonnement PRO",
    buttonText: config?.marketing_offer_button_text || "Je profite de l'offre",
  };

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? (
      <IconComponent className="h-8 w-8" />
    ) : (
      <Crown className="h-8 w-8" />
    );
  };

  return (
    <>
      <Helmet>
        <title>{siteName} - Préparation aux Concours directs et Professionnels</title>
        <meta name="description" content={siteDescription} />
        <meta name="theme-color" content={primaryColor} />
      </Helmet>
      <style>{`
        :root { --primary-custom: ${primaryColor}; --secondary-custom: ${secondaryColor}; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); } 50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); } }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fadeInLeft { animation: fadeInLeft 0.6s ease-out forwards; }
        .animate-fadeInRight { animation: fadeInRight 0.6s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.15); }
        .gradient-text { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .admin-card { transition: all 0.3s ease; }
        .admin-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.2); }
        .cycle-item { transition: all 0.2s ease; cursor: pointer; }
        .cycle-item:hover { transform: translateX(5px); border-color: ${primaryColor}; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<div className="h-16 bg-background" />}>
          <Header />
        </Suspense>

        {isAuthenticated && currentUser?.role === "super_admin" && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp">
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
            className="fixed bottom-6 left-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-fadeInUp hover-lift"
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
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.parentElement)
                    e.target.parentElement.style.backgroundColor = primaryColor;
                }}
              />
            ) : (
              <div
                className="w-full h-full"
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
                <div
                  className={`mb-6 ${animated.hero ? "animate-fadeInUp delay-100" : "opacity-100"}`}
                >
                  <img
                    src={logoUrl}
                    alt={siteName}
                    className="h-16 w-auto object-contain"
                    loading="eager"
                  />
                </div>
              )}
            <div
  className={`${animated.hero ? "animate-fadeInUp delay-100" : "opacity-100"}`}
>
  <Badge
    className="mb-6 text-sm sm:text-base py-1 px-3 font-bold"
    style={{
      backgroundColor: config?.hero_badge_bg_color || primaryColor + "20",
      color: config?.hero_badge_text_color || primaryColor,
      borderColor: (config?.hero_badge_bg_color || primaryColor) + "40",
    }}
  >
    {config?.hero_badge_text || "Plateforme SaaS Multi-Tenant de Gestion Académique et Formation en Ligne"}
  </Badge>
</div>
              <h1
                className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${animated.hero ? "animate-fadeInUp delay-300" : "opacity-100"}`}
              >
                {siteName}
              </h1>
              <p
                className={`text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-2xl ${animated.hero ? "animate-fadeInUp delay-400" : "opacity-100"}`}
              >
                {siteDescription}
              </p>
              <div
                className={`flex flex-col sm:flex-row gap-4 ${animated.hero ? "animate-fadeInUp delay-500" : "opacity-100"}`}
              >
                {isAuthenticated ? (
                  <Button
                    className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift"
                    asChild
                    style={{ backgroundColor: primaryColor, color: "#fff" }}
                  >
                    <Link
                      to="/dashboard"
                      className="flex items-center justify-center gap-2"
                    >
                      Aller au tableau de bord{" "}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift animate-pulse-glow"
                      asChild
                      style={{ backgroundColor: primaryColor, color: "#fff" }}
                    >
                      <Link
                        to="/signup"
                        className="flex items-center justify-center gap-2"
                      >
                        Commencer gratuitement{" "}
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift"
                      asChild
                    >
                      <Link
                        to="/pricing"
                        className="flex items-center justify-center gap-2"
                      >
                        Voir les tarifs
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-12 text-base w-full sm:w-auto px-8 hover-lift"
                      asChild
                    >
                      <Link
                        to="/login"
                        className="flex items-center justify-center"
                      >
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
        <section className="py-8 px-4 bg-background border-b">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-wrap justify-center gap-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <Button
                    key={cat.id}
                    variant={isActive ? "default" : "outline"}
                    className={`gap-2 rounded-full px-6 transition-all duration-300 ${
                      isActive ? `bg-gradient-to-r ${cat.color} text-white shadow-lg scale-105` : ""
                    }`}
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
        <section
          ref={adminsRef}
          id="admins"
          className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-background"
        >
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12 sm:mb-16">
              {isAuthenticated && admins.length === 1 ? (
                <>
                  <h2 className="mb-4 text-3xl font-bold text-foreground">
                    Votre formateur
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                    Voici le formateur qui vous accompagne. Sélectionnez votre
                    cycle de formation.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-4 text-3xl font-bold text-foreground">
                    {selectedCategory === "all" && "Tous nos formateurs"}
                    {selectedCategory === "direct" && "Formateurs Concours direct"}
                    {selectedCategory === "professional" && "Formateurs Concours professionnel"}
                    {selectedCategory === "other" && "Formateurs Autres formations"}
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                    {selectedCategory === "all" && "Découvrez nos formateurs experts et sélectionnez le cycle qui correspond à vos objectifs"}
                    {selectedCategory === "direct" && "Préparez-vous efficacement aux concours directs"}
                    {selectedCategory === "professional" && "Spécialistes des concours professionnels"}
                    {selectedCategory === "other" && "Diversifiez vos compétences avec nos autres formations"}
                  </p>
                </>
              )}
            </div>
            {adminsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl">
                <UserCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium">
                  Aucun formateur disponible dans cette catégorie
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Revenez plus tard ou explorez d'autres catégories
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {admins.map((admin, index) => (
                  <Card
                    key={admin.id}
                    className={`admin-card overflow-hidden ${animated.admins ? `animate-fadeInUp delay-${((index % 6) + 1) * 100}` : "opacity-100"}`}
                  >
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-background">
                        <AvatarImage src={admin.display_avatar_url} />
                        <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                          {admin.display_name?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-bold">
                        {admin.display_name}
                      </h3>
                      {admin.specialty && (
                        <Badge variant="secondary" className="mt-2">
                          {admin.specialty}
                        </Badge>
                      )}
                      {admin.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {admin.bio}
                        </p>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span className="text-sm">Cycles proposés</span>
                        </div>
                        <Badge variant="outline">
                          {admin.cycles_count} formation(s)
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {admin.cycles.map((cycle) => (
                          <div
                            key={cycle.id}
                            className="cycle-item p-3 rounded-lg border transition-all cursor-pointer hover:border-primary hover:bg-primary/5"
                            onClick={() =>
                              handleSelectCycle(admin.id, cycle.id, cycle.name)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-primary hover:text-primary/80 transition">
                                  {cycle.name}
                                </p>
                                {cycle.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {cycle.description}
                                  </p>
                                )}
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

        {/* Section Marketing (avantages PRO) - dynamique */}
        {sections.marketing !== false && marketingFeatures.length > 0 && (
          <section
            ref={marketingRef}
            id="marketing"
            className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"
          >
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <Badge
                  className="mb-5 text-sm sm:text-base py-1 px-3"
                  style={{
                    backgroundColor: secondaryColor + "20",
                    color: secondaryColor,
                    borderColor: secondaryColor + "40",
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1 inline" /> Pourquoi passer à
                  PRO ?
                </Badge>
                <h2 className="mb-4 text-3xl md:text-4xl font-bold">
                  Tout ce dont vous avez besoin pour{" "}
                  <span className="gradient-text">réussir</span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Découvrez les avantages exclusifs réservés aux abonnés PRO
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {marketingFeatures.map((feature, idx) => {
                  const IconComponent = getIcon(feature.icon);
                  return (
                    <Card
                      key={idx}
                      className={`group hover:shadow-xl transition-all duration-500 hover-lift overflow-hidden ${animated.marketing ? `animate-fadeInUp delay-${((idx % 8) + 1) * 100}` : "opacity-100"}`}
                    >
                      <div
                        className={`h-1 w-full bg-gradient-to-r ${feature.color || "from-blue-500 to-cyan-500"}`}
                      />
                      <CardContent className="pt-6 text-center">
                        <div
                          className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color || "from-blue-500 to-cyan-500"} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        >
                          {IconComponent}
                        </div>
                        <Badge className="mb-3" variant="secondary">
                          {feature.badge}
                        </Badge>
                        <h3 className="text-xl font-bold mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {offer.enabled && (
                <div
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center text-white ${animated.marketing ? "animate-scaleIn delay-600" : "opacity-100"}`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                  <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-200" />
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    {offer.title}
                  </h3>
                  <p className="text-lg mb-4 opacity-90">{offer.subtitle}</p>
                  <Button
                    size="lg"
                    className="bg-white text-amber-600 hover:bg-gray-100 shadow-lg"
                    asChild
                  >
                    <Link to="/subscription">
                      {offer.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs mt-4 opacity-75">
                    Offre valable pour tout nouvel abonnement
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section Features (trois piliers) */}
        {sections.features !== false && (
          <section
            ref={featuresRef}
            id="features"
            className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/50 border-y"
          >
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Une plateforme complète pour réussir
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Tous les outils et ressources nécessaires pour une préparation
                  efficace
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6 rounded-2xl bg-card border border-primary/10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Bibliothèque complète
                  </h3>
                  <p className="text-muted-foreground">
                    Accès à des centaines de ressources pédagogiques
                  </p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-card border border-secondary/10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Video className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Sessions Live</h3>
                  <p className="text-muted-foreground">
                    Cours en direct avec des formateurs expérimentés
                  </p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-card border border-accent/10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Chat en direct</h3>
                  <p className="text-muted-foreground">
                    Échangez en temps réel avec votre communauté
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section Témoignages - Carrousel interactif */}
        {sections.testimonials !== false && testimonials.length > 0 && (
          <section
            ref={testimonialsRef}
            id="testimonials"
            className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
          >
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16">
                <Badge className="mb-4" variant="secondary">
                  <Star className="w-3 h-3 mr-1 inline fill-current" /> Ils nous
                  font confiance
                </Badge>
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Ce que disent nos apprenants
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Des centaines de candidats ont déjà réussi leur concours grâce
                  à nous
                </p>
              </div>

              <div className="relative group">
                {/* Bouton gauche */}
                <button
                  onClick={() => scrollTestimonials("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-gray-700"
                  aria-label="Témoignage précédent"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Conteneur défilant */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto scroll-smooth snap-mandatory snap-x flex gap-6 pb-4 hide-scrollbar"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {testimonials.map((testimonial, idx) => (
                    <div
                      key={idx}
                      className="snap-start shrink-0 w-80 md:w-96 bg-card rounded-xl p-6 shadow-lg border hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {testimonial.avatar || testimonial.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < testimonial.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground italic leading-relaxed">
                        "{testimonial.content}"
                      </p>
                    </div>
                  ))}
                </div>

                {/* Bouton droit */}
                <button
                  onClick={() => scrollTestimonials("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-gray-700"
                  aria-label="Témoignage suivant"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PRO Section - Call to Action */}
        <section
          ref={proRef}
          id="pro"
          className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-secondary/10"
        >
          <div className="container mx-auto max-w-7xl text-center">
            <Badge
              className="mb-5 text-sm sm:text-base py-1 px-3 font-bold text-white"
              style={{
                backgroundColor: secondaryColor + "20",
                borderColor: secondaryColor + "40",
              }}
            >
              <Crown className="w-3 h-3 mr-1 inline text-white" /> Passez à la
              vitesse supérieure
            </Badge>
            <h2 className="mb-4 text-3xl md:text-4xl font-bold">
              Prêt à <span className="gradient-text">réussir</span> votre
              concours ?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Rejoignez des milliers d'apprenants qui ont déjà choisi SIGEF
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="min-h-12 text-base px-8 hover-lift animate-pulse-glow"
                asChild
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                <Link
                  to="/subscription"
                  className="flex items-center justify-center gap-2"
                >
                  <Crown className="h-5 w-5" /> Commencer mon abonnement PRO{" "}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-12 text-base px-8 hover-lift"
                asChild
              >
                <Link to="/pricing">Découvrir nos packs</Link>
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-12 text-base px-8 hover-lift"
                  asChild
                >
                  <Link to="/signup">Créer un compte gratuit</Link>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Sans engagement - Annulation à tout moment
            </p>
          </div>
        </section>

        <Suspense fallback={<div className="h-32 bg-background" />}>
          <Footer />
        </Suspense>
      </div>
    </>
  );
};

export default HomePage;