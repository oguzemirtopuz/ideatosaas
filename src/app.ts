import express from "express";
import { generateIdeasHandler } from "./services/ideaGenerator.js";

const app = express();
app.use(express.json());

// API Routes
app.get("/api/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Vercel serverless Express is working!",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/generate-ideas", generateIdeasHandler);

export default app;
