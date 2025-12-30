import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/button";
import { Clipboard, X, File, Folder } from "lucide-react";

interface ClipboardIndicatorProps {
  onPaste: () => void;
}

const ClipboardIndicator = ({ onPaste }: ClipboardIndicatorProps) => {
  const { clipboardItem, clear, hasItem } = useClipboard();

  if (!hasItem || !clipboardItem) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <Clipboard className="h-4 w-4" />
      <div className="flex items-center gap-2">
        {clipboardItem.type === "file" ? (
          <File className="h-4 w-4" />
        ) : (
          <Folder className="h-4 w-4" />
        )}
        <span className="text-sm font-medium max-w-[200px] truncate">
          {clipboardItem.operation === "cut" ? "Cut: " : "Copied: "}
          {clipboardItem.name}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-3 text-xs"
          onClick={onPaste}
        >
          Paste Here
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-primary-foreground/20"
          onClick={clear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ClipboardIndicator;
