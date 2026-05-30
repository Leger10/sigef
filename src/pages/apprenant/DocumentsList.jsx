// src/components/apprenant/DocumentsList.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Image, FileVideo, FileArchive, File } from 'lucide-react';
import { toast } from 'sonner';

const getFileIcon = (type) => {
  switch (type) {
    case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
    case 'image': return <Image className="h-5 w-5 text-blue-500" />;
    case 'video': return <FileVideo className="h-5 w-5 text-purple-500" />;
    case 'archive': return <FileArchive className="h-5 w-5 text-amber-500" />;
    default: return <File className="h-5 w-5 text-primary" />;
  }
};

const DocumentsList = ({ cycleId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!cycleId) return;
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('cycle_id', cycleId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error('Erreur chargement documents:', err);
        toast.error('Impossible de charger les ressources');
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [cycleId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (documents.length === 0) return <p className="text-center text-muted-foreground">Aucun document partagé pour le moment.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {getFileIcon(doc.file_type)}
              <CardTitle className="text-base truncate">{doc.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {doc.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{doc.description}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{doc.file_name?.split('.').pop()?.toUpperCase()}</span>
              <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Télécharger
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentsList;