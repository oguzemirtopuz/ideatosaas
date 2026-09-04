import app from "../src/app.js"; // TS compiler will resolve .js to .ts 

export default (req: any, res: any) => {
  return app(req, res);
};
