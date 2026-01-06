import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { useClipboard } from "@/hooks/useClipboard";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import FileUpload from "@/components/FileUpload";
import BulkFileUpload from "@/components/BulkFileUpload";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import FileShareDialog from "@/components/FileShareDialog";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import RenameDialog from "@/components/RenameDialog";
import FolderTreePicker from "@/components/FolderTreePicker";
import ClipboardIndicator from "@/components/ClipboardIndicator";
import UserPendingStatus from "@/components/UserPendingStatus";
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
  const { username, isAdmin } = useGuestAuth();
  const { clipboardItem, copy, cut, clear } = useClipboard();
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
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Rename dialog state
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    type: "file" | "folder";
    id: string;
    currentName: string;
  } | null>(null);
  
  // Move folder dialog state
  const [moveFolderDialog, setMoveFolderDialog] = useState<{
    open: boolean;
    folderId: string;
  } | null>(null);

  const ensureGuestUserId = async (): Promise<string | null> => {
    if (!username) return null;

    const { data, error } = await supabase
      .from("guest_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }

    if (data?.id) return data.id as string;

    const { error: upsertError } = await supabase
      .from("guest_users")
      .upsert({ username }, { onConflict: "username" });

    if (upsertError) {
      toast({ title: "Error", description: upsertError.message, variant: "destructive" });
      return null;
    }

    const { data: afterUpsert } = await supabase
      .from("guest_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    return (afterUpsert?.id as string | undefined) ?? null;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!username) {
        setGuestUserId(null);
        setFavorites(new Set());
        setLoading(false);
        return;
      }

      const id = await ensureGuestUserId();
      if (cancelled) return;

      setGuestUserId(id);
      await Promise.all([loadData(), loadFavorites(id)]);

      if (folderId) {
        await loadBreadcrumb(folderId);
      } else {
        setBreadcrumb([]);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, folderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let foldersQuery = supabase
        .from("folders")
        .select("*, files(count)");

      if (folderId) {
        foldersQuery = foldersQuery.eq("parent_id", folderId);
      } else {
        foldersQuery = foldersQuery.is("parent_id", null);
      }

      const { data: foldersData } = await foldersQuery.order("name");

      // Get subfolder counts
      const foldersWithCounts = await Promise.all(
        (foldersData || []).map(async (folder) => {
          const { count } = await supabase
            .from("folders")
            .select("*", { count: "exact", head: true })
            .eq("parent_id", folder.id);
          return { ...folder, subfolderCount: count || 0 };
        })
      );

      let filesQuery = supabase.from("files").select("*");

      if (folderId) {
        filesQuery = filesQuery.eq("folder_id", folderId);
      } else {
        filesQuery = filesQuery.is("folder_id", null);
      }

      const { data: filesData } = await filesQuery.order("created_at", { ascending: false });

      setFolders(foldersWithCounts);
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

  const loadFavorites = async (userId: string | null) => {
    if (!userId) {
      setFavorites(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("file_id")
      .eq("user_id", userId);

    if (!error) {
      setFavorites(new Set((data || []).map((f) => f.file_id)));
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
      submitted_by: username,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Folder created successfully!" });
      setNewFolderName("");
      setFolderDialogOpen(false);
      loadData();
    }
  };

  const handleFolderClick = (id: string) => navigate(`/?folder=${id}`);
  
  const handleFileClick = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    await supabase.from("files").update({
      access_count: file.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    }).eq("id", fileId);
    setPreviewFile(file);
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage.from("files").download(file.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "File downloaded!" });
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (type: "folder" | "file", id: string) => {
    if (isAdmin) {
      const confirmed = window.confirm(`Delete this ${type}?`);
      if (!confirmed) return;
      
      if (type === "folder") {
        await supabase.from("folders").delete().eq("id", id);
      } else {
        const file = files.find(f => f.id === id);
        if (file) {
          await supabase.storage.from("files").remove([file.storage_path]);
          await supabase.from("files").delete().eq("id", id);
        }
      }
      toast({ title: "Deleted" });
      loadData();
    } else {
      // Submit delete request
      await supabase.from("pending_actions").insert({
        action_type: "delete",
        item_type: type,
        item_id: id,
        submitted_by: username,
      });
      toast({ title: "Delete request submitted", description: "Waiting for admin approval" });
    }
  };

  const handleToggleFavorite = async (fileId: string) => {
    if (!guestUserId) {
      toast({
        title: "Favorites",
        description: "Please re-enter to enable favorites",
        variant: "destructive",
      });
      return;
    }

    try {
      if (favorites.has(fileId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("file_id", fileId)
          .eq("user_id", guestUserId);

        if (error) throw error;

        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      } else {
        const { error } = await supabase.from("favorites").insert({
          file_id: fileId,
          user_id: guestUserId,
        });

        if (error) throw error;

        setFavorites((prev) => new Set(prev).add(fileId));
      }
    } catch (error: any) {
      toast({
        title: "Favorites error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    await supabase.from("files").update({ folder_id: targetFolderId }).eq("id", fileId);
    toast({ title: "File moved" });
    loadData();
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog) return;
    const table = renameDialog.type === "file" ? "files" : "folders";
    await supabase.from(table).update({ name: newName }).eq("id", renameDialog.id);
    toast({ title: "Renamed successfully" });
    loadData();
  };

  const handleCopy = (type: "folder" | "file", item: any) => {
    copy({ type, id: item.id, name: item.name, data: item });
    toast({ title: "Copied to clipboard" });
  };

  const handleCut = (type: "folder" | "file", item: any) => {
    cut({ type, id: item.id, name: item.name, data: item });
    toast({ title: "Cut to clipboard" });
  };

  const handlePaste = async () => {
    if (!clipboardItem) return;
    
    try {
      if (clipboardItem.type === "file") {
        if (clipboardItem.operation === "cut") {
          await supabase.from("files").update({ folder_id: folderId }).eq("id", clipboardItem.id);
        } else {
          // Copy file
          const file = clipboardItem.data;
          const { data } = await supabase.storage.from("files").download(file.storage_path);
          if (data) {
            const newPath = `${folderId || "root"}/${Date.now()}_${file.name}`;
            await supabase.storage.from("files").upload(newPath, data);
            await supabase.from("files").insert({
              name: file.name,
              file_type: file.file_type,
              file_size: file.file_size,
              storage_path: newPath,
              folder_id: folderId,
              submitted_by: username,
            });
          }
        }
      } else {
        if (clipboardItem.operation === "cut") {
          await supabase.from("folders").update({ parent_id: folderId }).eq("id", clipboardItem.id);
        }
      }
      clear();
      toast({ title: "Pasted successfully" });
      loadData();
    } catch (error: any) {
      toast({ title: "Paste failed", description: error.message, variant: "destructive" });
    }
  };

  const handleMoveFolder = async (targetFolderId: string | null) => {
    if (!moveFolderDialog) return;
    await supabase.from("folders").update({ parent_id: targetFolderId }).eq("id", moveFolderDialog.folderId);
    toast({ title: "Folder moved" });
    setMoveFolderDialog(null);
    loadData();
  };

  const sortFiles = (filesList: any[]) => {
    const sorted = [...filesList];
    switch (sortBy) {
      case "name": return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "date": return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "size": return sorted.sort((a, b) => b.file_size - a.file_size);
      default: return sorted;
    }
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = sortFiles(files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <Layout>
      <div className="space-y-6">
        <UserPendingStatus />
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/"><Home className="h-4 w-4" /></Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumb.map((folder, index) => (
                  <span key={folder.id} className="contents">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumb.length - 1 ? (
                        <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={`/?folder=${folder.id}`}>{folder.name}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold">{folderId ? breadcrumb[breadcrumb.length - 1]?.name : "All Files"}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant={selectionMode ? "secondary" : "outline"} onClick={() => { setSelectionMode(!selectionMode); setSelectedFiles(new Set()); }}>
              <CheckSquare className="mr-2 h-4 w-4" />{selectionMode ? "Cancel" : "Select"}
            </Button>
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild><Button><FolderPlus className="mr-2 h-4 w-4" />New Folder</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyPress={(e) => e.key === "Enter" && createFolder()} />
                  <Button onClick={createFolder} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-md p-1">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs defaultValue="bulk" className="w-full">
          <TabsList>
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk/Folder Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="single"><FileUpload folderId={folderId || undefined} onUploadComplete={loadData} /></TabsContent>
          <TabsContent value="bulk"><BulkFileUpload folderId={folderId || undefined} onUploadComplete={loadData} /></TabsContent>
        </Tabs>

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
            onMoveFile={handleMoveFile}
            onShare={setShareFile}
            onRename={(type, id, name) => setRenameDialog({ open: true, type, id, currentName: name })}
            onCopy={handleCopy}
            onCut={handleCut}
            onMoveFolder={(id) => setMoveFolderDialog({ open: true, folderId: id })}
            allFolders={folders}
            currentFolderId={folderId}
            isAdmin={isAdmin}
            username={username || ""}
            favorites={favorites}
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedFiles={selectedFiles}
            onToggleSelect={(id) => setSelectedFiles(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
          />
        )}

        {!loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">{searchQuery ? "No matches" : "No files yet"}</div>
        )}

        <ClipboardIndicator onPaste={handlePaste} />

        {previewFile && <FilePreviewDialog file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} onDownload={() => handleDownload(previewFile)} />}
        {shareFile && <FileShareDialog file={shareFile} open={!!shareFile} onClose={() => setShareFile(null)} />}
        {renameDialog && <RenameDialog open={renameDialog.open} onOpenChange={(open) => !open && setRenameDialog(null)} currentName={renameDialog.currentName} itemType={renameDialog.type} onRename={handleRename} />}
        {moveFolderDialog && <FolderTreePicker open={moveFolderDialog.open} onOpenChange={(open) => !open && setMoveFolderDialog(null)} onSelect={handleMoveFolder} excludeFolderId={moveFolderDialog.folderId} />}
        
        {selectionMode && <BulkOperationsBar selectedCount={selectedFiles.size} onClear={() => setSelectedFiles(new Set())} onDownloadAll={async () => { for (const id of selectedFiles) { const f = files.find(x => x.id === id); if (f) await handleDownload(f); } }} onDeleteAll={async () => { for (const id of selectedFiles) await handleDelete("file", id); setSelectedFiles(new Set()); setSelectionMode(false); }} onMoveAll={async (targetId) => { for (const id of selectedFiles) await handleMoveFile(id, targetId); setSelectedFiles(new Set()); setSelectionMode(false); }} folders={folders} currentFolderId={folderId} isAdmin={isAdmin} />}
      </div>
    </Layout>
  );
};

export default Dashboard;
