import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import FilePreviewDialog from "@/components/FilePreviewDialog";

import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";

const Recent = () => {
  const { username, isAdmin } = useGuestAuth();
  const { toast } = useToast();

  usePageMeta({
    title: "Recent Files | ResolGate",
    description:
      "Browse recent files in ResolGate. Quickly preview, download, and manage recently accessed documents.",
    canonicalPath: "/recent",
  });

  const [files, setFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);

  const ensureGuestUserId = async (): Promise<string | null> => {
    if (!username) return null;

    // Entry page should have created this row, but we resolve it here as well.
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
      await Promise.all([loadData(), loadFavorites(id)]);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("last_accessed_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load files",
        variant: "destructive",
      });
      setFiles([]);
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
    loadData();
  };

  const handleToggleFavorite = async (fileId: string) => {
    // If the user clicks before guestUserId is resolved, resolve it on-demand.
    const resolvedUserId = guestUserId ?? (await ensureGuestUserId());

    if (!resolvedUserId) {
      toast({
        title: "Favorites",
        description: "Please re-enter to enable favorites",
        variant: "destructive",
      });
      return;
    }

    if (!guestUserId) setGuestUserId(resolvedUserId);

    try {
      if (favorites.has(fileId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("file_id", fileId)
          .eq("user_id", resolvedUserId);

        if (error) throw error;

        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
        return;
      }

      const { error } = await supabase
        .from("favorites")
        .upsert(
          { file_id: fileId, user_id: resolvedUserId },
          { onConflict: "user_id,file_id" }
        );

      if (error) throw error;

      setFavorites((prev) => new Set(prev).add(fileId));
    } catch (error: any) {
      toast({
        title: "Favorites error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const handleShare = (file: any) => {
    const { data } = supabase.storage.from("files").getPublicUrl(file.storage_path);
    navigator.clipboard.writeText(data.publicUrl).then(() => {
      toast({ title: "Link copied!", description: "Public link copied to clipboard" });
    }).catch(() => {
      toast({ title: "Share link", description: data.publicUrl });
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Recent Files</h1>
          <p className="text-muted-foreground">Files sorted by recent access</p>
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
          <div className="text-center py-12 text-muted-foreground">No recently accessed files</div>
        )}
      </div>

      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={() => previewFile && handleDownload(previewFile)}
      />

      
    </Layout>
  );
};

export default Recent;

