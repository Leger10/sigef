// src/services/adminService.js
import { supabase } from '@/lib/supabaseClient';

export const createAdminUser = async (adminData) => {
  try {
    console.log('Calling create-admin-user function with:', adminData);
    
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: JSON.stringify({
        email: adminData.email,
        password: adminData.password,
        full_name: adminData.full_name,
        role: adminData.role,
        phone: adminData.phone || null,
      }),
    });

    if (error) {
      console.error('Function invocation error:', error);
      throw new Error(error.message);
    }

    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la création');
    }

    console.log('Admin created successfully:', data.user);
    return data;
  } catch (error) {
    console.error('Error in createAdminUser:', error);
    throw error;
  }
};

// Fonction pour récupérer la liste des administrateurs
export const getAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
};

// Fonction pour supprimer un administrateur
export const deleteAdmin = async (adminId) => {
  try {
    // D'abord supprimer de la table users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', adminId);

    if (deleteError) throw deleteError;

    // Ensuite supprimer de auth.users (via Edge Function)
    const { data, error } = await supabase.functions.invoke('delete-admin-user', {
      body: JSON.stringify({ user_id: adminId }),
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting admin:', error);
    throw error;
  }
};