
// backend/main.ts
// Run with: deno run --allow-net --allow-read --allow-env --unstable-kv backend/main.ts

// Attempt to import Cap.js server validation. 
// If this fails in your environment, you may need to install it or use a different import.
// For Deno, npm specifiers work if Node compatibility is enabled or using default Deno logic.
import { check } from "npm:@cap.js/server";

const kv = await Deno.openKv();

console.log("Server running on http://localhost:8000");

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    const allowedOrigins = [
        "https://harsh-avinash.github.io",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173" // Vite preview
    ];

    const headers = new Headers({
        "Content-Type": "application/json"
    });

    if (origin && allowedOrigins.includes(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
    } else {
        // Fallback or strict? User asked for specific origin.
        // We'll leave it unset if not matched, blocking the request browser-side.
    }

    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers });
    }

    const url = new URL(req.url);

    // GET /scores
    if (req.method === "GET" && url.pathname === "/scores") {
        // List top 50 scores.
        // Keys: ["scores", score, timestamp]
        // reverse: true gives us highest scores first.
        const iter = kv.list({ prefix: ["scores"] }, { limit: 50, reverse: true });

        const scores = [];
        for await (const res of iter) {
            scores.push(res.value);
        }

        return new Response(JSON.stringify(scores), { headers });
    }

    // POST /scores
    if (req.method === "POST" && url.pathname === "/scores") {
        try {
            const body = await req.json();
            const { name, score, captcha } = body;

            if (!name || typeof score !== "number" || !captcha) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers });
            }

            // Verify Captcha
            // Note: Cap.js check returns a promise resolving to boolean or throwing?
            // Documentation implies: await check(token, secret?) - wait, Cap.js usually doesn't need secret for basic mode?
            // Actually checking documentation snippet: 
            // `const result = await check(token); if (result.success) ...`
            try {
                const isValid = await check(captcha);
                if (!isValid) {
                    return new Response(JSON.stringify({ error: "Invalid Captcha" }), { status: 403, headers });
                }
            } catch (err) {
                console.error("Captcha error:", err);
                return new Response(JSON.stringify({ error: "Captcha validation failed" }), { status: 500, headers });
            }

            // Store in KV
            // Key includes score for sorting, and timestamp to break ties / uniqueness
            const timestamp = Date.now();
            await kv.set(["scores", score, timestamp], {
                name: name.slice(0, 20), // Limit name length
                score,
                date: new Date().toISOString()
            });

            return new Response(JSON.stringify({ success: true }), { headers });

        } catch (e) {
            console.error(e);
            return new Response(JSON.stringify({ error: "Invalid Request" }), { status: 400, headers });
        }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers });
});
