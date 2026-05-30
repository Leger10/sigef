// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);
  const navigate = useNavigate();

  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    
    // Vérifier le cache
    const cached = localStorage.getItem(`user_profile_${userId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === userId) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing cached profile:', e);
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        console.log('No profile found for user:', userId, 'Creating default profile...');
        
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
          console.error('Error creating user profile:', insertError);
          throw insertError;
        }
        
        toast.success('Profil utilisateur créé avec succès');
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(insertedProfile));
        return insertedProfile;
      }
      
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error loading/creating profile:', error);
      toast.error('Erreur lors du chargement du profil');
      return null;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await loadUserProfile(session.user.id);
          setCurrentUser(profile);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setInitialLoading(false);
        loadingRef.current = false;
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await loadUserProfile(session.user.id);
          setCurrentUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          // Nettoyer le cache utilisateur
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('user_profile_')) {
              localStorage.removeItem(key);
            }
          });
        } else if (event === 'USER_UPDATED') {
          // Mettre à jour le profil si l'utilisateur est mis à jour
          if (session?.user) {
            const profile = await loadUserProfile(session.user.id);
            setCurrentUser(profile);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const profile = await loadUserProfile(data.user.id);
      if (!profile) throw new Error('Profil non trouvé ou créé');
      
      setCurrentUser(profile);
      toast.success('Connexion réussie');
      return profile;
    } catch (error) {
      console.error('Login error:', error);
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
      console.error('Logout error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    if (currentUser?.id) {
      // Forcer le rechargement du profil
      localStorage.removeItem(`user_profile_${currentUser.id}`);
      const profile = await loadUserProfile(currentUser.id);
      setCurrentUser(profile);
    }
  }, [currentUser, loadUserProfile]);

  const value = {
    currentUser,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!currentUser,
    isSuperAdmin: currentUser?.role === 'super_admin',
    isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'super_admin',
    isFormateur: currentUser?.role === 'formateur',
    isApprenant: currentUser?.role === 'apprenant',
    isPro: currentUser?.pro_status === true
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