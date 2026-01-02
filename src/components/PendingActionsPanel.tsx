import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, Upload, Trash2, File, Folder, Eye, RefreshCw, CheckCheck, XCircle, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PendingAction {
  id: string;
  action_type: string;
  item_type: string;
  item_id: string | null;
  temp_storage_path: string | null;
  original_filename: string | null;
  file_type: string | null;
  file_size: number | null;
  folder_id: string | null;
  submitted_by: string;
  status: string;
  created_at: string;
}

interface ModerationResult {
  safe: boolean;
  level: 'safe' | 'low' | 'medium' | 'high';
  issues: string[];
  details: string;
}

interface PendingActionsPanelProps {
  onActionComplete?: () => void;
}

const PendingActionsPanel = ({ onActionComplete }: PendingActionsPanelProps) => {
  const { isAdmin, username } = useGuestAuth();
  const { toast } = useToast();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [processingBulk, setProcessingBulk] = useState(false);
  const [moderationResults, setModerationResults] = useState<Record<string, ModerationResult>>({});
  const [moderating, setModerating] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("PendingActionsPanel mounted, isAdmin:", isAdmin, "username:", username);
    if (isAdmin) {
      loadPendingActions();
    }
  }, [isAdmin]);

  const loadPendingActions = async () => {
    setLoading(true);
    console.log("Loading pending actions...");
    try {
      const { data, error } = await supabase
        .from("pending_actions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      console.log("Pending actions loaded:", data, "Error:", error);

      if (error) throw error;
      setPendingActions(data || []);
      setSelectedIds(new Set());
    } catch (error: any) {
      console.error("Error loading pending actions:", error);
      toast({
        title: "Error loading pending actions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runModeration = async (action: PendingAction) => {
    if (!action.temp_storage_path || action.action_type !== "upload") return;

    setModerating(prev => new Set([...prev, action.id]));

    try {
      const { data: urlData } = supabase.storage
        .from("files")
        .getPublicUrl(action.temp_storage_path);

      const response = await supabase.functions.invoke('moderate-content', {
        body: {
          fileName: action.original_filename,
          fileType: action.file_type,
          fileUrl: urlData.publicUrl,
        },
      });

      if (response.error) throw response.error;

      const result: ModerationResult = response.data;
      setModerationResults(prev => ({
        ...prev,
        [action.id]: result,
      }));

      toast({
        title: result.safe ? "Content Safe" : "Content Flagged",
        description: result.details,
        variant: result.safe ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error("Moderation error:", error);
      toast({
        title: "Moderation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setModerating(prev => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  const handlePreview = async (action: PendingAction) => {
    if (!action.temp_storage_path) return;

    try {
      const { data } = supabase.storage
        .from("files")
        .getPublicUrl(action.temp_storage_path);

      setPreviewUrl(data.publicUrl);
      setPreviewType(action.file_type);
      setPreviewName(action.original_filename || "File Preview");
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        title: "Error loading preview",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (action: PendingAction) => {
    try {
      if (action.action_type === "upload" && action.temp_storage_path) {
        // Move file from pending to main storage
        const newPath = action.temp_storage_path.replace("pending/", "");
        
        // Download from pending
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("files")
          .download(action.temp_storage_path);
        
        if (downloadError) throw downloadError;

        // Upload to main location
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(newPath, fileData, { upsert: true });
        
        if (uploadError) throw uploadError;

        // Create file record
        const { error: insertError } = await supabase.from("files").insert({
          name: action.original_filename,
          file_type: action.file_type,
          file_size: action.file_size,
          storage_path: newPath,
          folder_id: action.folder_id,
          submitted_by: action.submitted_by,
        });

        if (insertError) throw insertError;

        // Remove from pending storage
        await supabase.storage.from("files").remove([action.temp_storage_path]);
      } else if (action.action_type === "delete" && action.item_id) {
        // Actually delete the item
        if (action.item_type === "file") {
          const { data: file } = await supabase
            .from("files")
            .select("storage_path")
            .eq("id", action.item_id)
            .single();

          if (file) {
            await supabase.storage.from("files").remove([file.storage_path]);
            await supabase.from("files").delete().eq("id", action.item_id);
          }
        } else {
          await supabase.from("folders").delete().eq("id", action.item_id);
        }
      }

      // Update pending action status
      await supabase
        .from("pending_actions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: username,
        })
        .eq("id", action.id);

      return true;
    } catch (error: any) {
      console.error("Error approving action:", error);
      throw error;
    }
  };

  const handleReject = async (action: PendingAction) => {
    try {
      // If it's an upload, remove the pending file
      if (action.action_type === "upload" && action.temp_storage_path) {
        await supabase.storage.from("files").remove([action.temp_storage_path]);
      }

      // Update pending action status
      await supabase
        .from("pending_actions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: username,
        })
        .eq("id", action.id);

      return true;
    } catch (error: any) {
      console.error("Error rejecting action:", error);
      throw error;
    }
  };

  const handleSingleApprove = async (action: PendingAction) => {
    try {
      await handleApprove(action);
      toast({
        title: "✓ Approved",
        description: `${action.original_filename || action.action_type} has been approved`,
      });
      loadPendingActions();
      onActionComplete?.();
    } catch (error: any) {
      toast({
        title: "Error approving action",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSingleReject = async (action: PendingAction) => {
    try {
      await handleReject(action);
      toast({
        title: "✗ Rejected",
        description: `${action.original_filename || action.action_type} has been rejected`,
      });
      loadPendingActions();
      onActionComplete?.();
    } catch (error: any) {
      toast({
        title: "Error rejecting action",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setProcessingBulk(true);
    let successCount = 0;
    let failCount = 0;

    const selectedActions = pendingActions.filter(a => selectedIds.has(a.id));

    for (const action of selectedActions) {
      try {
        await handleApprove(action);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setProcessingBulk(false);
    toast({
      title: "✓ Bulk Approve Complete",
      description: `${successCount} items approved${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });

    loadPendingActions();
    onActionComplete?.();
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    setProcessingBulk(true);
    let successCount = 0;
    let failCount = 0;

    const selectedActions = pendingActions.filter(a => selectedIds.has(a.id));

    for (const action of selectedActions) {
      try {
        await handleReject(action);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setProcessingBulk(false);
    toast({
      title: "✗ Bulk Reject Complete",
      description: `${successCount} items rejected${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });

    loadPendingActions();
    onActionComplete?.();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingActions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingActions.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (type: string | null) => type?.startsWith("image/");
  const isPdf = (type: string | null) => type === "application/pdf";
  const isVideo = (type: string | null) => type?.startsWith("video/");
  const isAudio = (type: string | null) => type?.startsWith("audio/");

  const getModerationBadge = (actionId: string) => {
    const result = moderationResults[actionId];
    if (!result) return null;

    const levelColors = {
      safe: "bg-green-100 text-green-800",
      low: "bg-yellow-100 text-yellow-800",
      medium: "bg-orange-100 text-orange-800",
      high: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={`${levelColors[result.level]} text-xs`}>
        {result.level === "safe" ? (
          <Shield className="h-3 w-3 mr-1" />
        ) : (
          <AlertTriangle className="h-3 w-3 mr-1" />
        )}
        {result.level}
      </Badge>
    );
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge variant={pendingActions.length > 0 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                  {pendingActions.length}
                </Badge>
                Pending Approvals
              </CardTitle>
              <CardDescription>
                Review and approve or reject user upload and delete requests
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={processingBulk}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Approve ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkReject}
                    disabled={processingBulk}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject ({selectedIds.size})
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={loadPendingActions} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingActions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending actions to review
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === pendingActions.length && pendingActions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>AI Check</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingActions.map((action) => (
                  <TableRow key={action.id} className={selectedIds.has(action.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(action.id)}
                        onCheckedChange={() => toggleSelect(action.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={action.action_type === "upload" ? "default" : "destructive"}
                      >
                        {action.action_type === "upload" ? (
                          <Upload className="h-3 w-3 mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        {action.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {action.item_type === "file" ? (
                          <File className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Folder className="h-4 w-4 text-primary" />
                        )}
                        <span className="truncate max-w-[200px]">
                          {action.original_filename || action.item_id?.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{action.submitted_by}</TableCell>
                    <TableCell>
                      {format(new Date(action.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {action.file_size ? formatFileSize(action.file_size) : "-"}
                      {action.file_type && ` • ${action.file_type.split("/")[1] || action.file_type}`}
                    </TableCell>
                    <TableCell>
                      {getModerationBadge(action.id) || (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => runModeration(action)}
                          disabled={moderating.has(action.id) || action.action_type !== "upload"}
                          className="text-blue-600"
                        >
                          {moderating.has(action.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-1" />
                              Scan
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {action.action_type === "upload" && action.temp_storage_path && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePreview(action)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSingleApprove(action)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSingleReject(action)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
            {previewUrl && isImage(previewType) && (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
            {previewUrl && isPdf(previewType) && (
              <iframe
                src={previewUrl}
                className="w-full h-[60vh]"
                title={previewName}
              />
            )}
            {previewUrl && isVideo(previewType) && (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[60vh]"
              />
            )}
            {previewUrl && isAudio(previewType) && (
              <audio src={previewUrl} controls className="w-full" />
            )}
            {previewUrl && !isImage(previewType) && !isPdf(previewType) && !isVideo(previewType) && !isAudio(previewType) && (
              <div className="text-center py-8">
                <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Preview not available for this file type</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(previewUrl, "_blank")}
                >
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingActionsPanel;
