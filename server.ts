import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API proxy endpoint to bypass CORS when fetching external quiz catalogs and files
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid url protocol" });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error HTTP ${response.status}: ${response.statusText}` });
      }

      const contentType = response.headers.get("content-type") || "application/json";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      const body = await response.text();
      return res.send(body);
    } catch (err: any) {
      console.error("Proxy error for URL:", targetUrl, err);
      return res.status(502).json({ error: err.message || "Failed to fetch external URL" });
    }
  });

  // Proxy to fetch images and return as base64
  app.get("/api/image-to-base64", async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(502).json({ error: "Failed to fetch image" });
      }
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (err: any) {
      console.error("Image proxy error:", err);
      res.status(502).json({ error: "Failed to process image" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
