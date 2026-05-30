import React, { useState, useEffect } from 'react';
import { Terminal, X, RefreshCw, Trash2, Activity, Database, User } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useData } from '@/contexts/DataContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const { currentUser } = useAuth();
  const { debugMode, setDebugMode, requestLogs, clearCache, clearLogs } = useData();

  useEffect(() => {
    const fetchSessionInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionInfo(session);
    };
    
    if (isOpen) {
      fetchSessionInfo();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setDebugMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDebugMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-card border shadow-2xl rounded-xl z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="bg-muted/80 p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-sm font-bold">
          <Terminal className="w-4 h-4 text-primary" />
          Debug Panel
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {/* Auth Status */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <User className="w-3 h-3" /> Auth Status
          </h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs break-all">
            {currentUser ? (
              <>
                <div className="text-success mb-1">● Authenticated</div>
                <div>ID: {currentUser.id}</div>
                <div>Role: {currentUser.role}</div>
                <div>Email: {currentUser.email}</div>
                <div>PRO: {currentUser.pro_status ? '✅ Actif' : '❌ Inactif'}</div>
                {currentUser.pro_expiry && (
                  <div>Expire: {new Date(currentUser.pro_expiry).toLocaleDateString()}</div>
                )}
              </>
            ) : (
              <div className="text-destructive">○ Not Authenticated</div>
            )}
          </div>
        </div>

        {/* Supabase Status */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Database className="w-3 h-3" /> Supabase
          </h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs">
            <div>URL: {import.meta.env.VITE_SUPABASE_URL}</div>
            <div>Valid Session: {sessionInfo ? 'Yes' : 'No'}</div>
            {sessionInfo && (
              <div className="mt-1 text-muted-foreground">
                Expires: {new Date(sessionInfo.expires_at).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={clearCache}>
            <RefreshCw className="w-3 h-3 mr-2" /> Clear Cache
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={clearLogs}>
            <Trash2 className="w-3 h-3 mr-2" /> Clear Logs
          </Button>
        </div>

        {/* Network Logs */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Activity className="w-3 h-3" /> Network Logs ({requestLogs.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {requestLogs.length === 0 ? (
              <div className="text-muted-foreground text-xs italic">No requests yet...</div>
            ) : (
              requestLogs.map(log => (
                <div key={log.id} className={`p-2 rounded border text-xs font-mono ${log.status === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-muted/30 border-border'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{log.method}</span>
                    <span>{log.duration}ms</span>
                  </div>
                  <div className="truncate opacity-80">{log.path}</div>
                  {log.error && <div className="mt-1 text-destructive font-bold">{log.error}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
