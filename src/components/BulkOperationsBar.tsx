import { Button } from "@/components/ui/button";
import { Download, Trash2, X, Share2, FolderInput } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder } from "lucide-react";

interface BulkOperationsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  onMoveAll: (folderId: string | null) => void;
  folders: any[];
  currentFolderId?: string | null;
  isAdmin: boolean;
}

const BulkOperationsBar = ({
  selectedCount,
  onClear,
  onDownloadAll,
  onDeleteAll,
  onMoveAll,
  folders,
  currentFolderId,
  isAdmin,
}: BulkOperationsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-lg p-4 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">{selectedCount} selected</span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadAll}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderInput className="mr-2 h-4 w-4" />
              Move to
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => onMoveAll(null)}
              disabled={!currentFolderId}
            >
              <Folder className="mr-2 h-4 w-4" />
              Root Folder
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => onMoveAll(folder.id)}
                disabled={currentFolderId === folder.id}
              >
                <Folder className="mr-2 h-4 w-4" />
                {folder.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isAdmin && (
          <Button variant="destructive" size="sm" onClick={onDeleteAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkOperationsBar;
