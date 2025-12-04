import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, AlertCircle, Loader2 } from "lucide-react";

const SharePage = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [fileData, setFileData] = useState<any>(null);

  useEffect(() => {
    loadShareLink();
  }, [token]);

  const loadShareLink = async () => {
    if (!token) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    try {
      const { data: share, error: shareError } = await supabase
        .from("file_share_links")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (shareError) throw shareError;

      if (!share) {
        setError("Share link not found or has been deactivated");
        setLoading(false);
        return;
      }

      // Check if expired
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        setError("This share link has expired");
        setLoading(false);
        return;
      }

      // Check download limit
      if (share.download_limit && share.download_count >= share.download_limit) {
        setError("This share link has reached its download limit");
        setLoading(false);
        return;
      }

      setShareData(share);

      // Get file data
      const { data: file, error: fileError } = await supabase
        .from("files")
        .select("*")
        .eq("id", share.file_id)
        .single();

      if (fileError) throw fileError;

      setFileData(file);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileData || !shareData) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(fileData.storage_path);

      if (error) throw error;

      // Update download count
      await supabase
        .from("file_share_links")
        .update({ download_count: shareData.download_count + 1 })
        .eq("id", shareData.id);

      // Create download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.name;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file is being downloaded",
      });

      // Reload to update download count
      loadShareLink();
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Shared File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-6 bg-primary/10 rounded-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg truncate max-w-full">
                {fileData?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(fileData?.file_size || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {shareData?.expires_at && (
              <p>
                Expires: {new Date(shareData.expires_at).toLocaleDateString()}
              </p>
            )}
            {shareData?.download_limit && (
              <p>
                Downloads: {shareData.download_count} / {shareData.download_limit}
              </p>
            )}
          </div>

          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="w-full"
            size="lg"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download File
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharePage;