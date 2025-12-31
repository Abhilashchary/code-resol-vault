import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PendingActionsPanel from "@/components/PendingActionsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FolderOpen, File, Activity, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Admin = () => {
  const { username, isAdmin } = useGuestAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFolders: 0,
    totalFiles: 0,
    totalStorage: 0,
    pendingActions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [guestUsers, setGuestUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    
    loadStats();
    loadRecentActivity();
    loadGuestUsers();
  }, [isAdmin, navigate]);

  const loadStats = async () => {
    const [guestsData, foldersData, filesData, pendingData] = await Promise.all([
      supabase.from("guest_users").select("id", { count: "exact", head: true }),
      supabase.from("folders").select("id", { count: "exact", head: true }),
      supabase.from("files").select("file_size"),
      supabase.from("pending_actions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const totalStorage =
      filesData.data?.reduce((sum, file) => sum + file.file_size, 0) || 0;

    setStats({
      totalUsers: guestsData.count || 0,
      totalFolders: foldersData.count || 0,
      totalFiles: filesData.data?.length || 0,
      totalStorage,
      pendingActions: pendingData.count || 0,
    });
  };

  const loadRecentActivity = async () => {
    const { data } = await supabase
      .from("file_access_logs")
      .select(`
        *,
        files(name)
      `)
      .order("accessed_at", { ascending: false })
      .limit(10);

    setRecentActivity(data || []);
  };

  const loadGuestUsers = async () => {
    const { data } = await supabase
      .from("guest_users")
      .select("*")
      .order("created_at", { ascending: false });

    setGuestUsers(data || []);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / 1024 / 1024).toFixed(2) + " MB";
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
  };

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform statistics and management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Guest Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFolders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <File className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Storage
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBytes(stats.totalStorage)}
              </div>
            </CardContent>
          </Card>

          <Card className={stats.pendingActions > 0 ? "border-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingActions}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Approvals
              {stats.pendingActions > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-destructive-foreground bg-destructive rounded-full">
                  {stats.pendingActions}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="users">Guest Users</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <PendingActionsPanel onActionComplete={loadStats} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No recent activity
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentActivity.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.user_id || "Anonymous"}</TableCell>
                          <TableCell>{activity.files?.name || "Deleted"}</TableCell>
                          <TableCell className="capitalize">{activity.action}</TableCell>
                          <TableCell>
                            {new Date(activity.accessed_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Guest Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guestUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No guest users yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      guestUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;