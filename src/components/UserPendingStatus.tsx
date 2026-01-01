import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, File, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface PendingItem {
  id: string;
  action_type: string;
  item_type: string;
  original_filename: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

const UserPendingStatus = () => {
  const { username, isAdmin } = useGuestAuth();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username && !isAdmin) {
      loadPendingItems();
    } else {
      setLoading(false);
    }
  }, [username, isAdmin]);

  const loadPendingItems = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_actions")
        .select("id, action_type, item_type, original_filename, file_size, status, created_at, reviewed_at")
        .eq("submitted_by", username)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPendingItems(data || []);
    } catch (error) {
      console.error("Error loading pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Don't show for admins or if no username
  if (isAdmin || !username || loading) {
    return null;
  }

  const pendingCount = pendingItems.filter(item => item.status === "pending").length;

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-medium">
              Your Pending Uploads
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-600">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!expanded && (
          <CardDescription className="text-xs">
            {pendingCount > 0
              ? `${pendingCount} upload(s) waiting for admin approval`
              : "All uploads have been processed"}
          </CardDescription>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background/50 border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.original_filename || "Unknown file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, HH:mm")}
                      {item.file_size && ` • ${formatFileSize(item.file_size)}`}
                    </p>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default UserPendingStatus;
