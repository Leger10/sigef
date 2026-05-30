// src/components/admin/NotificationDetailsDialog.jsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';

export const NotificationDetailsDialog = ({ isOpen, onClose, notification, renderStatus }) => {
  if (!notification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Détails de la notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Titre</h4>
            <p className="font-medium text-lg">{notification.title}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Message</h4>
            <div className="bg-muted p-4 rounded-xl text-sm whitespace-pre-wrap">
              {notification.message}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Statut</h4>
              <div>{renderStatus(notification.status)}</div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Date d'envoi</h4>
              <p className="text-sm">{new Date(notification.sent_at || notification.created_at).toLocaleString()}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Type</h4>
              <p className="text-sm capitalize">{notification.type}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cible</h4>
              <p className="text-sm capitalize">{notification.recipients_type || 'Tous'}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
