import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, FileText, Download, Lock, Eye } from 'lucide-react';
import { supabase, getFileUrl } from '@/lib/supabaseClient.js';
import { useAccess } from '@/hooks/useAccess.js';

const FormatorDocuments = ({ formateurId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { checkAccess } = useAccess();

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        
        const { data: documentsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('uploaded_by', formateurId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (docsError) throw docsError;

        setDocuments(documentsData || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (formateurId) fetchDocs();
  }, [formateurId]);

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDownload = async (doc) => {
    if (!doc.file_url) return;
    
    // Ouvrir le document dans un nouvel onglet
    window.open(doc.file_url, '_blank');
    
    // Incrémenter le compteur de téléchargements
    await supabase
      .from('documents')
      .update({ downloads: (doc.downloads || 0) + 1 })
      .eq('id', doc.id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un document..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-none"
          />
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Aucun document trouvé</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => {
            const access = checkAccess(doc);
            
            return (
              <Card key={doc.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row">
                <div className="p-6 flex items-center justify-center bg-muted/30 sm:border-r border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
                <CardContent className="p-6 flex-1 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold line-clamp-1">{doc.title}</h3>
                    {!doc.is_pro_only && doc.is_pro_only !== undefined ? (
                      <Badge variant="secondary" className="shrink-0"><Lock className="w-3 h-3 mr-1"/> PRO</Badge>
                    ) : doc.is_public ? (
                      <Badge variant="outline" className="shrink-0">Public</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0"><Lock className="w-3 h-3 mr-1"/> PRO</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {doc.description || 'Document sans description.'}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {doc.file_type || 'PDF'} • {doc.file_size ? Math.round(doc.file_size / 1024) + ' KB' : 'Inconnu'}
                    </span>
                    
                    {access.hasAccess ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4 mr-2" /> Télécharger
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="opacity-50">
                        <Lock className="w-4 h-4 mr-2" /> Accès PRO
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormatorDocuments;
