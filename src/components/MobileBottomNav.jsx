// // src/components/MobileBottomNav.jsx
// import React from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext.jsx';
// import {
//   Home, BookOpen, Video, Users, Crown, Shield, BarChart3,
//   Calendar, Trophy, UserCheck, Layers, CreditCard, Activity,
//   DollarSign, History, Settings, LogOut, HelpCircle
// } from 'lucide-react';

// const MobileBottomNav = () => {
//   const { currentUser, isAuthenticated, logout } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate();

//   // Ne pas afficher sur les pages publiques ou non connecté
//   if (!isAuthenticated || !currentUser) return null;
//   if (['/', '/login', '/signup'].includes(location.pathname)) return null;

//   const handleNavigation = (path, action) => {
//     if (action) {
//       action();
//     } else if (path) {
//       navigate(path);
//     }
//   };

//   const handleLogout = async () => {
//     await logout();
//     navigate('/');
//   };

//   // Vérifie si le chemin correspond à la page active
//   const isActive = (path) => {
//     if (!path) return false;
//     if (path === '/admin' && location.pathname.startsWith('/admin')) return true;
//     if (path === '/super-admin' && location.pathname.startsWith('/super-admin')) return true;
//     if (path === '/formateur' && location.pathname.startsWith('/formateur')) return true;
//     if (path === '/apprenant' && location.pathname.startsWith('/apprenant')) return true;
//     return location.pathname === path;
//   };

//   // Configuration des boutons par rôle (toutes les routes existent dans App.jsx)
//   const getButtons = () => {
//     switch (currentUser?.role) {
//       case 'super_admin':
//         return [
//           { icon: BarChart3, label: 'Stats', path: '/super-admin' },
//           { icon: Users, label: 'Utilisateurs', path: '/super-admin' }, // onglet users par défaut
//           { icon: Shield, label: 'Admins', path: '/super-admin' },
//           { icon: DollarSign, label: 'Paiements', path: '/super-admin' },
//           { icon: Settings, label: 'Config', path: '/super-admin' },
//         ];
//       case 'admin':
//         return [
//           { icon: Home, label: 'Accueil', path: '/admin' },
//           { icon: Users, label: 'Apprenants', path: '/admin' },
//           { icon: UserCheck, label: 'Formateurs', path: '/admin' },
//           { icon: CreditCard, label: 'Abonnements', path: '/admin' },
//           { icon: Activity, label: 'Activité', path: '/admin' },
//         ];
//       case 'formateur':
//         return [
//           { icon: Home, label: 'Accueil', path: '/formateur' },
//           { icon: Video, label: 'Sessions', path: '/formateur/live-sessions' },
//           { icon: HelpCircle, label: 'Quiz', path: '/formateur/create-quiz' },
//           { icon: Users, label: 'Apprenants', path: '/formateur' },
//           { icon: LogOut, label: 'Déconnexion', action: handleLogout },
//         ];
//       default: // apprenant
//         return [
//           { icon: Home, label: 'Accueil', path: '/apprenant' },
//           { icon: BookOpen, label: 'Cours', path: '/apprenant' },
//           { icon: Calendar, label: 'Sessions', path: '/apprenant' },
//           { icon: Crown, label: 'PRO', path: '/subscription' },
//           { icon: History, label: 'Historique', path: `/payment-history/${currentUser?.id}` },
//         ];
//     }
//   };

//   const buttons = getButtons();

//   return (
//     <>
//       {/* Barre native flottante */}
//       <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
//         <div className="bg-background/95 backdrop-blur-lg border-t border-border shadow-lg rounded-t-2xl overflow-hidden safe-bottom">
//           <div className="flex items-center justify-around py-1 px-2">
//             {buttons.map((btn, idx) => {
//               const Icon = btn.icon;
//               const active = isActive(btn.path);
//               const isLogout = btn.label === 'Déconnexion';
//               return (
//                 <button
//                   key={idx}
//                   onClick={() => handleNavigation(btn.path, btn.action)}
//                   className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation
//                     ${active ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
//                     ${isLogout ? 'text-destructive hover:text-destructive/80' : ''}
//                   `}
//                 >
//                   <Icon className="h-5 w-5" />
//                   <span className="text-[10px] font-medium mt-1">{btn.label}</span>
//                   {active && (
//                     <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
//                   )}
//                 </button>
//               );
//             })}
//           </div>
//         </div>
//         {/* Espace réservé pour ne pas masquer le contenu (hauteur de la barre) */}
//         <div className="h-16" />
//       </div>
//     </>
//   );
// };

// export default MobileBottomNav;