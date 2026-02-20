import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import FileShareDialog from "@/components/FileShareDialog";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";

const Favorites = () => {
  const { username, isAdmin } = useGuestAuth();
  const { toast } = useToast();

  usePageMeta({
    title: "Favorite Files | ResolGate",
    description:
      "View your favorite files in ResolGate. Star important documents for quick access and manage them anytime.",
    canonicalPath: "/favorites",
  });

  const [files, setFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [shareFile, setShareFile] = useState<any>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);

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
        setFiles([]);
        setFavorites(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);
      const id = await ensureGuestUserId();
      if (cancelled) return;

      setGuestUserId(id);
      await loadData(id);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadData = async (userId: string | null) => {
    setLoading(true);
    try {
      if (!userId) {
        setFiles([]);
        setFavorites(new Set());
        return;
      }

      const { data: favRows, error: favError } = await supabase
        .from("favorites")
        .select("file_id")
        .eq("user_id", userId);

      if (favError) throw favError;

      const fileIds = (favRows || []).map((r) => r.file_id).filter(Boolean);
      setFavorites(new Set(fileIds));

      if (fileIds.length === 0) {
        setFiles([]);
        return;
      }

      const { data: filesData, error: filesError } = await supabase
        .from("files")
        .select("*")
        .in("id", fileIds);

      if (filesError) throw filesError;
      setFiles(filesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load favorites",
        variant: "destructive",
      });
      setFiles([]);
      setFavorites(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    await Promise.all([
      supabase
        .from("files")
        .update({
          access_count: (file.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", fileId),
      supabase.from("file_access_logs").insert({
        file_id: fileId,
        user_id: guestUserId,
        action: "view",
      }),
    ]);

    setPreviewFile(file);
  };

  const handleDownload = async (file: any) => {
    const { data, error } = await supabase.storage
      .from("files")
      .download(file.storage_path);

    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      await supabase.from("file_access_logs").insert({
        file_id: file.id,
        user_id: guestUserId,
        action: "download",
      });
    }
  };

  const handleDelete = async (_type: "folder" | "file", id: string) => {
    if (!isAdmin) return;

    const file = files.find((f) => f.id === id);
    if (!file) return;

    await supabase.storage.from("files").remove([file.storage_path]);
    await supabase.from("files").delete().eq("id", id);
    toast({ title: "Success", description: "File deleted" });
    loadData(guestUserId);
  };

  const handleToggleFavorite = async (fileId: string) => {
    if (!guestUserId) return;

    // Optimistically remove from UI immediately
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("file_id", fileId)
        .eq("user_id", guestUserId);

      if (error) throw error;
    } catch (error: any) {
      // Rollback on failure
      await loadData(guestUserId);
      toast({
        title: "Favorites error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const handleShare = (file: any) => {
    setShareFile(file);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Favorite Files</h1>
          <p className="text-muted-foreground">Your starred files</p>
        </header>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <FolderGrid
            folders={[]}
            files={files}
            onFolderClick={() => {}}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onMoveFile={() => {}}
            onShare={handleShare}
            allFolders={[]}
            isAdmin={isAdmin}
            favorites={favorites}
          />
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No favorite files yet</div>
        )}
      </div>

      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={() => previewFile && handleDownload(previewFile)}
      />

      <FileShareDialog file={shareFile} open={!!shareFile} onClose={() => setShareFile(null)} />
    </Layout>
  );
};

export default Favorites;

