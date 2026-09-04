import express from "express";

const app = express();
app.use(express.json());

// API Routes
app.get(["/api/test", "/test"], (req, res) => {
  res.json({
    status: "ok",
    message: "Vercel serverless Express is working!",
    timestamp: new Date().toISOString()
  });
});

export default app;
