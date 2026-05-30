// src/services/subscriptionService.js
import { supabase } from '@/lib/supabaseClient.js';

class SubscriptionService {
  
  // Récupérer les packs d'abonnement pour l'admin
  async getAdminPlans(adminId) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('admin_id', adminId)
      .order('duration_days', { ascending: true });
    
    if (error) throw error;
    return data;
  }
  
  // Créer un pack d'abonnement
  async createPlan(planData, adminId) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        ...planData,
        admin_id: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Mettre à jour un pack
  async updatePlan(planId, planData) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        ...planData,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Supprimer un pack
  async deletePlan(planId) {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);
    
    if (error) throw error;
    return true;
  }
  
  // Créer une demande d'abonnement (apprenant)
  async createSubscriptionRequest(userId, planId, paymentProofUrl = null) {
    // Récupérer le plan pour connaître la durée
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (planError) throw planError;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'pending', // En attente de validation admin
        amount: plan.discounted_price || plan.price,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_proof_url: paymentProofUrl,
        created_at: new Date().toISOString()
      })
      .select('*, subscription_plans(*)')
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Valider un abonnement (admin)
  async validateSubscription(subscriptionId, adminId) {
    // Récupérer l'abonnement
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('id', subscriptionId)
      .single();
    
    if (subError) throw subError;
    
    // Mettre à jour l'abonnement
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        validated_by: adminId,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Mettre à jour le statut PRO de l'utilisateur
    await supabase
      .from('users')
      .update({
        pro_status: true,
        pro_expiry: subscription.end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.user_id);
    
    return data;
  }
  
  // Rejeter un abonnement
  async rejectSubscription(subscriptionId, adminId, reason = null) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'rejected',
        validated_by: adminId,
        validated_at: new Date().toISOString(),
        notes: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Récupérer les abonnements en attente (admin)
  async getPendingSubscriptions(adminId) {
    // D'abord récupérer les plans de l'admin
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('admin_id', adminId);
    
    if (plansError) throw plansError;
    
    const planIds = plans.map(p => p.id);
    
    if (planIds.length === 0) return [];
    
    // Récupérer les abonnements en attente
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, users!subscriptions_user_id_fkey(id, email, full_name, phone), subscription_plans(*)')
      .in('plan_id', planIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  // Récupérer les abonnements d'un utilisateur
  async getUserSubscriptions(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  // Vérifier si l'utilisateur a un abonnement actif
  async getActiveSubscription(userId) {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('end_date', now)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  // Calculer les jours restants
  getDaysRemaining(endDate) {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }
  
  // Formater la durée
  formatDuration(days) {
    if (days === 30) return '1 mois';
    if (days === 60) return '2 mois';
    if (days === 90) return '3 mois';
    if (days === 180) return '6 mois';
    if (days === 365) return '12 mois';
    return `${days} jours`;
  }
}

export default new SubscriptionService();