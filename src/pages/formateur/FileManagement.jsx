import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Search,
  File,
  Image as ImageIcon,
  FileVideo,
  FileArchive,
  FolderOpen,
  Users,
  Crown,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { notifyCycleApprenants, notifyAdminAndSuperAdmins } from "@/services/notificationService";

const FileManagement = () => {
  const { currentUser } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState("");
  const [loadingCycles, setLoadingCycles] = useState(true);

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file_type: "document",
    visibility: "all", // all, pro_only, standard_only
    file: null,
  });

  const getAdminId = async () => {
    if (currentUser?.admin_id) return currentUser.admin_id;
    const { data, error } = await supabase
      .from('users')
      .select('admin_id')
      .eq('id', currentUser?.id)
      .single();
    if (error || !data?.admin_id) return null;
    return data.admin_id;
  };

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const adminId = await getAdminId();
        if (!adminId) {
          setCycles([]);
          setLoadingCycles(false);
          return;
        }

        const { data, error } = await supabase
          .from("cycles")
          .select("id, name, category")
          .eq("admin_id", adminId)
          .eq("is_active", true)
          .eq("is_default", false)
          .order("name");

        if (error) throw error;
        setCycles(data || []);
        if (data && data.length > 0) {
          setSelectedCycle(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching cycles:", error);
        toast.error("Erreur lors du chargement des cycles");
      } finally {
        setLoadingCycles(false);
      }
    };

    fetchCycles();
  }, [currentUser]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!selectedCycle) return;

      setLoadingFiles(true);
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("cycle_id", selectedCycle)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFiles(data || []);
      } catch (error) {
        console.error("Error fetching files:", error);
        if (
          !error.message?.includes("relation") &&
          !error.message?.includes("does not exist")
        ) {
          toast.error("Erreur lors du chargement des fichiers");
        }
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [selectedCycle]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Le fichier dépasse la limite de 20MB");
        e.target.value = "";
        return;
      }
      setFormData((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.split(".")[0],
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedCycle) {
      toast.error("Veuillez sélectionner un cycle");
      return;
    }

    if (!formData.file || !formData.title) {
      toast.error("Le fichier et le titre sont requis");
      return;
    }

    setUploading(true);
    try {
      const fileExt = formData.file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${selectedCycle}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("documents").insert({
        title: formData.title,
        description: formData.description,
        file_type: formData.file_type,
        visibility: formData.visibility,
        file_url: urlData.publicUrl,
        file_name: formData.file.name,
        file_size: formData.file.size,
        cycle_id: selectedCycle,
        uploaded_by: currentUser?.id,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // --- ENVOI DES NOTIFICATIONS ---
      const cycle = cycles.find(c => c.id === selectedCycle);
      const cycleName = cycle?.name || 'ce cycle';
      const fileNameForNotif = formData.title;
      const visibilityLabel = 
        formData.visibility === 'all' ? 'tous les apprenants' :
        formData.visibility === 'pro_only' ? 'les apprenants PRO' :
        'les apprenants standard';

      await notifyCycleApprenants(
        selectedCycle,
        `📄 Nouveau document : ${fileNameForNotif}`,
        `Un nouveau document "${fileNameForNotif}" a été ajouté au cycle ${cycleName} (visible par ${visibilityLabel}).`,
        'document',
        `/documents/${selectedCycle}`
      );

      await notifyAdminAndSuperAdmins(
        selectedCycle,
        null,
        `📄 Nouveau document ajouté par ${currentUser.full_name || currentUser.email}`,
        `Document "${fileNameForNotif}" ajouté au cycle ${cycleName} (visibilité : ${visibilityLabel}).`,
        'document',
        `/admin/documents?cycle=${selectedCycle}`
      );
      // --- FIN NOTIFICATIONS ---

      setFormData({
        title: "",
        description: "",
        file_type: "document",
        visibility: "all",
        file: null,
      });
      document.getElementById("file-upload").value = "";
      toast.success("Fichier uploadé avec succès");

      const { data: newFiles } = await supabase
        .from("documents")
        .select("*")
        .eq("cycle_id", selectedCycle)
        .order("created_at", { ascending: false });
      setFiles(newFiles || []);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?"))
      return;

    try {
      if (file.file_url) {
        const urlParts = file.file_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const cycleId = file.cycle_id;
        const filePath = `${cycleId}/${fileName}`;
        await supabase.storage.from("documents").remove([filePath]);
      }

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", file.id);

      if (error) throw error;

      setFiles(files.filter((f) => f.id !== file.id));
      toast.success("Fichier supprimé");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "image":
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      case "video":
        return <FileVideo className="h-5 w-5 text-purple-500" />;
      case "archive":
        return <FileArchive className="h-5 w-5 text-amber-500" />;
      default:
        return <File className="h-5 w-5 text-primary" />;
    }
  };

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case 'pro_only':
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30"><Crown className="w-3 h-3 mr-1" /> PRO uniquement</Badge>;
      case 'standard_only':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><User className="w-3 h-3 mr-1" /> Standard uniquement</Badge>;
      default:
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><Users className="w-3 h-3 mr-1" /> Tous</Badge>;
    }
  };

  const filteredFiles = files.filter(
    (f) =>
      f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description &&
        f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loadingCycles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des Fichiers</h2>
        <p className="text-muted-foreground">
          Partagez des ressources, documents et supports de cours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Cycle de formation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cycles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun cycle disponible. Veuillez contacter votre administrateur.
                </p>
              ) : (
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Ajouter un fichier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Fichier (Max 20MB)</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Nom du document"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file_type">Type de ressource</Label>
                  <Select
                    value={formData.file_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, file_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Vidéo</SelectItem>
                      <SelectItem value="archive">Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilité</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(v) =>
                      setFormData({ ...formData, visibility: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les apprenants</SelectItem>
                      <SelectItem value="pro_only">Apprenants PRO uniquement</SelectItem>
                      <SelectItem value="standard_only">Apprenants standard uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Détermine qui peut voir ce document.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optionnelle)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brève description..."
                    className="resize-none h-20"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={uploading || !formData.file || !formData.title || cycles.length === 0}
                >
                  {uploading ? "Upload en cours..." : "Uploader le fichier"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les fichiers..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFiles ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Aucun fichier</p>
                        <p className="text-sm">
                          Utilisez le formulaire pour ajouter des ressources.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 bg-muted rounded-md">
                            {getFileIcon(file.file_type)}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{file.title}</p>
                            {file.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {file.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {file.file_type || "Document"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getVisibilityBadge(file.visibility || 'all')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(file.file_size)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {file.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileManagement;