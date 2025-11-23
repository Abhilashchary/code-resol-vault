import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Image, Video, Music, File as FileIcon, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilePreviewDialogProps {
  file: any;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

const FilePreviewDialog = ({ file, open, onClose, onDownload }: FilePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && file) {
      loadPreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, file]);

  const loadPreview = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const { data } = await supabase.storage
        .from("files")
        .download(file.storage_path);

      if (data) {
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Error loading preview:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-6 w-6" />;
    if (fileType.startsWith("video/")) return <Video className="h-6 w-6" />;
    if (fileType.startsWith("audio/")) return <Music className="h-6 w-6" />;
    if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-6 w-6" />;
    return <FileIcon className="h-6 w-6" />;
  };

  const renderPreview = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-64">Loading preview...</div>;
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          {getFileIcon(file.file_type)}
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      );
    }

    if (file.file_type.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-w-full max-h-[500px] mx-auto object-contain"
        />
      );
    }

    if (file.file_type.startsWith("video/")) {
      return (
        <video
          src={previewUrl}
          controls
          className="max-w-full max-h-[500px] mx-auto"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (file.file_type.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-4">
          <Music className="h-24 w-24 text-muted-foreground" />
          <audio src={previewUrl} controls className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (file.file_type === "application/pdf") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[500px] border rounded"
          title={file.name}
        />
      );
    }

    if (file.file_type.startsWith("text/")) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[500px] border rounded"
          title={file.name}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {getFileIcon(file.file_type)}
        <p className="text-muted-foreground">Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{file?.name}</DialogTitle>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{formatFileSize(file?.file_size || 0)}</Badge>
                <Badge variant="outline">{file?.file_type}</Badge>
                {file?.uploader_profile?.full_name && (
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
              className="flex-shrink-0"
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
        </div>

        {file?.description && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{file.description}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {file?.uploader_profile?.full_name && (
            <div>
              <p className="text-muted-foreground">Uploaded By</p>
              <p className="font-medium">{file.uploader_profile.full_name}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Uploaded</p>
            <p>{new Date(file?.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Accessed</p>
            <p>
              {file?.last_accessed_at
                ? new Date(file.last_accessed_at).toLocaleString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Access Count</p>
            <p>{file?.access_count || 0} times</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
