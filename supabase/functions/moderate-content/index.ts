import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, fileContent } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt for content moderation
    let prompt = `You are a content moderation AI. Analyze the following file for inappropriate, harmful, or censored content.

File Name: ${fileName}
File Type: ${fileType}
`;

    // For text-based files, include content preview
    if (fileContent) {
      prompt += `\nFile Content Preview (first 2000 chars):\n${fileContent.substring(0, 2000)}`;
    }

    prompt += `

Analyze this file and respond with a JSON object containing:
1. "safe": boolean - true if the file appears safe, false if it contains concerning content
2. "concerns": array of strings - list of specific concerns if any (e.g., "explicit language", "violent content", "malware indicators", "sensitive data exposure")
3. "risk_level": string - "low", "medium", or "high"
4. "recommendation": string - brief recommendation for the user

Only respond with the JSON object, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a content moderation AI that analyzes files for inappropriate content. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded", 
          safe: true, 
          concerns: [],
          risk_level: "low",
          recommendation: "Content check skipped due to rate limiting"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "API credits exhausted",
          safe: true,
          concerns: [],
          risk_level: "low", 
          recommendation: "Content check skipped - please add credits"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let moderationResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse moderation result:", parseError, content);
      // Default to safe if parsing fails
      moderationResult = {
        safe: true,
        concerns: [],
        risk_level: "low",
        recommendation: "Unable to fully analyze content, proceed with caution"
      };
    }

    return new Response(JSON.stringify(moderationResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Moderation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      safe: true,
      concerns: [],
      risk_level: "low",
      recommendation: "Content check failed, proceed with caution"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
