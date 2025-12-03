import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileUp, FolderUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface BulkFileUploadProps {
  folderId?: string;
  onUploadComplete: () => void;
}

const BulkFileUpload = ({ folderId, onUploadComplete }: BulkFileUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setCurrentFile(file.name);
        
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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
            uploaded_by: user.id,
          });

          if (dbError) throw dbError;
          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          failCount++;
        }

        setProgress(((i + 1) / totalFiles) * 100);
      }

      if (successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "No files were uploaded successfully",
          variant: "destructive",
        });
      }

      setSelectedFiles([]);
      setCurrentFile("");
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

  const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="bulk-file-upload"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-primary/10 rounded-full">
            <FolderUp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium">Drag and drop files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Select Files
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} file(s) selected ({formatFileSize(totalSize)})
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={uploading}>
                Clear All
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload All
              </Button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex-1 min-w-0">
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
        </div>
      )}

      {uploading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate max-w-[200px]">Uploading: {currentFile}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
};

export default BulkFileUpload;
