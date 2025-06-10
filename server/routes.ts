import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import { storage } from "./storage";
import { pipelineRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import archiver from "archiver";

const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/pipeline/run", upload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      console.log("Received text fields:", req.body);
      console.log("Received files:", files?.map(f => ({
        fieldname: f.fieldname,
        filename: f.originalname,
      })) || []);

      const formData = {
        orgName: req.body.orgName,
        clade: req.body.clade,
        readsR1: Array.isArray(req.body.readsR1) ? req.body.readsR1 : [req.body.readsR1].filter(Boolean),
        readsR2: Array.isArray(req.body.readsR2) ? req.body.readsR2 : [req.body.readsR2].filter(Boolean),
        genome: req.body.genome || "",
        annotation: req.body.annotation || "",
        rRNAs: req.body.rRNAs || "",
        liftover: req.body.liftover || "",
        noncoding: req.body.noncoding || "",
        mir: req.body.mir || "",
        sno: req.body.sno || "",
        knownLncRNAs: req.body.knownLncRNAs || "",
        design: req.body.design || "",
        relSpeciesName: req.body.relSpeciesName,
        genomeRelatedSpecies: req.body.genomeRelatedSpecies || "",
        annotationRelatedSpecies: req.body.annotationRelatedSpecies || "",
        relLiftover: req.body.relLiftover || "",
        relNoncoding: req.body.relNoncoding || "",
        relMir: req.body.relMir || "",
        relSno: req.body.relSno || "",
      };

      const validationResult = pipelineRequestSchema.safeParse(formData);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        console.log("Validation error:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }

      const validatedData = validationResult.data;
      const jobId = nanoid();

      await storage.createPipelineJob({
        id: jobId,
        status: "running",
        currentStep: "Running LncRAnalyzer",
        orgName: validatedData.orgName,
        clade: validatedData.clade,
        relSpeciesName: validatedData.relSpeciesName,
        outputPath: null,
      });

      executeDockerPipeline(jobId, validatedData, files);
      res.json({ jobId, status: "started" });
    } catch (error) {
      console.error("Pipeline start error:", error);
      res.status(500).json({ error: "Failed to start pipeline" });
    }
  });

  app.get("/api/pipeline/download/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getPipelineJob(jobId);

      if (!job || job.status !== "completed") {
        return res.status(404).json({ error: "Results not available" });
      }

      const zipPath = path.join(process.cwd(), "jobs", jobId, `LncRAnalyzer-summary-${jobId}.zip`);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: "Result archive not found" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=LncRAnalyzer-summary-${jobId}.zip`);

      const fileStream = fs.createReadStream(zipPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download results" });
    }
  });

  const server = createServer(app);
  return server;
}

async function executeDockerPipeline(jobId: string, data: any, files: Express.Multer.File[]) {
  try {
    const jobDir = path.join(process.cwd(), "jobs", jobId);
    const inputDir = path.join(jobDir, "input");
    const outputDir = path.join(jobDir, "LncRAnalyzer-summary");

    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    await storage.updatePipelineJobStatus(jobId, "running", "Preparing input files");

    const fileMapping: Record<string, string> = {};
    for (const file of files) {
      const targetPath = path.join(inputDir, file.originalname);
      fs.renameSync(file.path, targetPath);
      fileMapping[file.fieldname] = `/input/${file.originalname}`;
    }

    const groovyFilePath = path.join(inputDir, "data.groovy");
    const groovyLines = [
      `reads_R1="${(data.readsR1 || []).map(f => `/input/${f}`).join(",")}"`,
      `reads_R2="${(data.readsR2 || []).map(f => `/input/${f}`).join(",")}"`,
      `rRNAs="${fileMapping.rRNAs || ""}"`,
      `org_name="${data.orgName}"`,
      `clade="${data.clade}"`,
      `genome="${fileMapping.genome || ""}"`,
      `annotation="${fileMapping.annotation || ""}"`,
      `liftover="${fileMapping.liftover || ""}"`,
      `noncoding="${fileMapping.noncoding || ""}"`,
      `mir="${fileMapping.mir || ""}"`,
      `sno="${fileMapping.sno || ""}"`,
      `known_lncRNAs_FA="${fileMapping.knownLncRNAs || ""}"`,
      `design="${fileMapping.design || ""}"`,
      `rel_sp_name="${data.relSpeciesName}"`,
      `genome_related_species="${fileMapping.genomeRelatedSpecies || ""}"`,
      `annotation_related_species="${fileMapping.annotationRelatedSpecies || ""}"`,
      `rel_liftover="${fileMapping.relLiftover || ""}"`,
      `rel_noncoding="${fileMapping.relNoncoding || ""}"`,
      `rel_mir="${fileMapping.relMir || ""}"`,
      `rel_sno="${fileMapping.relSno || ""}"`,
    ];
    fs.writeFileSync(groovyFilePath, groovyLines.join("\n"));

    await storage.updatePipelineJobStatus(jobId, "running", "Starting Docker container");

    const dockerArgs = [
      "run",
      "--rm",
      "-v", `${inputDir}:/input`,
      "-v", `${outputDir}:/pipeline/LncRAnalyzer-summary`,
      "nikhilshinde0909/lncranalyzer:latest",
      "bpipe", "run", "-n", "4",
      "/pipeline/LncRAnalyzer/Main.groovy",
      "/input/data.groovy"
    ];

    const dockerProcess = spawn("docker", dockerArgs, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    dockerProcess.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log(`[${jobId}] Docker stdout:`, data.toString());
    });

    dockerProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error(`[${jobId}] Docker stderr:`, data.toString());
    });

    dockerProcess.on("close", async (code) => {
      if (code === 0) {
        console.log(`[${jobId}] Docker process completed`);

        try {
          const zipPath = path.join(jobDir, `LncRAnalyzer-summary-${jobId}.zip`);

          await new Promise<void>((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", () => {
              console.log(`[${jobId}] Archive created: ${zipPath}`);
              resolve();
            });

            archive.on("error", (err) => {
              console.error(`[${jobId}] Archive error:`, err);
              reject(err);
            });

            archive.pipe(output);
            archive.directory(outputDir, false);
            archive.finalize();
          });

          await storage.updatePipelineJobStatus(jobId, "completed", "Pipeline completed and results archived");

          // Clean up raw files
          fs.rmSync(inputDir, { recursive: true, force: true });
          fs.rmSync(outputDir, { recursive: true, force: true });

        } catch (archiveErr) {
          console.error(`[${jobId}] Failed to archive results:`, archiveErr);
          await storage.updatePipelineJobStatus(jobId, "failed", "Failed to archive pipeline results");
        }
      } else {
        console.error(`[${jobId}] Docker failed with code ${code}`);
        await storage.updatePipelineJobStatus(jobId, "failed", `Pipeline failed (exit code: ${code})`);
      }
    });
  } catch (error) {
    console.error(`[${jobId}] Execution error:`, error);
    await storage.updatePipelineJobStatus(jobId, "failed", "Pipeline execution error");
  }
}

