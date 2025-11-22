import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import FolderGrid from "@/components/FolderGrid";
import { useToast } from "@/hooks/use-toast";

const Favorites = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: favData } = await supabase
      .from("favorites")
      .select("file_id, files(*)")
      .eq("user_id", user?.id);

    if (favData) {
      const filesList = favData.map((item: any) => item.files).filter(Boolean);
      setFiles(filesList);
      setFavorites(new Set(favData.map((item: any) => item.file_id)));
    }
    setLoading(false);
  };

  const handleFileClick = async (fileId: string) => {
    await supabase.from("file_access_logs").insert({
      file_id: fileId,
      user_id: user?.id,
      action: "view",
    });
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
    await supabase
      .from("favorites")
      .delete()
      .eq("file_id", fileId)
      .eq("user_id", user?.id);
    loadData();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Favorite Files</h1>
          <p className="text-muted-foreground">Your starred files</p>
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
            No favorite files yet
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
