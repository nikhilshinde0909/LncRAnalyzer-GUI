import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import systemInfoRoute from './routes/system-info'
import open from 'open' 

const app = express()
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api/pipeline', systemInfoRoute);
app.use((req, res, next) => {
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    open(`http://localhost:${port}`); 
  });
})();

