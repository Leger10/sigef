import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient.js';

// Global cache to persist across component mounts
const globalCache = {};
const CACHE_DURATION = 5000; // 5 seconds

export const useSupabaseData = (tableName, options = {}) => {
  const { 
    filter = {}, 
    select = '*', 
    orderBy = { column: 'created_at', ascending: false },
    limit = 50,
    enabled = true,
    single = false
  } = options;
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  
  const isMounted = useRef(true);

  // Générer une clé de cache unique
  const cacheKey = `${tableName}_${JSON.stringify(filter)}_${select}_${JSON.stringify(orderBy)}_${limit}_${single}`;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const cached = globalCache[cacheKey];

    // Vérifier le cache
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
      console.log(`[Supabase Cache Hit] ${tableName}`);
      setData(cached.data);
      setCount(cached.count || 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
      try {
        console.log(`[Supabase Fetch] ${tableName} (Attempt ${4 - retries})`);
        
        let query = supabase
          .from(tableName)
          .select(select, { count: 'exact' });

        // Appliquer les filtres
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && value.operator) {
              // Filtre personnalisé (gt, lt, gte, lte, like, etc.)
              query = query.filter(key, value.operator, value.value);
            } else {
              // Filtre simple égalité
              query = query.eq(key, value);
            }
          }
        });

        // Appliquer le tri
        query = query.order(orderBy.column, { 
          ascending: orderBy.ascending 
        });

        // Appliquer la limite
        if (!single) {
          query = query.limit(limit);
        }

        // Exécuter la requête
        let result;
        if (single) {
          const { data, error, count: totalCount } = await query.single();
          result = { data, error, count: totalCount };
        } else {
          const { data, error, count: totalCount } = await query;
          result = { data, error, count: totalCount };
        }

        if (result.error) throw result.error;

        if (isMounted.current) {
          const resultData = result.data || [];
          setData(single ? resultData : resultData);
          setCount(result.count || resultData.length || 0);
          
          // Update cache
          globalCache[cacheKey] = {
            timestamp: Date.now(),
            data: resultData,
            count: result.count || resultData.length
          };
          
          success = true;
        }
      } catch (err) {
        console.error(`[Supabase Error] ${tableName}:`, err);
        retries -= 1;
        
        if (retries === 0 && isMounted.current) {
          setError(err.message || 'Une erreur est survenue lors du chargement des données.');
        } else {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (isMounted.current) {
      setLoading(false);
    }
  }, [tableName, filter, select, orderBy, limit, enabled, single, cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refetch, count };
};

// Hook pour les requêtes avec Real-time subscriptions
export const useSupabaseRealtime = (tableName, options = {}) => {
  const { filter = {}, select = '*' } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscription;

    const fetchInitialData = async () => {
      try {
        let query = supabase.from(tableName).select(select);
        
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data: initialData, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        
        setData(initialData || []);
        setLoading(false);
      } catch (err) {
        console.error('[Supabase Realtime] Fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchInitialData();

    // S'abonner aux changements en temps réel
    subscription = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join('&')
        },
        (payload) => {
          console.log(`[Supabase Realtime] ${payload.eventType} on ${tableName}:`, payload);
          
          setData(currentData => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...currentData, payload.new];
              case 'UPDATE':
                return currentData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                );
              case 'DELETE':
                return currentData.filter(item => item.id !== payload.old.id);
              default:
                return currentData;
            }
          });
        }
      )
      .subscribe();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [tableName, JSON.stringify(filter), select]);

  return { data, loading, error };
};