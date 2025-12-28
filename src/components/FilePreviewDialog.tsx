import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Image, Video, Music, File as FileIcon, User, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface FilePreviewDialogProps {
  file: any;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

const FilePreviewDialog = ({ file, open, onClose, onDownload }: FilePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && file) {
      loadPreview();
    }
    return () => {
      setPreviewUrl(null);
      setError(null);
    };
  }, [open, file]);

  const loadPreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      // Use public URL for faster preview (bucket is public)
      const { data } = supabase.storage
        .from("files")
        .getPublicUrl(file.storage_path);

      if (data?.publicUrl) {
        setPreviewUrl(data.publicUrl);
      } else {
        setError("Could not generate preview URL");
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      setError("Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const getFileIcon = (fileType: string) => {
    if (!fileType) return <FileIcon className="h-6 w-6" />;
    if (fileType.startsWith("image/")) return <Image className="h-6 w-6" />;
    if (fileType.startsWith("video/")) return <Video className="h-6 w-6" />;
    if (fileType.startsWith("audio/")) return <Music className="h-6 w-6" />;
    if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-6 w-6" />;
    return <FileIcon className="h-6 w-6" />;
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Skeleton className="w-full h-48 rounded-lg" />
          <Skeleton className="w-32 h-4" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-destructive">
          {getFileIcon(file?.file_type)}
          <p>{error}</p>
          <Button variant="outline" onClick={loadPreview}>
            Retry
          </Button>
        </div>
      );
    }

    if (!previewUrl || !file) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          {getFileIcon(file?.file_type)}
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      );
    }

    const fileType = file.file_type || "";

    if (fileType.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-w-full max-h-[500px] mx-auto object-contain rounded-lg"
          onError={() => setError("Failed to load image")}
        />
      );
    }

    if (fileType.startsWith("video/")) {
      return (
        <video
          src={previewUrl}
          controls
          className="max-w-full max-h-[500px] mx-auto rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (fileType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-4 p-8">
          <Music className="h-24 w-24 text-muted-foreground" />
          <audio src={previewUrl} controls className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (fileType === "application/pdf") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[500px] border rounded-lg"
          title={file.name}
        />
      );
    }

    if (fileType.startsWith("text/")) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[500px] border rounded-lg bg-muted"
          title={file.name}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {getFileIcon(fileType)}
        <p className="text-muted-foreground">Preview not available for this file type</p>
        <Button variant="outline" onClick={openInNewTab}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>
    );
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{formatFileSize(file.file_size)}</Badge>
                <Badge variant="outline">{file.file_type}</Badge>
                {file.uploader_profile?.full_name && (
                  <Badge variant="secondary">
                    <User className="h-3 w-3 mr-1" />
                    {file.uploader_profile.full_name}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0 absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {renderPreview()}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onDownload} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {previewUrl && (
            <Button variant="outline" onClick={openInNewTab}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          )}
        </div>

        {file.description && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{file.description}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {file.uploader_profile?.full_name && (
            <div>
              <p className="text-muted-foreground">Uploaded By</p>
              <p className="font-medium">{file.uploader_profile.full_name}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Uploaded</p>
            <p>{new Date(file.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Accessed</p>
            <p>
              {file.last_accessed_at
                ? new Date(file.last_accessed_at).toLocaleString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Access Count</p>
            <p>{file.access_count || 0} times</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
