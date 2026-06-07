// src/contexts/AuthContext.jsx - Version avec messages d'erreur en français
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);
  const navigate = useNavigate();

  const loadUserProfile = useCallback(async (userId, createIfMissing = false) => {
    if (!userId) return null;

    // Vérifier le cache
    const cached = localStorage.getItem(`user_profile_${userId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === userId) return parsed;
      } catch (e) { console.error('Erreur lors de l\'analyse du cache:', e); }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // Profil n'existe pas
      if (!data) {
        if (createIfMissing) {
          // Pour l'inscription : créer un profil par défaut
          const { data: { user } } = await supabase.auth.getUser();
          const newProfile = {
            id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || 'Utilisateur',
            role: 'apprenant',
            pro_status: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { data: insertedProfile, error: insertError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .maybeSingle();

          if (insertError) {
            console.error('Erreur lors de la création du profil:', insertError);
            throw insertError;
          }
          toast.success('Profil utilisateur créé avec succès');
          localStorage.setItem(`user_profile_${userId}`, JSON.stringify(insertedProfile));
          return insertedProfile;
        } else {
          // Connexion sans profil → compte supprimé
          console.warn('Profil utilisateur manquant pour', userId);
          return null;
        }
      }

      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Erreur lors du chargement du profil');
      return null;
    }
  }, []);

  // Déconnexion forcée + nettoyage
  const forceSignOut = useCallback(async (message) => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_profile_')) localStorage.removeItem(key);
    });
    toast.error(message);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Connexion automatique : on vérifie le statut bloqué
          const profile = await loadUserProfile(session.user.id, false);
          if (!profile) {
            // Profil manquant → compte supprimé
            await forceSignOut('Votre compte a été supprimé. Contactez l\'administrateur.');
          } else if (profile.is_blocked) {
            // Compte bloqué
            await forceSignOut('Votre compte a été bloqué. Veuillez contacter l\'administrateur.');
          } else {
            setCurrentUser(profile);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la vérification de l\'authentification:', err);
      } finally {
        setInitialLoading(false);
        loadingRef.current = false;
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Après une inscription ou connexion manuelle
          const profile = await loadUserProfile(session.user.id, false);
          if (!profile) {
            // Si profil introuvable, c'est un compte supprimé → on force la déconnexion
            await forceSignOut('Compte inexistant ou supprimé.');
          } else if (profile.is_blocked) {
            await forceSignOut('Votre compte a été bloqué.');
          } else {
            setCurrentUser(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          // Nettoyer le cache
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('user_profile_')) localStorage.removeItem(key);
          });
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            const profile = await loadUserProfile(session.user.id, false);
            if (profile && !profile.is_blocked) setCurrentUser(profile);
            else if (profile?.is_blocked) await forceSignOut('Votre compte a été bloqué.');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile, forceSignOut]);

  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Traduire les messages d'erreur de Supabase en français
        let frenchMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          frenchMessage = 'Email ou mot de passe incorrect.';
        } else if (error.message.includes('Email not confirmed')) {
          frenchMessage = 'Veuillez confirmer votre email avant de vous connecter.';
        } else if (error.message.includes('User not found')) {
          frenchMessage = 'Aucun compte trouvé avec cet email.';
        } else if (error.message.includes('Too many requests')) {
          frenchMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
        }
        throw new Error(frenchMessage);
      }

      // Charger le profil sans le créer automatiquement
      const profile = await loadUserProfile(data.user.id, false);
      if (!profile) {
        // Utilisateur supprimé
        await supabase.auth.signOut();
        throw new Error('Ce compte a été supprimé. Contactez l\'administrateur.');
      }
      if (profile.is_blocked) {
        // Compte bloqué
        await supabase.auth.signOut();
        throw new Error('Votre compte a été bloqué. Veuillez contacter l\'administrateur.');
      }
      setCurrentUser(profile);
      toast.success('Connexion réussie');
      return profile;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
      throw error;
    }
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      toast.success('Déconnecté');
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    if (currentUser?.id) {
      localStorage.removeItem(`user_profile_${currentUser.id}`);
      const profile = await loadUserProfile(currentUser.id, false);
      if (profile && !profile.is_blocked) setCurrentUser(profile);
      else if (profile?.is_blocked) await forceSignOut('Votre compte a été bloqué.');
    }
  }, [currentUser, loadUserProfile, forceSignOut]);

  const value = {
    currentUser,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!currentUser && !currentUser.is_blocked,
    isSuperAdmin: currentUser?.role === 'super_admin' && !currentUser.is_blocked,
    isAdmin: (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && !currentUser.is_blocked,
    isFormateur: currentUser?.role === 'formateur' && !currentUser.is_blocked,
    isApprenant: currentUser?.role === 'apprenant' && !currentUser.is_blocked,
    isPro: currentUser?.pro_status === true && !currentUser.is_blocked
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};