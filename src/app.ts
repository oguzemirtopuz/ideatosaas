import express from "express";
import { generateIdeasHandler } from "./services/ideaGenerator.js";
import { generateSpecHandler, buildAppHandler } from "./services/specBuilder.js";
import { generateMarketingAndDecisionHandler } from "./services/marketingDecision.js";

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
app.post("/api/generate-spec", generateSpecHandler);
app.post("/api/build-app", buildAppHandler);
app.post("/api/generate-marketing-decision", generateMarketingAndDecisionHandler);

export default app;
