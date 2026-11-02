export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
      "https://paikarisell.ghotimarket.com",
      "https://admin.ghotimarket.com"
    ];

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "https://paikarisell.ghotimarket.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDCIRWmozT0XcEXuXtQ6RDiDo6vtT1T9mU`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!verifyRes.ok) {
        return new Response(JSON.stringify({ success: false, error: "Invalid token" }), { status: 403, headers: corsHeaders });
      }

      const formData = await request.formData();
      const file = formData.get("file");

      if (!file) {
        return new Response(JSON.stringify({ success: false, error: "No file uploaded" }), { status: 400, headers: corsHeaders });
      }

      if (file.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ success: false, error: "File too large (Max 5MB)" }), { status: 400, headers: corsHeaders });
      }

      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const objectKey = `${timestamp}-${safeFileName}`;

      await env.NID_BUCKET.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      return new Response(JSON.stringify({ success: true, key: objectKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
