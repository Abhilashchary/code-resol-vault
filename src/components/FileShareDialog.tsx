import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FileShareDialogProps {
  file: any;
  open: boolean;
  onClose: () => void;
}

const FileShareDialog = ({ file, open, onClose }: FileShareDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [hasDownloadLimit, setHasDownloadLimit] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState(10);

  const generateShareLink = async () => {
    if (!user || !file) return;

    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = hasExpiry 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("file_share_links")
        .insert({
          file_id: file.id,
          token: token,
          created_by: user.id,
          expires_at: expiresAt,
          download_limit: hasDownloadLimit ? downloadLimit : null,
        });

      if (error) throw error;

      const link = `${window.location.origin}/share/${token}`;
      setShareLink(link);

      toast({
        title: "Share link created",
        description: "Link has been generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error creating share link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    setHasExpiry(false);
    setHasDownloadLimit(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium truncate">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {file?.file_size && `${(file.file_size / 1024 / 1024).toFixed(2)} MB`}
            </p>
          </div>

          {!shareLink ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expiry" className="flex flex-col gap-1">
                    <span>Set expiration</span>
                    <span className="font-normal text-muted-foreground text-xs">
                      Link will expire after specified days
                    </span>
                  </Label>
                  <Switch
                    id="expiry"
                    checked={hasExpiry}
                    onCheckedChange={setHasExpiry}
                  />
                </div>

                {hasExpiry && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="download-limit" className="flex flex-col gap-1">
                    <span>Limit downloads</span>
                    <span className="font-normal text-muted-foreground text-xs">
                      Maximum number of downloads allowed
                    </span>
                  </Label>
                  <Switch
                    id="download-limit"
                    checked={hasDownloadLimit}
                    onCheckedChange={setHasDownloadLimit}
                  />
                </div>

                {hasDownloadLimit && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={downloadLimit}
                      onChange={(e) => setDownloadLimit(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">downloads</span>
                  </div>
                )}
              </div>

              <Button 
                onClick={generateShareLink} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link className="mr-2 h-4 w-4" />
                )}
                Generate Share Link
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyToClipboard} variant="outline" size="icon">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                {hasExpiry && <p>• Expires in {expiryDays} days</p>}
                {hasDownloadLimit && <p>• Limited to {downloadLimit} downloads</p>}
                {!hasExpiry && !hasDownloadLimit && <p>• No expiration or download limits</p>}
              </div>

              <Button 
                onClick={() => setShareLink(null)} 
                variant="outline"
                className="w-full"
              >
                Create Another Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileShareDialog;