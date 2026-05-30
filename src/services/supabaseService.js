import { supabase, getFileUrl } from '@/lib/supabaseClient.js';

class SupabaseService {
  constructor() {
    this.currentUser = null;
    this.session = null;
    
    // Écouter les changements d'auth
    supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      if (session) {
        this.currentUser = session.user;
        await this.loadUserProfile();
      } else {
        this.currentUser = null;
      }
    });
  }

  // ============ AUTHENTICATION ============
  async authWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    await this.loadUserProfile();
    return {
      record: this.currentUser,
      token: data.session.access_token
    };
  }

  async createUser(userData) {
    // Créer l'utilisateur dans auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role || 'apprenant'
        }
      }
    });
    
    if (authError) throw authError;
    
    // Créer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role || 'apprenant',
        phone: userData.phone,
        cycle_id: userData.cycle_id,
        admin_id: userData.admin_id,
        pro_status: false,
        pro_expiry: null
      })
      .select()
      .single();
    
    if (profileError) throw profileError;
    
    this.currentUser = profile;
    return { record: profile };
  }

  async loadUserProfile() {
    if (!this.session?.user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*, cycle:cycle_id(*)')
      .eq('id', this.session.user.id)
      .single();
    
    if (error) throw error;
    
    this.currentUser = data;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.session = null;
  }

  async requestVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    if (error) throw error;
  }

  // ============ QUERIES ============
  async getFirstListItem(collection, filter = '', options = {}) {
    let query = supabase.from(collection).select('*');
    
    if (filter) {
      const supabaseFilter = this.convertFilter(filter);
      query = query.filter(supabaseFilter);
    }
    
    const { data, error } = await query.limit(1).single();
    if (error) throw error;
    return data;
  }

  async getFullList(collection, options = {}) {
    let query = supabase.from(collection).select('*');
    
    if (options.filter) {
      const supabaseFilter = this.convertFilter(options.filter);
      query = query.filter(supabaseFilter);
    }
    
    if (options.sort) {
      const [field, order] = options.sort.split(' ');
      query = query.order(field, { ascending: order === '+asc' });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getOne(collection, id, options = {}) {
    let query = supabase.from(collection).select('*');
    
    if (options.expand) {
      const expands = options.expand.split(',');
      expands.forEach(expand => {
        query = query.select(`*, ${expand}:${expand}(*)`);
      });
    }
    
    const { data, error } = await query.eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(collection, data) {
    const { data: result, error } = await supabase
      .from(collection)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async update(collection, id, data) {
    const { data: result, error } = await supabase
      .from(collection)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async delete(collection, id) {
    const { error } = await supabase
      .from(collection)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // ============ FILE UPLOADS ============
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) throw error;
    return data.path;
  }

  getFileUrl(bucket, path) {
    return getFileUrl(bucket, path);
  }

  // ============ HELPER ============
  convertFilter(pbFilter) {
    // Exemple: "role='admin' && pro_status=true" => "role.eq.admin, pro_status.eq.true"
    let supabaseFilter = pbFilter
      .replace(/&&/g, ',')
      .replace(/=/g, '.eq.')
      .replace(/'/g, '');
    
    return supabaseFilter;
  }

  get authStore() {
    return {
      isValid: !!this.session,
      model: this.currentUser,
      token: this.session?.access_token
    };
  }
}

export const pb = new SupabaseService();
export default pb;