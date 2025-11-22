import { Folder, File, MoreVertical, Download, Trash2, Star, Award, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  onToggleFeatured?: (fileId: string) => void;
  isAdmin: boolean;
  favorites: Set<string>;
  viewMode?: "grid" | "list";
}

const FolderGrid = ({
  folders,
  files,
  onFolderClick,
  onFileClick,
  onDownload,
  onDelete,
  onToggleFavorite,
  onToggleFeatured,
  isAdmin,
  favorites,
  viewMode = "grid",
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
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </p>
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
              "hover:shadow-md transition-shadow cursor-pointer",
              file.is_featured && "border-yellow-500 border-2"
            )}
            onClick={() => onFileClick(file.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate text-sm">{file.name}</h3>
                      {file.is_featured && (
                        <Badge className="bg-yellow-500 text-xs">Featured</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.file_size)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {file.access_count}
                      </Badge>
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
                    {isAdmin && onToggleFeatured && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFeatured(file.id);
                          }}
                        >
                          <Award className="mr-2 h-4 w-4" />
                          {file.is_featured ? "Unfeature" : "Feature"}
                        </DropdownMenuItem>
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
                  <p className="text-xs text-muted-foreground">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </p>
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
            "hover:shadow-lg transition-shadow cursor-pointer relative",
            file.is_featured && "border-yellow-500 border-2"
          )}
          onClick={() => onFileClick(file.id)}
        >
          {file.is_featured && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full">
              <Award className="h-4 w-4" />
            </div>
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-3xl flex-shrink-0">
                  {getFileIcon(file.file_type)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate text-sm">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
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
                  {isAdmin && onToggleFeatured && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFeatured(file.id);
                        }}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        {file.is_featured ? "Unfeature" : "Feature"}
                      </DropdownMenuItem>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {file.access_count}
              </Badge>
              <span>{new Date(file.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FolderGrid;
