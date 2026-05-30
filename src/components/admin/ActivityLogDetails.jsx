// src/components/admin/ActivityLogDetails.jsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';

export const ActivityLogDetails = ({ isOpen, onClose, log }) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails de l'activité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Date</h4>
              <p className="text-sm">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Action</h4>
              <p className="text-sm capitalize">{log.action?.replace(/_/g, ' ') || '-'}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Utilisateur</h4>
              <p className="text-sm">{log.user?.full_name || log.user?.email || 'Système'}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">ID Utilisateur</h4>
              <p className="text-sm font-mono text-xs">{log.user_id || '-'}</p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Détails complets</h4>
            <div className="bg-muted p-3 rounded-lg text-sm font-mono break-all max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(log.details, null, 2) || '-'}</pre>
            </div>
          </div>
          {log.ip_address && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Adresse IP</h4>
              <p className="text-sm font-mono">{log.ip_address}</p>
            </div>
          )}
          {log.user_agent && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Navigateur</h4>
              <p className="text-xs break-all">{log.user_agent}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
