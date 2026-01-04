import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useGuestAuth } from "@/hooks/useGuestAuth";

interface FileUploadProps {
  folderId?: string;
  onUploadComplete: () => void;
}

const FileUpload = ({ folderId, onUploadComplete }: FileUploadProps) => {
  const { username, isAdmin } = useGuestAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!username || selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let successCount = 0;
      let pendingCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        try {
          if (isAdmin) {
            // Admin uploads go directly
            const filePath = folderId
              ? `${folderId}/${fileName}`
              : `root/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("files").insert({
              folder_id: folderId || null,
              name: file.name,
              storage_path: filePath,
              file_type: file.type || "application/octet-stream",
              file_size: file.size,
              submitted_by: username,
            });

            if (dbError) throw dbError;
            successCount++;
          } else {
            // User uploads go to pending
            const pendingPath = `pending/${username}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(pendingPath, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("pending_actions").insert({
              action_type: "upload",
              item_type: "file",
              temp_storage_path: pendingPath,
              original_filename: file.name,
              file_type: file.type || "application/octet-stream",
              file_size: file.size,
              folder_id: folderId || null,
              submitted_by: username,
            });

            if (dbError) throw dbError;
            pendingCount++;
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          failCount++;
        }

        setProgress(((i + 1) / totalFiles) * 100);
      }

      if (isAdmin && successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        });
      } else if (!isAdmin && pendingCount > 0) {
        toast({
          title: "Upload Submitted for Approval",
          description: `${pendingCount} file(s) submitted for admin approval${failCount > 0 ? `, ${failCount} failed` : ""}`,
        });
      } else if (failCount > 0) {
        toast({
          title: "Upload Failed",
          description: "No files were uploaded successfully",
          variant: "destructive",
        });
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Select Files
        </Button>
        {selectedFiles.length > 0 && (
          <Button onClick={handleUpload} disabled={uploading}>
            {isAdmin ? `Upload ${selectedFiles.length} file(s)` : `Submit ${selectedFiles.length} file(s)`}
          </Button>
        )}
      </div>

      {!isAdmin && selectedFiles.length > 0 && (
        <p className="text-xs text-amber-600">
          Uploads will require admin approval
        </p>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1 truncate">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
