// src/components/Header.jsx - Version avec navigation masquée en mode admin public
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useAdminConfig } from "@/contexts/AdminConfigContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Menu, X, LogOut, User, Shield, Crown } from "lucide-react";
import NotificationCenter from "@/components/live/NotificationCenter.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { supabase, getFileUrl } from "@/lib/supabaseClient.js";

const Header = ({ customConfig }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminId: urlAdminId } = useParams();
  const { currentUser, logout, isAuthenticated } = useAuth();
  const { config: contextConfig } = useAdminConfig();
  
  const config = customConfig || contextConfig;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [userProStatus, setUserProStatus] = useState(false);
  const [userProExpiry, setUserProExpiry] = useState(null);

  // Détection du contexte admin
  const getAdminIdFromPath = () => {
    const match = location.pathname.match(/^\/admin\/([^\/]+)/);
    return match ? match[1] : null;
  };
  
  const adminId = urlAdminId || getAdminIdFromPath();
  const isAdminPublicView = !!adminId;
  
  // Configuration
  const siteName = config?.site_name || "SIGEF";
  const logoUrl = config?.site_logo_url || config?.site_logo ? 
    (config.site_logo_url || getFileUrl("sessions", config.site_logo)) : 
    null;
  const primaryColor = config?.site_color_primary || "#1a56db";

  // Fonction pour obtenir le lien du dashboard
  const getDashboardLink = () => {
    if (!currentUser) return "/dashboard";
    switch (currentUser.role) {
      case "super_admin":
        return "/super-admin";
      case "admin":
        return "/admin";
      case "formateur":
        return "/formateur";
      default:
        return "/apprenant";
    }
  };

  const getAdminPrefixedLink = (path) => {
    if (isAdminPublicView && adminId) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `/admin/${adminId}/${cleanPath}`;
    }
    return path;
  };

  const homeLink = isAdminPublicView ? `/admin/${adminId}` : "/";
  const pricingLink = getAdminPrefixedLink("/pricing");
  const signupLink = getAdminPrefixedLink("/signup");
  const loginLink = getAdminPrefixedLink("/login");
  const subscriptionLink = getAdminPrefixedLink("/subscription");
  const dashboardLink = isAdminPublicView ? `/admin/${adminId}/dashboard` : getDashboardLink();

  const fetchUserProStatus = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("pro_status, pro_expiry")
        .eq("id", currentUser.id)
        .single();
      if (!error && data) {
        setUserProStatus(data.pro_status === true);
        setUserProExpiry(data.pro_expiry);
      } else {
        setUserProStatus(currentUser?.pro_status === true);
        setUserProExpiry(currentUser?.pro_expiry);
      }
    } catch (err) {
      console.error("Erreur récupération statut PRO:", err);
      setUserProStatus(currentUser?.pro_status === true);
      setUserProExpiry(currentUser?.pro_expiry);
    }
  };

  useEffect(() => {
    fetchUserProStatus();
    const interval = setInterval(fetchUserProStatus, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isProActive = userProStatus === true && (!userProExpiry || new Date(userProExpiry) > new Date());

  const handleLogout = async () => {
    await logout();
    if (isAdminPublicView && adminId) {
      navigate(`/admin/${adminId}`);
    } else {
      navigate("/");
    }
    setIsMenuOpen(false);
  };

  const handleProClick = () => {
    if (!isAuthenticated) {
      navigate(loginLink);
      return;
    }
    if (isProActive) {
      setShowRenewModal(true);
    } else {
      navigate(subscriptionLink);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  // 🔥 Navigation items - complètement vide en mode admin public
  const navItems = isAdminPublicView ? [] : [
    { label: "Formations", href: "/#admins" },
    { label: "Tarifs", href: "/pricing" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md shadow-md"
            : "bg-background"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={homeLink} className="flex items-center space-x-2">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
              ) : (
                <Shield className="h-8 w-8" style={{ color: primaryColor }} />
              )}
              <span className="font-bold text-xl hidden sm:inline">
                {siteName}
              </span>
              <span className="font-bold text-lg sm:hidden">
                {siteName.substring(0, 3)}
              </span>
            </Link>

            {/* 🔥 Navigation desktop - complètement masquée en mode admin public */}
            {!isAdminPublicView && (
              <nav className="hidden md:flex items-center space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleProClick}
                  className="text-muted-foreground hover:text-primary transition flex items-center gap-1"
                >
                  <Crown className="w-4 h-4" />
                  PRO
                </button>
              </nav>
            )}

            <div className="flex items-center space-x-4">
              <NotificationCenter />

              {/* 🔥 Boutons droite - masqués en mode admin public sauf si connecté */}
              {!isAdminPublicView && (
                <div className="hidden md:flex items-center space-x-4">
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-4">
                      <Link to={dashboardLink}>
                        <Button variant="outline" size="sm">
                          <User className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </Button>
                      {isProActive && (
                        <div className="flex items-center text-yellow-600">
                          <Crown className="w-4 h-4 mr-1" />
                          <span className="text-xs font-semibold">PRO</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Link to={loginLink}>
                        <Button variant="ghost" size="sm">
                          Connexion
                        </Button>
                      </Link>
                      <Link to={signupLink}>
                        <Button size="sm">Inscription</Button>
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* 🔥 Menu burger - masqué en mode admin public sauf si connecté */}
              {(!isAdminPublicView || isAuthenticated) && (
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Menu mobile - uniquement visible en mode normal ou si connecté en vue admin */}
      {(!isAdminPublicView || isAuthenticated) && (
        <div
          className={`fixed inset-0 z-50 transition-all duration-300 ${
            isMenuOpen ? "visible" : "invisible"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMenu}
          />

          <div
            className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-out ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-bold text-lg">{siteName}</span>
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-full hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
                {!isAdminPublicView && (
                  <>
                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        onClick={closeMenu}
                        className="block py-3 px-4 text-lg font-medium rounded-xl hover:bg-muted transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        closeMenu();
                        handleProClick();
                      }}
                      className="w-full text-left py-3 px-4 text-lg font-medium rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Crown className="w-5 h-5" />
                      PRO
                    </button>
                  </>
                )}

                <div className="border-t my-4 pt-4 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to={dashboardLink}
                        onClick={closeMenu}
                        className="block py-3 px-4 text-lg font-medium rounded-xl hover:bg-muted transition-colors"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left py-3 px-4 text-lg font-medium rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        Déconnexion
                      </button>
                      {isProActive && (
                        <div className="flex items-center gap-2 px-4 py-2 text-yellow-600">
                          <Crown className="w-5 h-5" />
                          <span className="text-sm font-semibold">PRO actif</span>
                        </div>
                      )}
                    </>
                  ) : (
                    !isAdminPublicView && (
                      <>
                        <Link
                          to={loginLink}
                          onClick={closeMenu}
                          className="block py-3 px-4 text-lg font-medium rounded-xl hover:bg-muted transition-colors"
                        >
                          Connexion
                        </Link>
                        <Link
                          to={signupLink}
                          onClick={closeMenu}
                          className="block py-3 px-4 text-lg font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center"
                        >
                          Inscription
                        </Link>
                      </>
                    )
                  )}
                </div>
              </nav>

              <div className="p-4 border-t text-xs text-muted-foreground text-center">
                {siteName} &copy; {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Vous êtes déjà abonné PRO
            </DialogTitle>
            <DialogDescription>
              Votre abonnement est actuellement actif. Souhaitez-vous le
              renouveler avant son expiration&nbsp;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRenewModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setShowRenewModal(false);
                navigate(subscriptionLink);
              }}
            >
              Renouveler mon abonnement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;