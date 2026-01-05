import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check, Loader2 } from "lucide-react";

interface FileShareDialogProps {
  file: any;
  open: boolean;
  onClose: () => void;
}

const FileShareDialog = ({ file, open, onClose }: FileShareDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = file ? `${window.location.origin}/?file=${file.id}` : "";
  const shareText = file ? `Check out this file: ${file.name}` : "";

  const handleNativeShare = async () => {
    if (!file) return;

    setLoading(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: file.name,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully",
          description: "File link was shared",
        });
      } else {
        // Fallback to copy if Web Share API not available
        await copyToClipboard();
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({
          title: "Share failed",
          description: "Could not share the file",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
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

          <div className="space-y-3">
            <Button 
              onClick={handleNativeShare} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Share via WhatsApp, Email, etc.
            </Button>

            <Button 
              onClick={copyToClipboard} 
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Share this file directly via your device's share options
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileShareDialog;
