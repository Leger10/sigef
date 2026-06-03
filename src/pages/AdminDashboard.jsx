// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import {
  Shield,
  Users,
  UserCheck,
  Crown,
  Activity,
  BellRing,
  Tag,
  Layers,
  Smartphone,
  Wallet,
  Palette,
  AlertTriangle,
  Loader2,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { toast } from "sonner";

import UsersManagement from "./admin/UsersManagement.jsx";
import TrainersManagement from "./admin/TrainersManagement.jsx";
import SubscriptionsManagement from "./admin/SubscriptionsManagement.jsx";
import ActivityTracking from "./admin/ActivityTracking.jsx";
import NotificationsManagement from "./admin/NotificationsManagement.jsx";
import SubscriptionPlansManagement from "./admin/SubscriptionPlansManagement.jsx";
import CyclesManagement from "./admin/CyclesManagement.jsx";
import PaymentsManagement from "./admin/PaymentsManagement.jsx";
import PaymentAccountsAdmin from "./admin/PaymentAccountsAdmin.jsx";
import GeneralConfiguration from "./admin/GeneralConfiguration.jsx";
import CycleChat from "@/components/apprenant/CycleChat.jsx";

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("activity");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedCycles, setAssignedCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [chatCycleId, setChatCycleId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
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

  // Rafraîchir périodiquement le compteur
  useEffect(() => {
    if (!chatCycleId) return;
    fetchUnreadMessagesCount(chatCycleId);
    const interval = setInterval(() => {
      fetchUnreadMessagesCount(chatCycleId);
    }, 30000);
    return () => clearInterval(interval);
  }, [chatCycleId]);

  useEffect(() => {
    const loadAdminCycles = async () => {
      if (!isAdmin) return;
      setIsLoading(true);
      setLoadingCycles(true);
      setError(null);
      try {
        // 1. Cycles dont l'admin est propriétaire (admin_id = currentUser.id)
        const { data: myCycles, error: myCyclesError } = await supabase
          .from("cycles")
          .select("*")
          .eq("admin_id", currentUser?.id)
          .eq("is_active", true);
        if (myCyclesError) throw myCyclesError;

        // 2. Cycles assignés via la table admin_cycles (sans les cycles par défaut)
        const { data: adminCyclesData, error: adminCyclesError } =
          await supabase
            .from("admin_cycles")
            .select(`cycle:cycle_id(*)`)
            .eq("admin_id", currentUser?.id);
        let assignedCyclesData = [];
        if (!adminCyclesError && adminCyclesData) {
          assignedCyclesData = adminCyclesData
            .map((item) => item.cycle)
            .filter((c) => c && c.is_active === true);
        }

        // 3. On exclut explicitement les cycles is_default = true
        const allCycles = [...(myCycles || []), ...assignedCyclesData];
        const uniqueCycles = Array.from(
          new Map(allCycles.map((c) => [c.id, c])).values(),
        ).filter((cycle) => cycle.is_default !== true); // ← Exclusion des cycles par défaut

        setAssignedCycles(uniqueCycles);
        if (uniqueCycles.length > 0) {
          setSelectedCycleId(uniqueCycles[0].id);
          setChatCycleId(uniqueCycles[0].id);
          // Récupérer le compteur initial pour ce cycle
          await fetchUnreadMessagesCount(uniqueCycles[0].id);
        } else {
          setError(
            "Aucun cycle créé ou assigné (les cycles par défaut sont exclus)",
          );
        }
      } catch (err) {
        console.error("[AdminDashboard] Error:", err);
        setError(err.message || "Erreur de chargement");
      } finally {
        setIsLoading(false);
        setLoadingCycles(false);
      }
    };
    loadAdminCycles();
  }, [currentUser, isAdmin]);

  // Callback appelé par CycleChat quand l'utilisateur marque des messages comme lus
  const handleUnreadCountChange = (newCount) => {
    setUnreadMessagesCount(newCount);
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col bg-muted/10">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  if (error || assignedCycles.length === 0)
    return (
      <div className="min-h-screen flex flex-col bg-muted/10">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-lg border-warning/50">
            <AlertTriangle className="w-16 h-16 text-warning mx-auto" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Aucun Cycle Disponible
              </h2>
              <p className="text-muted-foreground">
                {error ||
                  "Vous n'avez créé aucun cycle. Les cycles par défaut ne sont pas affichés."}
              </p>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );

  const selectedCycle = assignedCycles.find((c) => c.id === selectedCycleId);
  const chatCycle = assignedCycles.find((c) => c.id === chatCycleId);

  const navItems = [
    { id: "activity", label: "Activité", icon: Activity },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "trainers", label: "Formateurs", icon: UserCheck },
    { id: "subscriptions", label: "Abonnements", icon: Crown },
    { id: "notifications", label: "Notifications", icon: BellRing },
    { id: "plans", label: "Forfaits", icon: Tag },
    { id: "cycles", label: "Cycles", icon: Layers },
    { id: "payments", label: "Paiements", icon: Smartphone },
    { id: "payment_accounts", label: "Moyens de paiement", icon: Wallet },
    { id: "general_config", label: "Personnalisation", icon: Palette },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/10">
      <Helmet>
        <title>
          Administration {selectedCycle ? `- ${selectedCycle.name}` : ""} -
          SIGEF
        </title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-[1600px]">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-10 mt-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-20 blur-xl"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Espace Administration
              </h1>
              <p className="text-muted-foreground mt-1 text-base">
                Supervisez vos cycles de formation
              </p>
            </div>
          </div>
          {assignedCycles.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Layers className="w-4 h-4" />
                  {selectedCycle?.name || "Sélectionner un cycle"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {assignedCycles.map((cycle) => (
                  <DropdownMenuItem
                    key={cycle.id}
                    onClick={() => setSelectedCycleId(cycle.id)}
                    className={
                      selectedCycleId === cycle.id ? "bg-primary/10" : ""
                    }
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {cycle.name}
                    {selectedCycleId === cycle.id && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col xl:flex-row gap-8"
        >
          <div className="xl:w-64 shrink-0">
            <TabsList className="flex xl:flex-col h-auto bg-card border shadow-sm p-2 gap-1 w-full justify-start overflow-x-auto rounded-xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="w-full justify-start py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
                  >
                    <Icon className="w-4 h-4 mr-3 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <div className="flex-1 min-w-0">
            <TabsContent
              value="activity"
              className="m-0 focus-visible:outline-none"
            >
              <ActivityTracking cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="users"
              className="m-0 focus-visible:outline-none"
            >
              <UsersManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="trainers"
              className="m-0 focus-visible:outline-none"
            >
              <TrainersManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="subscriptions"
              className="m-0 focus-visible:outline-none"
            >
              <SubscriptionsManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="notifications"
              className="m-0 focus-visible:outline-none"
            >
              <NotificationsManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="plans"
              className="m-0 focus-visible:outline-none"
            >
              <SubscriptionPlansManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="cycles"
              className="m-0 focus-visible:outline-none"
            >
              <CyclesManagement />
            </TabsContent>
            <TabsContent
              value="payments"
              className="m-0 focus-visible:outline-none"
            >
              <PaymentsManagement cycleId={selectedCycleId} />
            </TabsContent>
            <TabsContent
              value="payment_accounts"
              className="m-0 focus-visible:outline-none"
            >
              <PaymentAccountsAdmin />
            </TabsContent>
            <TabsContent
              value="general_config"
              className="m-0 focus-visible:outline-none"
            >
              <GeneralConfiguration />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Bouton flottant du chat avec sélecteur de cycle et badge */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {!loadingCycles && assignedCycles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm shadow-md gap-1 mb-1"
              >
                {chatCycle?.name || "Choisir un cycle"}{" "}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-64 overflow-y-auto"
            >
              {assignedCycles.map((cycle) => (
                <DropdownMenuItem
                  key={cycle.id}
                  onClick={() => {
                    setChatCycleId(cycle.id);
                    setUnreadMessagesCount(0); // Optionnel : reset visuel avant rechargement
                  }}
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
            disabled={!chatCycleId}
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

      {chatOpen && chatCycleId && (
          <div className="fixed bottom-28 right-4 z-50 w-96 h-[500px] bg-background border rounded-xl shadow-2xl">
            <div className="flex justify-between items-center p-3 border-b bg-primary text-white rounded-t-xl">
              <h3 className="font-semibold">
              Chat du cycle : {chatCycle?.name || "?"}
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
            cycleId={chatCycleId}
            userId={currentUser?.id}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;