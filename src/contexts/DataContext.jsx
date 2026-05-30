// src/contexts/DataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [debugMode, setDebugMode] = useState(() => {
    // Pour Vite : utiliser import.meta.env.DEV
    const saved = localStorage.getItem('data_debug_mode');
    const isDev = import.meta.env.DEV;
    return saved === 'true' && isDev;
  });
  const [requestLogs, setRequestLogs] = useState([]);
  const [cache, setCache] = useState(new Map());

  // Interception des requêtes seulement en mode debug
  useEffect(() => {
    if (!debugMode) return;

    const originalFrom = supabase.from.bind(supabase);
    
    const wrappedFrom = (table) => {
      const query = originalFrom(table);
      
      const originalSelect = query.select.bind(query);
      query.select = async (...args) => {
        const startTime = Date.now();
        const path = `${table}.select(${JSON.stringify(args)})`;
        
        try {
          const result = await originalSelect(...args);
          const duration = Date.now() - startTime;
          
          setRequestLogs(prev => [{
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            path,
            method: 'SELECT',
            status: 'success',
            duration,
            data: result.data
          }, ...prev].slice(0, 50));
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          setRequestLogs(prev => [{
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            path,
            method: 'SELECT',
            status: 'error',
            error: error.message,
            duration
          }, ...prev].slice(0, 50));
          
          throw error;
        }
      };
      
      return query;
    };
    
    supabase.from = wrappedFrom;
    
    return () => {
      supabase.from = originalFrom;
    };
  }, [debugMode]);

  const clearCache = useCallback(() => {
    setCache(new Map());
    if (debugMode) console.log('[Data Context] Cache cleared');
  }, [debugMode]);

  const getCacheKey = (table, options) => {
    return `${table}|${options?.select || '*'}|${JSON.stringify(options?.filter || {})}|${JSON.stringify(options?.eq || {})}|${options?.order?.column || ''}|${options?.order?.ascending || ''}|${options?.limit || ''}`;
  };

  const fetchData = useCallback(async (table, options = {}) => {
    // Vérifier le cache si pas de force refresh
    if (!options.forceRefresh) {
      const cacheKey = getCacheKey(table, options);
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) { // Cache valide 30 secondes
        return cached.data;
      }
    }
    
    try {
      let query = supabase.from(table).select(options.select || '*');
      
      if (options.filter) {
        query = query.filter(options.filter.column, options.filter.operator, options.filter.value);
      }
      
      if (options.eq) {
        query = query.eq(options.eq.column, options.eq.value);
      }
      
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending || false });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.single) {
        const { data, error } = await query.single();
        if (error) throw error;
        
        // Mettre en cache
        if (!options.skipCache) {
          const cacheKey = getCacheKey(table, options);
          setCache(prev => new Map(prev.set(cacheKey, { data, timestamp: Date.now() })));
        }
        
        return data;
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Mettre en cache
      if (!options.skipCache) {
        const cacheKey = getCacheKey(table, options);
        setCache(prev => new Map(prev.set(cacheKey, { data, timestamp: Date.now() })));
      }
      
      return data;
    } catch (error) {
      console.error(`[DataContext] Error fetching ${table}:`, error);
      throw error;
    }
  }, [cache]);

  const insertData = useCallback(async (table, data) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();
      
      if (error) throw error;
      
      // Invalider le cache pour cette table
      setCache(prev => {
        const newCache = new Map(prev);
        for (const key of newCache.keys()) {
          if (key.startsWith(`${table}|`)) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
      
      return result;
    } catch (error) {
      console.error(`[DataContext] Error inserting into ${table}:`, error);
      throw error;
    }
  }, []);

  const updateData = useCallback(async (table, id, data) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Invalider le cache pour cette table
      setCache(prev => {
        const newCache = new Map(prev);
        for (const key of newCache.keys()) {
          if (key.startsWith(`${table}|`)) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
      
      return result;
    } catch (error) {
      console.error(`[DataContext] Error updating ${table}:`, error);
      throw error;
    }
  }, []);

  const deleteData = useCallback(async (table, id) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalider le cache pour cette table
      setCache(prev => {
        const newCache = new Map(prev);
        for (const key of newCache.keys()) {
          if (key.startsWith(`${table}|`)) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
      
      return true;
    } catch (error) {
      console.error(`[DataContext] Error deleting from ${table}:`, error);
      throw error;
    }
  }, []);

  const toggleDebugMode = useCallback(() => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    localStorage.setItem('data_debug_mode', newMode);
    if (newMode) {
      console.log('[Data Context] Debug mode enabled');
    } else {
      console.log('[Data Context] Debug mode disabled');
    }
  }, [debugMode]);

  const value = {
    debugMode,
    setDebugMode: toggleDebugMode,
    requestLogs,
    clearCache,
    clearLogs: () => setRequestLogs([]),
    fetchData,
    insertData,
    updateData,
    deleteData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};