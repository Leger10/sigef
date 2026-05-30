import { supabase } from '@/lib/supabaseClient';

/**
 * Envoie une notification à tous les apprenants d’un cycle
 */
export const notifyCycleApprenants = async (cycleId, title, message, type = 'info', actionUrl = null) => {
  if (!cycleId) return;
  try {
    const { error } = await supabase.rpc('notify_cycle_apprenants', {
      p_cycle_id: cycleId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_action_url: actionUrl
    });
    if (error) throw error;
    console.log(`✅ Notification envoyée au cycle ${cycleId}`);
  } catch (err) {
    console.error('Erreur lors de l\'envoi des notifications:', err);
  }
};

/**
 * Envoie une notification à un utilisateur spécifique
 */
export const notifyUser = async (userId, title, message, type = 'info', actionUrl = null) => {
  if (!userId) return;
  try {
    const { error } = await supabase.rpc('notify_user', {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_action_url: actionUrl
    });
    if (error) throw error;
  } catch (err) {
    console.error('Erreur lors de l\'envoi de la notification:', err);
  }
};

/**
 * Envoie une notification à l'administrateur d'un cycle et à tous les super administrateurs
 */
export const notifyAdminAndSuperAdmins = async (cycleId, adminId, title, message, type = 'info', actionUrl = null) => {
  try {
    let targetAdminId = adminId;
    if (!targetAdminId && cycleId) {
      const { data: cycleData } = await supabase
        .from('cycles')
        .select('admin_id')
        .eq('id', cycleId)
        .single();
      targetAdminId = cycleData?.admin_id;
    }

    if (targetAdminId) {
      await notifyUser(targetAdminId, title, message, type, actionUrl);
    }

    const { data: superAdmins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin');

    if (superAdmins && superAdmins.length) {
      for (const admin of superAdmins) {
        await notifyUser(admin.id, title, message, type, actionUrl);
      }
    }
  } catch (err) {
    console.error('Erreur notification admin/super-admin:', err);
  }
};

/**
 * Envoie une notification à tous les super administrateurs
 */
export const notifySuperAdmins = async (title, message, type = 'contact', actionUrl = '/super-admin?tab=contacts') => {
  try {
    const { data: superAdmins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin');

    if (error) throw error;

    if (superAdmins && superAdmins.length) {
      for (const admin of superAdmins) {
        await notifyUser(admin.id, title, message, type, actionUrl);
      }
      console.log(`✅ Notification envoyée à ${superAdmins.length} super admin(s)`);
    }
  } catch (err) {
    console.error('Erreur lors de l\'envoi aux super admins:', err);
  }
};