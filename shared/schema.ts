import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const pipelineJobs = pgTable("pipeline_jobs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  currentStep: text("current_step"),
  orgName: text("org_name").notNull(),
  clade: text("clade").notNull(),
  relSpeciesName: text("rel_species_name").notNull(),
  outputPath: text("output_path"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const pipelineRequestSchema = z.object({
  // Core organism inputs
  orgName: z.string().min(1, "Organism name is required"),
  clade: z.enum(["vertebrates", "plants"]),
  readsR1: z.array(z.string()).min(1, "At least one R1 read file is required").or(z.string().min(1).transform(s => [s])),
  readsR2: z.array(z.string()).optional().default([]),
  genome: z.string().min(1, "Genome file is required"),
  annotation: z.string().min(1, "Annotation file is required"),
  rRNAs: z.string().min(1, "rRNA sequences file is required"),
  
  // Optional organism inputs
  liftover: z.string().optional().default(""),
  noncoding: z.string().optional().default(""),
  mir: z.string().optional().default(""),
  sno: z.string().optional().default(""),
  knownLncRNAs: z.string().optional().default(""),
  design: z.string().optional().default(""),
  
  // Related species core inputs
  relSpeciesName: z.string().min(1, "Related species name is required"),
  genomeRelatedSpecies: z.string().min(1, "Related species genome is required"),
  annotationRelatedSpecies: z.string().min(1, "Related species annotation is required"),
  
  // Related species optional inputs
  relLiftover: z.string().optional().default(""),
  relNoncoding: z.string().optional().default(""),
  relMir: z.string().optional().default(""),
  relSno: z.string().optional().default(""),
});

export const insertPipelineJobSchema = createInsertSchema(pipelineJobs).omit({
  createdAt: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PipelineRequest = z.infer<typeof pipelineRequestSchema>;
export type PipelineJob = typeof pipelineJobs.$inferSelect;
export type InsertPipelineJob = z.infer<typeof insertPipelineJobSchema>;
