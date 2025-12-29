import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import FileUpload from "@/components/FileUpload";
import BulkFileUpload from "@/components/BulkFileUpload";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import FileShareDialog from "@/components/FileShareDialog";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus, Search, Home, Grid, List, CheckSquare } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folder");

  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [shareFile, setShareFile] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
      loadFavorites();
      if (folderId) {
        loadBreadcrumb(folderId);
      } else {
        setBreadcrumb([]);
      }
    }
  }, [user, folderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let foldersQuery = supabase
        .from("folders")
        .select(`
          *, 
          created_by_profile:profiles!folders_created_by_fkey(full_name),
          files(count)
        `);

      if (folderId) {
        foldersQuery = foldersQuery.eq("parent_id", folderId);
      } else {
        foldersQuery = foldersQuery.is("parent_id", null);
      }

      const { data: foldersData } = await foldersQuery.order("name");

      let filesQuery = supabase
        .from("files")
        .select("*, uploader_profile:profiles!files_uploaded_by_fkey(full_name)");

      if (folderId) {
        filesQuery = filesQuery.eq("folder_id", folderId);
      } else {
        filesQuery = filesQuery.is("folder_id", null);
      }

      const { data: filesData } = await filesQuery.order("created_at", { ascending: false });

      setFolders(foldersData || []);
      setFiles(filesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    const { data } = await supabase
      .from("favorites")
      .select("file_id")
      .eq("user_id", user?.id);

    if (data) {
      setFavorites(new Set(data.map((f) => f.file_id)));
    }
  };

  const loadBreadcrumb = async (currentFolderId: string) => {
    const path: any[] = [];
    let fId: string | null = currentFolderId;

    while (fId) {
      const { data } = await supabase
        .from("folders")
        .select("*")
        .eq("id", fId)
        .maybeSingle();

      if (data) {
        path.unshift(data);
        fId = data.parent_id;
      } else {
        break;
      }
    }

    setBreadcrumb(path);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    const { error } = await supabase.from("folders").insert({
      name: newFolderName,
      parent_id: folderId || null,
      created_by: user?.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Folder created successfully!",
      });
      setNewFolderName("");
      setFolderDialogOpen(false);
      loadData();
    }
  };

  const handleFolderClick = (id: string) => {
    navigate(`/?folder=${id}`);
  };

  const handleFileClick = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    await supabase.from("files").update({
      access_count: file.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    }).eq("id", fileId);

    await supabase.from("file_access_logs").insert({
      file_id: fileId,
      user_id: user?.id,
      action: "view",
    });

    setPreviewFile(file);
    loadData();
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.storage_path);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);

        await Promise.all([
          supabase.from("file_access_logs").insert({
            file_id: file.id,
            user_id: user?.id,
            action: "download",
          }),
          supabase.from("files").update({
            access_count: file.access_count + 1,
            last_accessed_at: new Date().toISOString(),
          }).eq("id", file.id)
        ]);

        toast({
          title: "Success",
          description: "File downloaded successfully!",
        });

        await loadData();
      }
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: "folder" | "file", id: string) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete this ${type}?`
    );
    if (!confirmed) return;

    if (type === "folder") {
      const { error } = await supabase.from("folders").delete().eq("id", id);
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Folder deleted" });
        loadData();
      }
    } else {
      const file = files.find((f) => f.id === id);
      if (file) {
        await supabase.storage.from("files").remove([file.storage_path]);
        await supabase.from("files").delete().eq("id", id);
        toast({ title: "Success", description: "File deleted" });
        loadData();
      }
    }
  };

  const handleToggleFavorite = async (fileId: string) => {
    if (favorites.has(fileId)) {
      await supabase
        .from("favorites")
        .delete()
        .eq("file_id", fileId)
        .eq("user_id", user?.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    } else {
      await supabase.from("favorites").insert({
        file_id: fileId,
        user_id: user?.id,
      });
      setFavorites((prev) => new Set(prev).add(fileId));
    }
  };

  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    try {
      const { error } = await supabase
        .from("files")
        .update({ folder_id: targetFolderId })
        .eq("id", fileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File moved successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error moving file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("files")
        .update({ name: newName })
        .eq("id", fileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File renamed successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error renaming file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("folders")
        .update({ name: newName })
        .eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error renaming folder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyFile = async (file: any) => {
    try {
      // Download the original file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("files")
        .download(file.storage_path);

      if (downloadError) throw downloadError;

      // Generate new storage path
      const fileExt = file.name.split(".").pop();
      const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const newFilePath = folderId
        ? `${folderId}/${newFileName}`
        : `root/${newFileName}`;

      // Upload copy
      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(newFilePath, fileData);

      if (uploadError) throw uploadError;

      // Create new file record
      const copyName = `${file.name.replace(/\.[^/.]+$/, "")} (copy).${fileExt}`;
      const { error: dbError } = await supabase.from("files").insert({
        folder_id: folderId || null,
        name: copyName,
        storage_path: newFilePath,
        file_type: file.file_type,
        file_size: file.file_size,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File copied successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error copying file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = (file: any) => {
    setShareFile(file);
  };

  const handleToggleSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    const selectedFilesList = files.filter(f => selectedFiles.has(f.id));
    for (const file of selectedFilesList) {
      await handleDownload(file);
    }
    setSelectedFiles(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} file(s)?`
    );
    if (!confirmed) return;

    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId);
      if (file) {
        await supabase.storage.from("files").remove([file.storage_path]);
        await supabase.from("files").delete().eq("id", fileId);
      }
    }

    toast({ title: "Success", description: `${selectedFiles.size} files deleted` });
    setSelectedFiles(new Set());
    setSelectionMode(false);
    loadData();
  };

  const handleBulkMove = async (targetFolderId: string | null) => {
    for (const fileId of selectedFiles) {
      await supabase
        .from("files")
        .update({ folder_id: targetFolderId })
        .eq("id", fileId);
    }

    toast({ title: "Success", description: `${selectedFiles.size} files moved` });
    setSelectedFiles(new Set());
    setSelectionMode(false);
    loadData();
  };

  const sortFiles = (filesList: any[]) => {
    const sorted = [...filesList];
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "date":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "size":
        return sorted.sort((a, b) => b.file_size - a.file_size);
      case "type":
        return sorted.sort((a, b) => a.file_type.localeCompare(b.file_type));
      default:
        return sorted;
    }
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAndSortedFiles = sortFiles(
    files.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumb.map((folder, index) => (
                  <span key={folder.id} className="contents">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumb.length - 1 ? (
                        <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={`/?folder=${folder.id}`}>
                          {folder.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold">
              {folderId ? breadcrumb[breadcrumb.length - 1]?.name : "All Files"}
            </h1>
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedFiles(new Set());
              }}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectionMode ? "Cancel" : "Select"}
            </Button>
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && createFolder()}
                  />
                  <Button onClick={createFolder} className="w-full">
                    Create Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectionMode && (
          <BulkOperationsBar
            selectedCount={selectedFiles.size}
            onClear={() => setSelectedFiles(new Set())}
            onDownloadAll={handleBulkDownload}
            onDeleteAll={handleBulkDelete}
            onMoveAll={handleBulkMove}
            folders={folders}
            currentFolderId={folderId}
            isAdmin={isAdmin}
          />
        )}

        <Tabs defaultValue="single" className="w-full">
          <TabsList>
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <FileUpload folderId={folderId || undefined} onUploadComplete={loadData} />
          </TabsContent>
          <TabsContent value="bulk">
            <BulkFileUpload folderId={folderId || undefined} onUploadComplete={loadData} />
          </TabsContent>
        </Tabs>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <FolderGrid
            folders={filteredFolders}
            files={filteredAndSortedFiles}
            onFolderClick={handleFolderClick}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onMoveFile={handleMoveFile}
            onRenameFile={handleRenameFile}
            onRenameFolder={handleRenameFolder}
            onCopyFile={handleCopyFile}
            onShare={handleShare}
            allFolders={folders}
            currentFolderId={folderId}
            isAdmin={isAdmin}
            favorites={favorites}
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedFiles={selectedFiles}
            onToggleSelect={handleToggleSelect}
          />
        )}

        {!loading && filteredFolders.length === 0 && filteredAndSortedFiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery
              ? "No files or folders match your search"
              : "No files or folders yet"}
          </div>
        )}

        {previewFile && (
          <FilePreviewDialog
            file={previewFile}
            open={!!previewFile}
            onClose={() => setPreviewFile(null)}
            onDownload={() => handleDownload(previewFile)}
          />
        )}

        {shareFile && (
          <FileShareDialog
            file={shareFile}
            open={!!shareFile}
            onClose={() => setShareFile(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
