import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  fileName: string;
  fileType: string;
  fileUrl?: string;
  fileBase64?: string;
}

interface ModerationResult {
  safe: boolean;
  level: 'safe' | 'low' | 'medium' | 'high';
  issues: string[];
  details: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, fileUrl, fileBase64 }: ModerationRequest = await req.json();
    
    console.log(`Moderating file: ${fileName}, type: ${fileType}`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine content type category
    const isImage = fileType.startsWith('image/');
    const isDocument = fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text');
    const isVideo = fileType.startsWith('video/');
    const isAudio = fileType.startsWith('audio/');

    let moderationPrompt = '';
    let messages: any[] = [];

    if (isImage && (fileUrl || fileBase64)) {
      // For images, use vision capability
      moderationPrompt = `Analyze this image for content moderation. Check for:
1. Explicit or adult content (nudity, sexual content)
2. Violence or gore
3. Hate symbols or offensive imagery
4. Dangerous or illegal activities
5. Misleading or manipulated content (deepfakes)
6. Personal information exposure (documents with PII)

Respond with a JSON object:
{
  "safe": boolean,
  "level": "safe" | "low" | "medium" | "high",
  "issues": ["list of specific issues found"],
  "details": "brief explanation"
}

Be strict about safety but avoid false positives for normal content.`;

      const imageContent = fileBase64 
        ? { type: "image_url", image_url: { url: `data:${fileType};base64,${fileBase64}` } }
        : { type: "image_url", image_url: { url: fileUrl } };

      messages = [
        { 
          role: 'user', 
          content: [
            { type: 'text', text: moderationPrompt },
            imageContent
          ]
        }
      ];
    } else {
      // For non-image files, analyze by filename and type
      moderationPrompt = `Analyze this file for content moderation based on its name and type:
Filename: ${fileName}
Type: ${fileType}

Check if the filename or type suggests:
1. Potentially harmful or malicious content (executables, scripts)
2. Inappropriate content based on naming patterns
3. Suspicious file extensions or naming conventions
4. Known malware or virus patterns in filename

Respond with a JSON object:
{
  "safe": boolean,
  "level": "safe" | "low" | "medium" | "high",
  "issues": ["list of specific issues found"],
  "details": "brief explanation"
}

Be reasonable - most documents and files are safe. Only flag genuinely suspicious content.`;

      messages = [
        { role: 'system', content: 'You are a content moderation AI that analyzes files for safety. Respond only with valid JSON.' },
        { role: 'user', content: moderationPrompt }
      ];
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: isImage ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let result: ModerationResult;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Default to safe if parsing fails
      result = {
        safe: true,
        level: 'safe',
        issues: [],
        details: 'Unable to analyze content - defaulting to safe'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in moderate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      safe: true, // Default to safe on error to not block uploads
      level: 'safe',
      issues: [],
      details: 'Moderation service unavailable'
    }), {
      status: 200, // Return 200 so upload can proceed
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
