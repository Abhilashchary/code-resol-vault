import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Recent = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
      loadFavorites();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("files")
      .select("*")
      .order("last_accessed_at", { ascending: false, nullsFirst: false })
      .limit(50);

    setFiles(data || []);
    setLoading(false);
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

  const handleFileClick = async (fileId: string) => {
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

    const file = files.find((f) => f.id === id);
    if (file) {
      await supabase.storage.from("files").remove([file.storage_path]);
      await supabase.from("files").delete().eq("id", id);
      toast({ title: "Success", description: "File deleted" });
      loadData();
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recent Files</h1>
          <p className="text-muted-foreground">Files sorted by recent access</p>
        </div>

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
            isAdmin={isAdmin}
            favorites={favorites}
          />
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No recently accessed files
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Recent;
