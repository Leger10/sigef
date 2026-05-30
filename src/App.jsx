// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext.jsx";
import { DataProvider } from "@/contexts/DataContext.jsx";
import {
  AdminConfigProvider,
  useAdminConfig,
} from "@/contexts/AdminConfigContext.jsx";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner.jsx";
import ScrollToTop from "@/components/ScrollToTop.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import RoleBasedRoute from "@/components/RoleBasedRoute.jsx";
import DebugPanel from "@/components/DebugPanel.jsx";
import { getFileUrl } from "@/lib/supabaseClient.js";
import { useAdminRedirect } from "@/hooks/useAdminRedirect.js";

// Public Pages
import HomePage from "@/pages/HomePage.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import SignupPage from "@/pages/SignupPage.jsx";
import FormatorPage from "@/pages/FormatorPage.jsx";
import ProgramDetail from "@/pages/ProgramDetail.jsx";

// Dashboard Pages
import DashboardPage from "@/pages/DashboardPage.jsx";
import ApprenantDashboard from "@/pages/ApprenantDashboard.jsx";
import FormateurDashboard from "@/pages/FormateurDashboard.jsx";
import AdminDashboard from "@/pages/AdminDashboard.jsx";
import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard.jsx";

// Subscription & Payment Pages
import SubscriptionPage from "@/pages/SubscriptionPage.jsx";
import CheckoutPage from "@/pages/CheckoutPage.jsx";
import SubscriptionPaymentFlow from "@/pages/SubscriptionPaymentFlow.jsx";
import PaymentHistoryPage from "@/pages/PaymentHistoryPage.jsx";

// Quiz & Session Pages
import QuizPage from "@/pages/QuizPage.jsx";
import TakeQuiz from "@/pages/quiz/TakeQuiz.jsx";  // ✅ Ajout de l'import
import SessionDetailPage from "@/pages/SessionDetailPage.jsx";
import SessionReport from "@/pages/SessionReport.jsx";
// Apprenant Pages
import ApprenantCourses from "@/pages/apprenant/ApprenantCourses.jsx";
import ApprenantCourseDetail from "@/pages/apprenant/ApprenantCourseDetail.jsx";
import ApprenantSessions from "@/pages/apprenant/ApprenantSessions.jsx";
import ApprenantRanking from "@/pages/apprenant/ApprenantRanking.jsx";
// Formateur Pages
import LiveSessionsList from "@/pages/formateur/LiveSessionsList.jsx";
import LiveAnimations from "@/pages/formateur/LiveAnimations.jsx";
import CreateSession from "@/pages/formateur/CreateSession.jsx";
import EditSession from "@/pages/formateur/EditSession.jsx";
import LiveSessionRoom from "@/pages/formateur/LiveSessionRoom.jsx";
import LiveSessionRecordings from "@/pages/formateur/LiveSessionRecordings.jsx";
import CreateQuiz from "@/pages/formateur/CreateQuiz.jsx";
import AddQuizQuestions from "@/pages/formateur/AddQuizQuestions.jsx";

// Admin Pages
import PaymentMethodsAdmin from "@/pages/admin/PaymentMethodsAdmin.jsx";
import PaymentAccountsAdmin from "@/pages/admin/PaymentAccountsAdmin.jsx";
import PaymentsManagement from "@/pages/admin/PaymentsManagement.jsx";
import AdminUsersManagement from "@/pages/admin/UsersManagement.jsx";
import AdminCyclesManagement from "@/pages/admin/CyclesManagement.jsx";
import CycleSessionsPage from "@/pages/CycleSessionsPage";
import PricingPage from "@/pages/PricingPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import QuizResult from '@/pages/quiz/QuizResult';

