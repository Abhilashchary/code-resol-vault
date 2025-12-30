import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Upload, Trash2, File, Folder, Eye } from "lucide-react";
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

const PendingActionsPanel = () => {
  const { isAdmin, username } = useGuestAuth();
  const { toast } = useToast();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingActions();
  }, []);

  const loadPendingActions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_actions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingActions(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading pending actions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      toast({
        title: "Approved",
        description: `${action.action_type} request approved`,
      });

      loadPendingActions();
    } catch (error: any) {
      toast({
        title: "Error approving action",
        description: error.message,
        variant: "destructive",
      });
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

      toast({
        title: "Rejected",
        description: `${action.action_type} request rejected`,
      });

      loadPendingActions();
    } catch (error: any) {
      toast({
        title: "Error rejecting action",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {pendingActions.length}
          </Badge>
          Pending Approvals
        </CardTitle>
        <CardDescription>
          Review and approve or reject user upload and delete requests
        </CardDescription>
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
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingActions.map((action) => (
                <TableRow key={action.id}>
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
                    {action.file_type && ` • ${action.file_type}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(action)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(action)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
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
  );
};

export default PendingActionsPanel;
