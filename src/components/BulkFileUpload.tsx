import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileUp, FolderUp } from "lucide-react";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { cn } from "@/lib/utils";

interface BulkFileUploadProps {
  folderId?: string;
  onUploadComplete: () => void;
}

type FileWithPath = File & {
  readonly webkitRelativePath: string;
};

const BulkFileUpload = ({ folderId, onUploadComplete }: BulkFileUploadProps) => {
  const { username, isAdmin } = useGuestAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as FileWithPath[];
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
    
    const droppedFiles = Array.from(e.dataTransfer.files) as FileWithPath[];
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
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const createFolderPath = async (relativePath: string, baseFolderId: string | null): Promise<string | null> => {
    if (!relativePath) return baseFolderId;
    
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length <= 1) return baseFolderId; // No subfolder, just the file name
    
    const folderParts = parts.slice(0, -1); // Remove file name
    let currentParentId = baseFolderId;
    
    for (const folderName of folderParts) {
      // Check if folder exists
      const { data: existingFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("name", folderName)
        .eq("parent_id", currentParentId || "is.null")
        .maybeSingle();
      
      if (existingFolder) {
        currentParentId = existingFolder.id;
      } else {
        // Create folder
        const { data: newFolder, error } = await supabase
          .from("folders")
          .insert({
            name: folderName,
            parent_id: currentParentId,
            submitted_by: username,
          })
          .select("id")
          .single();
        
        if (error) throw error;
        currentParentId = newFolder.id;
      }
    }
    
    return currentParentId;
  };

  const handleUpload = async () => {
    if (!username || selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let successCount = 0;
      let failCount = 0;
      let pendingCount = 0;

      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setCurrentFile(file.name);
        
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          // Determine target folder based on relative path
          let targetFolderId = folderId || null;
          if (file.webkitRelativePath) {
            targetFolderId = await createFolderPath(file.webkitRelativePath, folderId || null);
          }
          
          if (isAdmin) {
            // Admin uploads go directly
            const filePath = targetFolderId
              ? `${targetFolderId}/${fileName}`
              : `root/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("files").insert({
              folder_id: targetFolderId,
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
              folder_id: targetFolderId,
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
      setCurrentFile("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
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
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore - webkitdirectory is a valid attribute
          webkitdirectory=""
          // @ts-ignore
          directory=""
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="folder-upload"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-primary/10 rounded-full">
            <FolderUp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium">Drag and drop files or folders here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            {!isAdmin && (
              <p className="text-xs text-amber-600 mt-2">
                Uploads will require admin approval
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Files
            </Button>
            <Button
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
            >
              <FolderUp className="mr-2 h-4 w-4" />
              Select Folder
            </Button>
          </div>
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
                {isAdmin ? "Upload All" : "Submit for Approval"}
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
                    {file.webkitRelativePath && (
                      <span className="ml-2 text-primary">
                        📁 {file.webkitRelativePath.split("/").slice(0, -1).join("/")}
                      </span>
                    )}
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
