import serverless from "serverless-http";
import app from "../src/app.js"; // TS compiler will resolve .js to .ts 

export default serverless(app);
