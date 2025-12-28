import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag } from "lucide-react";
import FolderGrid from "@/components/FolderGrid";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import FileShareDialog from "@/components/FileShareDialog";
import { useToast } from "@/hooks/use-toast";

const Tags = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [tagFiles, setTagFiles] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [shareFile, setShareFile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadTags();
      loadFavorites();
    }
  }, [user]);

  const loadTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tags")
      .select(`
        *,
        file_tags(count)
      `)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load tags", variant: "destructive" });
    }
    setTags(data || []);
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

  const loadTagFiles = async (tag: any) => {
    setSelectedTag(tag);
    setLoading(true);

    const { data, error } = await supabase
      .from("file_tags")
      .select("files(*, uploader_profile:profiles!files_uploaded_by_fkey(full_name))")
      .eq("tag_id", tag.id);

    if (error) {
      toast({ title: "Error", description: "Failed to load files", variant: "destructive" });
    }

    const files = data?.map((item: any) => item.files).filter(Boolean) || [];
    setTagFiles(files);
    setLoading(false);
  };

  const handleFileClick = async (fileId: string) => {
    const file = tagFiles.find((f) => f.id === fileId);
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
        user_id: user?.id,
        action: "view",
      }),
    ]);

    setPreviewFile(file);
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
      URL.revokeObjectURL(url);

      await supabase.from("file_access_logs").insert({
        file_id: file.id,
        user_id: user?.id,
        action: "download",
      });
    }
  };

  const handleDelete = async (type: "folder" | "file", id: string) => {
    if (!isAdmin) return;

    const file = tagFiles.find((f) => f.id === id);
    if (file) {
      await supabase.storage.from("files").remove([file.storage_path]);
      await supabase.from("files").delete().eq("id", id);
      toast({ title: "Success", description: "File deleted" });
      if (selectedTag) {
        loadTagFiles(selectedTag);
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

  const handleShare = (file: any) => {
    setShareFile(file);
  };

  const handleBackToTags = () => {
    setSelectedTag(null);
    setTagFiles([]);
  };

  // Show files for selected tag
  if (selectedTag) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackToTags}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h1 className="text-3xl font-bold">{selectedTag.name}</h1>
              </div>
              <p className="text-muted-foreground">
                {tagFiles.length} file{tagFiles.length !== 1 ? "s" : ""} with this tag
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <FolderGrid
              folders={[]}
              files={tagFiles}
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

          {!loading && tagFiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No files with this tag
            </div>
          )}
        </div>

        <FilePreviewDialog
          file={previewFile}
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => previewFile && handleDownload(previewFile)}
        />

        <FileShareDialog
          file={shareFile}
          open={!!shareFile}
          onClose={() => setShareFile(null)}
        />
      </Layout>
    );
  }

  // Show tag grid
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground">Browse files by tags</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tags.map((tag) => (
              <Card 
                key={tag.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => loadTagFiles(tag)}
              >
                <CardContent className="p-6">
                  <Badge className="mb-2">{tag.name}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {tag.file_tags?.[0]?.count || 0} files
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && tags.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tags created yet
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tags;
