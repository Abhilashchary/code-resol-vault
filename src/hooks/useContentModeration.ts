import { supabase } from "@/integrations/supabase/client";

interface ModerationResult {
  safe: boolean;
  concerns: string[];
  risk_level: "low" | "medium" | "high";
  recommendation: string;
  error?: string;
}

export const useContentModeration = () => {
  const moderateFile = async (file: File): Promise<ModerationResult> => {
    try {
      let fileContent: string | null = null;

      // For text-based files, read content for analysis
      const textTypes = [
        "text/",
        "application/json",
        "application/javascript",
        "application/xml",
        "application/csv",
      ];

      const isTextFile = textTypes.some((type) => file.type.startsWith(type)) ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".js") ||
        file.name.endsWith(".ts") ||
        file.name.endsWith(".html") ||
        file.name.endsWith(".css");

      if (isTextFile && file.size < 100000) {
        // Only read files under 100KB
        fileContent = await file.text();
      }

      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: {
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileContent,
        },
      });

      if (error) {
        console.error("Moderation error:", error);
        return {
          safe: true,
          concerns: [],
          risk_level: "low",
          recommendation: "Content check unavailable",
          error: error.message,
        };
      }

      return data as ModerationResult;
    } catch (err) {
      console.error("Moderation failed:", err);
      return {
        safe: true,
        concerns: [],
        risk_level: "low",
        recommendation: "Content check failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };

  return { moderateFile };
};
