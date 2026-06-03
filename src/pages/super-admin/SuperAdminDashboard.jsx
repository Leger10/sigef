// src/pages/super-admin/SuperAdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Shield,
  Users,
  Layers,
  CreditCard,
  DollarSign,
  BookOpen,
  BarChart3,
  Bell,
  Cog,
  LogOut,
  Menu,
  X,
  Home,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile.jsx";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import CycleChat from "@/components/apprenant/CycleChat.jsx";

// Import Modules
import GlobalStats from "./GlobalStats.jsx";
import UsersManagement from "./UsersManagement.jsx";
import AllCyclesManagement from "./AllCyclesManagement.jsx";
import AllSubscriptionsManagement from "./AllSubscriptionsManagement.jsx";
import AllPaymentsManagement from "./AllPaymentsManagement.jsx";
import ActivityLogs from "./ActivityLogs.jsx";
import PlatformConfig from "./PlatformConfig.jsx";
import ContactRequests from "./ContactRequests.jsx";

const SuperAdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeModule, setActiveModule] = useState("stats");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalFormateurs: 0,
    totalApprenants: 0,
    totalCycles: 0,
    totalSubscriptions: 0,
    totalPayments: 0,
    revenue: 0,
  });

  // États pour le chat flottant
  const [chatOpen, setChatOpen] = useState(false);
  const [cyclesList, setCyclesList] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Récupérer le nombre de messages non lus pour le cycle sélectionné
  const fetchUnreadMessagesCount = async (cycleId) => {
    if (!cycleId || !currentUser?.id) return;
    const storageKey = `chat_last_read_${cycleId}_${currentUser.id}`;
    const lastRead = localStorage.getItem(storageKey);
    const lastReadDate = lastRead ? lastRead : "2000-01-01T00:00:00.000Z";

    const { count, error } = await supabase
      .from("cycle_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .neq("user_id", currentUser.id)
      .gt("created_at", lastReadDate);

    if (!error) {
      setUnreadMessagesCount(count || 0);
    } else {
      console.error("Erreur comptage messages non lus:", error);
    }
  };

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!currentUser || currentUser.role !== "super_admin") {
        navigate("/dashboard");
        return;
      }
      await loadStats();
      await loadCycles();
      setIsLoading(false);
    };
    checkSuperAdmin();
  }, [currentUser, navigate]);

  const loadStats = async () => {
    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*");
      if (usersError) throw usersError;

      const { data: cycles } = await supabase
        .from("cycles")
        .select("id", { count: "exact" });
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact" });
      const { data: payments } = await supabase
        .from("transactions")
        .select("amount");

      const userRoles = users || [];

      setStats({
        totalUsers: userRoles.length,
        totalAdmins: userRoles.filter(
          (u) => u.role === "admin" || u.role === "super_admin",
        ).length,
        totalFormateurs: userRoles.filter((u) => u.role === "formateur").length,
        totalApprenants: userRoles.filter((u) => u.role === "apprenant").length,
        totalCycles: cycles?.length || 0,
        totalSubscriptions: subscriptions?.length || 0,
        totalPayments: payments?.length || 0,
        revenue: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setCyclesList(data || []);
      if (data && data.length > 0) {
        const firstCycleId = data[0].id;
        setSelectedCycleId(firstCycleId);
        await fetchUnreadMessagesCount(firstCycleId);
      }
    } catch (error) {
      console.error("Error loading cycles:", error);
      toast.error("Impossible de charger la liste des cycles");
    } finally {
      setLoadingCycles(false);
    }
  };

  // Mettre à jour le compteur quand le cycle change
  useEffect(() => {
    if (selectedCycleId) {
      fetchUnreadMessagesCount(selectedCycleId);
      const interval = setInterval(() => {
        fetchUnreadMessagesCount(selectedCycleId);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedCycleId]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Déconnexion réussie");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleNavClick = (moduleId) => {
    setActiveModule(moduleId);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const handleCycleChange = (cycleId) => {
    setSelectedCycleId(cycleId);
    setUnreadMessagesCount(0); // reset visuel avant rechargement
  };

  // Callback pour mettre à jour le compteur depuis CycleChat
  const handleUnreadCountChange = (newCount) => {
    setUnreadMessagesCount(newCount);
  };

  const navItems = [
    {
      id: "stats",
      label: "Statistiques",
      icon: BarChart3,
      description: "Vue d'ensemble de la plateforme",
    },
    {
      id: "users",
      label: "Tous les utilisateurs",
      icon: Users,
      description: "Gérer tous les utilisateurs",
    },
    {
      id: "admins",
      label: "Administrateurs",
      icon: Shield,
      description: "Gérer les administrateurs",
    },
    {
      id: "formateurs",
      label: "Formateurs",
      icon: BookOpen,
      description: "Gérer les formateurs",
    },
    {
      id: "cycles",
      label: "Cycles",
      icon: Layers,
      description: "Gérer les cycles de formation",
    },
    {
      id: "subscriptions",
      label: "Abonnements",
      icon: CreditCard,
      description: "Gérer les abonnements",
    },
    {
      id: "payments",
      label: "Paiements",
      icon: DollarSign,
      description: "Historique des paiements",
    },
    {
      id: "contacts",
      label: "Demandes de contact",
      icon: Mail,
      description: "Gérer les demandes des prospects",
    },
    {
      id: "logs",
      label: "Logs d'activité",
      icon: Bell,
      description: "Consulter les logs système",
    },
    {
      id: "config",
      label: "Configuration",
      icon: Cog,
      description: "Paramètres de la plateforme",
    },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case "stats":
        return <GlobalStats stats={stats} onRefresh={loadStats} />;
      case "users":
        return <UsersManagement initialRoleFilter="all" key="all-users" />;
      case "admins":
        return <UsersManagement initialRoleFilter="admin" key="admins" />;
      case "formateurs":
        return (
          <UsersManagement initialRoleFilter="formateur" key="formateurs" />
        );
      case "cycles":
        return <AllCyclesManagement />;
      case "subscriptions":
        return <AllSubscriptionsManagement />;
      case "payments":
        return <AllPaymentsManagement />;
      case "contacts":
        return <ContactRequests />;
      case "logs":
        return <ActivityLogs />;
      case "config":
        return <PlatformConfig />;
      default:
        return <GlobalStats stats={stats} onRefresh={loadStats} />;
    }
  };

  if (!currentUser || currentUser.role !== "super_admin") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">
            Chargement du tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  const currentNavItem = navItems.find((i) => i.id === activeModule);
  const selectedCycle = cyclesList.find((c) => c.id === selectedCycleId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/5 pb-16 md:pb-0">
      <Helmet>
        <title>{currentNavItem?.label || "Super Admin"} - SIGEF</title>
      </Helmet>

      {/* Header */}
      <header className="h-16 border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  SIGEF
                </span>
                <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                {currentUser?.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              asChild
            >
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:ml-2 sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar avec scroll et structure flexible */}
        <aside
          className={`
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 transition-transform duration-300 ease-in-out
          fixed md:relative z-40 w-72 bg-card border-r border-border 
          h-[calc(100vh-64px)] overflow-hidden shadow-lg md:shadow-none
          flex flex-col
        `}
        >
          {/* Profil utilisateur - fixe en haut */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  {currentUser?.full_name?.charAt(0) || "S"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {currentUser?.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Super Administrateur
                </p>
              </div>
            </div>
          </div>

          {/* Zone de navigation scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                      ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "group-hover:text-primary"}`}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && (
                      <div className="w-1 h-6 bg-primary-foreground/30 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer version & copyright - fixe en bas */}
          <div className="flex-shrink-0 p-4 border-t border-border bg-muted/10 text-center">
            <p className="text-xs text-muted-foreground">Version 2.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">© 2025 SIGEF</p>
          </div>
        </aside>

        {/* Overlay pour mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-muted/5 to-muted/10 p-4 sm:p-6 lg:p-8 h-[calc(100vh-64px)]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {currentNavItem?.label}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {currentNavItem?.description}
                  </p>
                </div>
                {activeModule === "stats" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStats}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Rafraîchir
                  </Button>
                )}
              </div>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Bouton flottant du chat avec badge */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {!loadingCycles && cyclesList.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm shadow-md gap-1 mb-1"
              >
                {selectedCycle?.name || "Cycle"}{" "}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-64 overflow-y-auto"
            >
              {cyclesList.map((cycle) => (
                <DropdownMenuItem
                  key={cycle.id}
                  onClick={() => handleCycleChange(cycle.id)}
                >
                  {cycle.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="relative">
          <Button
            variant="outline"
            className="rounded-full shadow-lg bg-primary text-white hover:bg-primary/90 chat-attract"
            onClick={() => setChatOpen(!chatOpen)}
            disabled={!selectedCycleId}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
            </span>
          )}
        </div>
      </div>

      {/* Fenêtre du chat */}
      {chatOpen && selectedCycleId && (
           <div className="fixed bottom-28 right-4 z-50 w-96 h-[500px] bg-background border rounded-xl shadow-2xl">
            <div className="flex justify-between items-center p-3 border-b bg-primary text-white rounded-t-xl">
              <h3 className="font-semibold">
              Chat du cycle : {selectedCycle?.name || "?"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-primary/80"
            >
              ✕
            </Button>
          </div>
          <CycleChat
            cycleId={selectedCycleId}
            userId={currentUser?.id}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;