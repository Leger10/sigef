// src/lib/integratedAiClient.js
import { supabase } from './supabaseClient';

/**
 * Client pour l'IA intégrée
 * Note: Si vous avez besoin d'appeler une API externe pour l'IA,
 * vous pouvez la configurer ici. Sinon, vous pouvez supprimer ce fichier.
 */
const integratedAiClient = {
  /**
   * Envoie un message à l'API IA (externe)
   */
  sendMessage: async (message, images = []) => {
    // Si vous avez une API IA externe, mettez son URL ici
    const AI_API_URL = import.meta.env.VITE_AI_API_URL;
    
    if (!AI_API_URL) {
      console.warn('AI_API_URL not configured');
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const formData = new FormData();
    formData.append('message', JSON.stringify([{ text: message, type: 'text' }]));
    
    images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await fetch(AI_API_URL + '/stream', {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI request failed (${response.status})`);
    }

    return response;
  },

  /**
   * Stream SSE
   */
  stream: async (path, { body, signal, images = [] } = {}) => {
    const AI_API_URL = import.meta.env.VITE_AI_API_URL;
    
    if (!AI_API_URL) {
      throw new Error('AI_API_URL not configured');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const formData = new FormData();
    if (body?.message) {
      formData.append('message', JSON.stringify(body.message));
    }
    
    images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await fetch(AI_API_URL + path, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Request failed (${response.status}): ${errorBody}`);
    }

    return response;
  }
};

export default integratedAiClient;
export { integratedAiClient };