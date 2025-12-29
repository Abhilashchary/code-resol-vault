import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FileUploadProps {
  folderId?: string;
  onUploadComplete: () => void;
}

const FileUpload = ({ folderId, onUploadComplete }: FileUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { moderateFile } = useContentModeration();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [moderationResults, setModerationResults] = useState<Map<string, any>>(new Map());
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      
      // Run content moderation on selected files
      setChecking(true);
      const results = new Map();
      
      for (const file of files) {
        const result = await moderateFile(file);
        results.set(file.name, result);
      }
      
      setModerationResults(results);
      setChecking(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => {
      const newFiles = files.filter((_, i) => i !== index);
      const newResults = new Map(moderationResults);
      newResults.delete(files[index].name);
      setModerationResults(newResults);
      return newFiles;
    });
  };

  const hasUnsafeFiles = () => {
    for (const [, result] of moderationResults) {
      if (!result.safe && result.risk_level === "high") {
        return true;
      }
    }
    return false;
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    if (hasUnsafeFiles()) {
      toast({
        title: "Upload blocked",
        description: "Some files contain inappropriate content. Please remove them before uploading.",
        variant: "destructive",
      });
      return;
    }

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

        setProgress(((i + 1) / totalFiles) * 100);
      }

      toast({
        title: "Success",
        description: `${totalFiles} file(s) uploaded successfully!`,
      });

      setSelectedFiles([]);
      setModerationResults(new Map());
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

  const getModerationIcon = (fileName: string) => {
    const result = moderationResults.get(fileName);
    if (!result) return null;
    
    if (result.safe) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (result.risk_level === "high") {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
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
          disabled={uploading || checking}
        >
          <Upload className="mr-2 h-4 w-4" />
          Select Files
        </Button>
        {selectedFiles.length > 0 && !checking && (
          <Button onClick={handleUpload} disabled={uploading || hasUnsafeFiles()}>
            Upload {selectedFiles.length} file(s)
          </Button>
        )}
      </div>

      {checking && (
        <Alert>
          <AlertTitle>Checking content...</AlertTitle>
          <AlertDescription>
            AI is analyzing your files for inappropriate content.
          </AlertDescription>
        </Alert>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => {
            const result = moderationResults.get(file.name);
            return (
              <div
                key={index}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  result && !result.safe && result.risk_level === "high"
                    ? "border-destructive bg-destructive/5"
                    : result && !result.safe
                    ? "border-yellow-500 bg-yellow-500/5"
                    : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getModerationIcon(file.name)}
                    <p className="text-sm font-medium truncate">{file.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {result && !result.safe && (
                    <p className="text-xs text-destructive mt-1">
                      {result.recommendation}
                    </p>
                  )}
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
            );
          })}
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
