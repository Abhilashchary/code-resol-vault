import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, ChevronRight, ChevronDown, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  children?: FolderNode[];
}

interface FolderTreePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (folderId: string | null) => void;
  excludeFolderId?: string;
  title?: string;
}

const FolderTreePicker = ({
  open,
  onOpenChange,
  onSelect,
  excludeFolderId,
  title = "Select Destination Folder",
}: FolderTreePickerProps) => {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("folders")
        .select("id, name, parent_id")
        .order("name");

      if (data) {
        // Build tree structure
        const folderMap = new Map<string, FolderNode>();
        const rootFolders: FolderNode[] = [];

        data.forEach((folder) => {
          folderMap.set(folder.id, { ...folder, children: [] });
        });

        data.forEach((folder) => {
          const node = folderMap.get(folder.id)!;
          if (folder.parent_id && folderMap.has(folder.parent_id)) {
            folderMap.get(folder.parent_id)!.children!.push(node);
          } else if (!folder.parent_id) {
            rootFolders.push(node);
          }
        });

        setFolders(rootFolders);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const isDescendant = (parentId: string, childId: string): boolean => {
    // Check if childId is a descendant of parentId
    const findFolder = (folders: FolderNode[], targetId: string): FolderNode | null => {
      for (const folder of folders) {
        if (folder.id === targetId) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const parent = findFolder(folders, parentId);
    if (!parent || !parent.children) return false;

    const checkChildren = (children: FolderNode[]): boolean => {
      for (const child of children) {
        if (child.id === childId) return true;
        if (child.children && checkChildren(child.children)) return true;
      }
      return false;
    };

    return checkChildren(parent.children);
  };

  const renderFolder = (folder: FolderNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isExcluded = folder.id === excludeFolderId || 
      (excludeFolderId && isDescendant(excludeFolderId, folder.id));
    const hasChildren = folder.children && folder.children.length > 0;

    if (excludeFolderId && folder.id === excludeFolderId) {
      return null; // Don't render the excluded folder or its descendants
    }

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
            isSelected && "bg-accent",
            isExcluded && "opacity-50 cursor-not-allowed"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => !isExcluded && setSelectedFolderId(folder.id)}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm truncate">{folder.name}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleConfirm = () => {
    onSelect(selectedFolderId);
    onOpenChange(false);
    setSelectedFolderId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] border rounded-md p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
                  selectedFolderId === null && "bg-accent"
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="w-5" />
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Root (No Folder)</span>
              </div>
              {folders.map((folder) => renderFolder(folder))}
            </>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Move Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderTreePicker;
