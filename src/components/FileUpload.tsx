import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FileUploadProps {
  folderId?: string;
  onUploadComplete: () => void;
}

const FileUpload = ({ folderId, onUploadComplete }: FileUploadProps) => {
  const { user } = useAuth();
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
    if (!user || selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = folderId
          ? `${folderId}/${fileName}`
          : `root/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert file metadata
        const { error: dbError } = await supabase.from("files").insert({
          folder_id: folderId || null,
          name: file.name,
          storage_path: filePath,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;

        setProgress(((i + 1) / totalFiles) * 100);
      }

      toast({
        title: "Success",
        description: `${totalFiles} file(s) uploaded successfully!`,
      });

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
            Upload {selectedFiles.length} file(s)
          </Button>
        )}
      </div>

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
                  {(file.size / 1024 / 1024).toFixed(2)} MB
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
