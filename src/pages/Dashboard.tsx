import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus, Search, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("parent_id", folderId || null)
        .order("name");

      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folderId || null)
        .order("created_at", { ascending: false });

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
        .single();

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
    if (file) {
      await supabase.from("files").update({
        access_count: file.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      }).eq("id", fileId);
    }

    await supabase.from("file_access_logs").insert({
      file_id: fileId,
      user_id: user?.id,
      action: "view",
    });

    loadData();
  };

  const handleDownload = async (file: any) => {
    const { data } = await supabase.storage
      .from("files")
      .download(file.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();

      await supabase.from("file_access_logs").insert({
        file_id: file.id,
        user_id: user?.id,
        action: "download",
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

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem key={folder.id}>
                      {index === breadcrumb.length - 1 ? (
                        <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={`/?folder=${folder.id}`}>
                          {folder.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold">
              {folderId ? breadcrumb[breadcrumb.length - 1]?.name : "All Files"}
            </h1>
          </div>

          <div className="flex gap-2">
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
        </div>

        <FileUpload folderId={folderId || undefined} onUploadComplete={loadData} />

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <FolderGrid
            folders={filteredFolders}
            files={filteredFiles}
            onFolderClick={handleFolderClick}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            isAdmin={isAdmin}
            favorites={favorites}
          />
        )}

        {!loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery
              ? "No files or folders match your search"
              : "No files or folders yet"}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
