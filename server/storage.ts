import { users, pipelineJobs, type User, type InsertUser, type PipelineJob, type InsertPipelineJob } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Pipeline job methods
  createPipelineJob(job: InsertPipelineJob): Promise<PipelineJob>;
  getPipelineJob(id: string): Promise<PipelineJob | undefined>;
  updatePipelineJobStatus(id: string, status: string, currentStep?: string, outputPath?: string): Promise<PipelineJob | undefined>;
  getAllPipelineJobs(): Promise<PipelineJob[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pipelineJobs: Map<string, PipelineJob>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.pipelineJobs = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPipelineJob(job: InsertPipelineJob): Promise<PipelineJob> {
    const pipelineJob: PipelineJob = {
      ...job,
      status: job.status || "pending",
      currentStep: job.currentStep || null,
      outputPath: job.outputPath || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.pipelineJobs.set(job.id, pipelineJob);
    return pipelineJob;
  }

  async getPipelineJob(id: string): Promise<PipelineJob | undefined> {
    return this.pipelineJobs.get(id);
  }

  async updatePipelineJobStatus(
    id: string, 
    status: string, 
    currentStep?: string, 
    outputPath?: string
  ): Promise<PipelineJob | undefined> {
    const job = this.pipelineJobs.get(id);
    if (!job) return undefined;

    const updatedJob: PipelineJob = {
      ...job,
      status,
      currentStep: currentStep || null,
      outputPath: outputPath || null,
      completedAt: status === "completed" ? new Date() : job.completedAt,
    };

    this.pipelineJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getAllPipelineJobs(): Promise<PipelineJob[]> {
    return Array.from(this.pipelineJobs.values());
  }
}

export const storage = new MemStorage();
