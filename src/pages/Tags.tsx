import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const Tags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tags")
      .select(`
        *,
        file_tags(count)
      `)
      .order("name");

    setTags(data || []);
    setLoading(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground">Browse files by tags</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tags.map((tag) => (
              <Card key={tag.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <Badge className="mb-2">{tag.name}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {tag.file_tags?.[0]?.count || 0} files
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && tags.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tags created yet
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tags;