// Composant interne qui utilise le nouveau contexte
const AppContent = () => {
  const { config, loading } = useAdminConfig();

  useAdminRedirect();

  const siteName = config?.site_name || "SIGEF";
  const siteDescription =
    config?.site_description ||
    "Plateforme de formation professionnelle pour les candidats direct et professionnel.";
  const faviconUrl = config?.site_favicon
    ? getFileUrl("sessions", config.site_favicon)
    : "/vite.svg";

  if (loading && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">
            Chargement de la configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{siteName}</title>
        <meta name="description" content={siteDescription} />
        <link rel="icon" type="image/svg+xml" href={faviconUrl} />
      </Helmet>
      <ScrollToTop />
      <DebugPanel />
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/formateur/:formateurId" element={<FormatorPage />} />
        <Route path="/program/:id" element={<ProgramDetail />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* ========== PROTECTED ROUTES ========== */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/checkout/:id" element={<CheckoutPage />} />
          
          {/* ✅ Route pour le passage du quiz (TakeQuiz) */}
          <Route path="/quiz/:quizId" element={<TakeQuiz />} />
          {/* Garder QuizPage pour d'autres éventualités, ou commenter */}
          {/* <Route path="/quiz/:id" element={<QuizPage />} /> */}
          
          <Route path="/session/:id" element={<SessionDetailPage />} />
          <Route
            path="/live-session/:sessionId"
            element={<LiveSessionRoom />}
          />
          {/* ========== APPRENANT ROUTES ========== */}
          <Route element={<RoleBasedRoute allowedRoles={["apprenant"]} />}>
            <Route path="/apprenant" element={<ApprenantDashboard />} />
            <Route
              path="/apprenant/live-session/:sessionId"
              element={<LiveSessionRoom />}
            />
            <Route
              path="/apprenant/session-report/:sessionId"
              element={<SessionReport />}
            />
            <Route
              path="/apprenant/subscription/:subscriptionId/payment"
              element={<SubscriptionPaymentFlow />}
            />
            <Route
              path="/apprenant/payment-history"
              element={<PaymentHistoryPage />}
            />
            <Route path="/apprenant/courses" element={<ApprenantCourses />} />
            <Route
              path="/apprenant/course/:id"
              element={<ApprenantCourseDetail />}
            />
            <Route path="/apprenant/sessions" element={<ApprenantSessions />} />
            <Route path="/apprenant/ranking" element={<ApprenantRanking />} />
            <Route
              path="/cycle/:cycleId/sessions"
              element={<CycleSessionsPage />}
            />
            <Route path="/quiz-result/:quizId" element={<QuizResult />} />
          </Route>

          {/* ========== FORMATEUR ROUTES ========== */}
          <Route element={<RoleBasedRoute allowedRoles={["formateur"]} />}>
            <Route path="/formateur" element={<FormateurDashboard />} />
            <Route
              path="/formateur/live-sessions"
              element={<LiveSessionsList />}
            />
            <Route
              path="/formateur/live-animations"
              element={<LiveAnimations />}
            />
            <Route
              path="/formateur/create-session"
              element={<CreateSession />}
            />
            <Route
              path="/formateur/edit-session/:sessionId"
              element={<EditSession />}
            />
            <Route
              path="/formateur/live-session/:sessionId"
              element={<LiveSessionRoom />}
            />
            <Route
              path="/formateur/session-recordings"
              element={<LiveSessionRecordings />}
            />
            <Route path="/formateur/create-quiz" element={<CreateQuiz />} />
            <Route
              path="/formateur/add-quiz-questions/:quizId"
              element={<AddQuizQuestions />}
            />
          </Route>

          {/* ========== ADMIN ROUTES ========== */}
          <Route
            element={<RoleBasedRoute allowedRoles={["admin", "super_admin"]} />}
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersManagement />} />
            <Route path="/admin/cycles" element={<AdminCyclesManagement />} />
            <Route
              path="/admin/payment-methods"
              element={<PaymentMethodsAdmin />}
            />
            <Route
              path="/admin/payment-accounts"
              element={<PaymentAccountsAdmin />}
            />
            <Route path="/admin/payments" element={<PaymentsManagement />} />
          </Route>

          {/* ========== SUPER ADMIN ROUTES ========== */}
          <Route element={<RoleBasedRoute allowedRoles={["super_admin"]} />}>
            <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
          </Route>
        </Route>

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" theme="dark" />
    </>
  );
};

// Ordre des providers (AdminConfigProvider remplace l'ancien ConfigProvider)
function App() {
  return (
    <HelmetProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
      >
        <Router>
          <AuthProvider>
            <AdminConfigProvider>
              <DataProvider>
                <AppContent />
              </DataProvider>
            </AdminConfigProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;