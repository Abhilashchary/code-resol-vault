import { Folder, File, MoreVertical, Download, Trash2, Star, Eye, User, FolderOpen, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FolderGridProps {
  folders: any[];
  files: any[];
  onFolderClick: (folderId: string) => void;
  onFileClick: (fileId: string) => void;
  onDownload: (file: any) => void;
  onDelete: (type: "folder" | "file", id: string) => void;
  onToggleFavorite: (fileId: string) => void;
  onMoveFile?: (fileId: string, targetFolderId: string | null) => void;
  onShare?: (file: any) => void;
  allFolders?: any[];
  currentFolderId?: string | null;
  isAdmin: boolean;
  favorites: Set<string>;
  viewMode?: "grid" | "list";
  selectedFiles?: Set<string>;
  onToggleSelect?: (fileId: string) => void;
  selectionMode?: boolean;
}

const FolderGrid = ({
  folders,
  files,
  onFolderClick,
  onFileClick,
  onDownload,
  onDelete,
  onToggleFavorite,
  onMoveFile,
  onShare,
  allFolders,
  currentFolderId,
  isAdmin,
  favorites,
  viewMode = "grid",
  selectedFiles = new Set(),
  onToggleSelect,
  selectionMode = false,
}: FolderGridProps) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.startsWith("video/")) return "🎥";
    if (fileType.startsWith("audio/")) return "🎵";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("zip") || fileType.includes("rar")) return "📦";
    return "📄";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const handleCardClick = (file: any, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(file.id);
    } else {
      onFileClick(file.id);
    }
  };

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onFolderClick(folder.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Folder className="h-6 w-6 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{folder.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {folder.files?.[0]?.count || 0} files
                      </p>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete("folder", folder.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {files.map((file) => (
          <Card
            key={file.id}
            className={cn(
              "hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/20",
              selectedFiles.has(file.id) && "ring-2 ring-primary border-l-primary"
            )}
            onClick={(e) => handleCardClick(file, e)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectionMode && onToggleSelect && (
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => onToggleSelect(file.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm">{file.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.file_size)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {file.access_count}
                      </Badge>
                      {file.uploader_profile?.full_name && (
                        <Badge variant="secondary" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {file.uploader_profile.full_name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file.id);
                      }}
                    >
                      <Star
                        className={`mr-2 h-4 w-4 ${
                          favorites.has(file.id) ? "fill-yellow-400 text-yellow-400" : ""
                        }`}
                      />
                      {favorites.has(file.id) ? "Unfavorite" : "Favorite"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    {onShare && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare(file);
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {onMoveFile && allFolders && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Move to Folder</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveFile(file.id, null);
                          }}
                          disabled={!currentFolderId}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Root Folder
                        </DropdownMenuItem>
                        {allFolders.map((folder) => (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveFile(file.id, folder.id);
                            }}
                            disabled={currentFolderId === folder.id}
                          >
                            <Folder className="mr-2 h-4 w-4" />
                            {folder.name}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete("file", file.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {folders.map((folder) => (
        <Card
          key={folder.id}
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onFolderClick(folder.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Folder className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{folder.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {folder.files?.[0]?.count || 0} files
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(folder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete("folder", folder.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {files.map((file) => (
        <Card
          key={file.id}
          className={cn(
            "hover:shadow-lg transition-all cursor-pointer relative group border-l-4 border-l-primary/30 hover:border-l-primary",
            selectedFiles.has(file.id) && "ring-2 ring-primary border-l-primary"
          )}
          onClick={(e) => handleCardClick(file, e)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectionMode && onToggleSelect && (
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => onToggleSelect(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="bg-primary/10 p-3 rounded-lg">
                  <span className="text-3xl">{getFileIcon(file.file_type)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate mb-1">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(file.id);
                    }}
                  >
                    <Star
                      className={`mr-2 h-4 w-4 ${
                        favorites.has(file.id) ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                    {favorites.has(file.id) ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  {onShare && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(file);
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {onMoveFile && allFolders && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Move to Folder</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveFile(file.id, null);
                        }}
                        disabled={!currentFolderId}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Root Folder
                      </DropdownMenuItem>
                      {allFolders.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveFile(file.id, folder.id);
                          }}
                          disabled={currentFolderId === folder.id}
                        >
                          <Folder className="mr-2 h-4 w-4" />
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete("file", file.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {file.access_count} views
              </Badge>
              {file.uploader_profile?.full_name && (
                <Badge variant="secondary" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {file.uploader_profile.full_name}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(file.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FolderGrid;