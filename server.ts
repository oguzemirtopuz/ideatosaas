import app from "./src/app.ts";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development (AI Studio)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving (for Cloud Run if ever used, fallback)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
