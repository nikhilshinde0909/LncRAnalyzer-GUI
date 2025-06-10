import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { pipelineRequestSchema, type PipelineRequest } from "@shared/schema";
import FileUpload from "@/components/FileUpload";
import PipelineProgress from "@/components/PipelineProgress";
import { 
  Dna, 
  Play, 
  RotateCcw, 
  Download, 
  HelpCircle, 
  Clock, 
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Asterisk,
  Plus,
  Minus,
  Info,
  FileArchive,
  Book
} from "lucide-react";
import { FaDocker } from "react-icons/fa";

export default function Pipeline() {
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [pipelineJobId, setPipelineJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const form = useForm<PipelineRequest>({
    resolver: zodResolver(pipelineRequestSchema),
    defaultValues: {
      orgName: "Homo_sapiens",
      clade: "vertebrates",
      readsR1: [],
      readsR2: [],
      genome: "",
      annotation: "",
      rRNAs: "",
      liftover: "",
      noncoding: "",
      mir: "",
      sno: "",
      knownLncRNAs: "",
      design: "",
      relSpeciesName: "Mus_musculus",
      genomeRelatedSpecies: "",
      annotationRelatedSpecies: "",
      relLiftover: "",
      relNoncoding: "",
      relMir: "",
      relSno: "",
    },
  });

  // Query for pipeline status
  const { data: pipelineStatus } = useQuery<{
    status: string;
    currentStep?: string;
    outputPath?: string;
  }>({
    queryKey: ["/api/pipeline/status", pipelineJobId],
    enabled: !!pipelineJobId,
    refetchInterval: 2000,
  });

  // System info
  const { data: systemInfo, error, isLoading } = useQuery({
  queryKey: ['/api/pipeline/system-info'],
  queryFn: async () => {
    const res = await fetch('/api/pipeline/system-info');
    const json = await res.json();
    console.log("Fetched system info:", json);
    return json;
  },
  refetchInterval: 5000,
  });
  console.log(systemInfo);
  if (systemInfo) {
  console.log("Sending system info:", {
    dockerRunning: systemInfo.dockerRunning,
    cpuUsagePercent: systemInfo.cpuUsagePercent,
    memory: {
      used: systemInfo.memory?.used,
      total: systemInfo.memory?.total,
    },
    storage: {
      free: systemInfo.storage?.free,
      }
      });
   }
   if (systemInfo) {
  console.log("Sending system info:", {
    dockerRunning: systemInfo.dockerRunning,
    cpuUsagePercent: systemInfo.cpuUsagePercent,
    memory: {
      used: systemInfo.memory?.used,
      total: systemInfo.memory?.total,
    },
    storage: {
      free: systemInfo.storage?.free,
    }
  });
  }

  // Mutation for running pipeline
  const runPipelineMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Pipeline failed to start");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPipelineJobId(data.jobId);
      toast({
        title: "Pipeline Started",
        description: "LncRAnalyzer pipeline has been started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/status"] });
    },
    onError: (error) => {
      toast({
        title: "Pipeline Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Download results mutation
  const downloadResultsMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/pipeline/download/${jobId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to download results");
      }
      
      return response.blob();
    },
    onSuccess: (blob, jobId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LncRAnalyzer-summary-${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "LncRAnalyzer results are being downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (fieldName: string, files: File[]) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fieldName]: files
    }));

    // Notify react-hook-form
    if (fieldName === "readsR1" || fieldName === "readsR2") {
      form.setValue(fieldName, files.map(f => f.name), { shouldValidate: true });
    } else {
      form.setValue(fieldName as any, files[0]?.name || "", { shouldValidate: true });
    }
  };

  const removeFile = (fieldName: string, index: number) => {
    const currentFiles = uploadedFiles[fieldName] || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    handleFileUpload(fieldName, newFiles);
  };

  const onSubmit = async (data: PipelineRequest) => {
    console.log("Form data:", data);
    console.log("Uploaded files:", uploadedFiles);
    
    // Check form validation errors
    console.log("Form errors:", form.formState.errors);
    
    const formData = new FormData();
    
    // Add core organism fields
    formData.append("orgName", data.orgName || "");
    formData.append("clade", data.clade || "");
    formData.append("relSpeciesName", data.relSpeciesName || "");
    
    // Add organism files
    formData.append("genome", data.genome || "");
    formData.append("annotation", data.annotation || "");
    formData.append("rRNAs", data.rRNAs || "");
    
    // Add optional organism files
    formData.append("liftover", data.liftover || "");
    formData.append("noncoding", data.noncoding || "");
    formData.append("mir", data.mir || "");
    formData.append("sno", data.sno || "");
    formData.append("knownLncRNAs", data.knownLncRNAs || "");
    formData.append("design", data.design || "");
    
    // Add related species files
    formData.append("genomeRelatedSpecies", data.genomeRelatedSpecies || "");
    formData.append("annotationRelatedSpecies", data.annotationRelatedSpecies || "");
    formData.append("relLiftover", data.relLiftover || "");
    formData.append("relNoncoding", data.relNoncoding || "");
    formData.append("relMir", data.relMir || "");
    formData.append("relSno", data.relSno || "");

    // Add array fields
    if (data.readsR1 && data.readsR1.length > 0) {
      data.readsR1.forEach(name => formData.append("readsR1[]", name));
    }
    if (data.readsR2 && data.readsR2.length > 0) {
      data.readsR2.forEach(name => formData.append("readsR2[]", name));
    }

    // Add files
    Object.entries(uploadedFiles).forEach(([fieldName, files]) => {
      files.forEach(file => {
        formData.append(fieldName, file);
      });
    });

    // Log what we're sending
    console.log("FormData entries:");
    const entries = Array.from(formData.entries());
    entries.forEach(([key, value]) => {
      console.log(key, value);
    });

    runPipelineMutation.mutate(formData);
  };

  const resetForm = () => {
    if (pipelineStatus?.status === "running") {
      if (!window.confirm("Pipeline is running. Are you sure you want to reset?")) {
        return;
      }
    }
    
    form.reset();
    setUploadedFiles({});
    setPipelineJobId(null);
    
    // Clear file inputs
    Object.values(fileInputRefs.current).forEach(input => {
      if (input) input.value = "";
    });

    toast({
      title: "Form Reset",
      description: "Form has been reset successfully.",
    });
  };

  const isRunning = pipelineStatus?.status === "running";
  const isCompleted = pipelineStatus?.status === "completed";
  const hasFailed = pipelineStatus?.status === "failed";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Dna className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">LncRAnalyzer</h1>
                <p className="text-sm text-slate-600">A pipeline for lncRNAs and Novel Protein Coding Transcripts (NPCTs) identification using RNA-Seq</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isRunning && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Clock className="text-blue-600 animate-pulse h-4 w-4" />
                    <span className="text-sm font-medium text-blue-800">Pipeline Running...</span>
                  </div>
                </div>
              )}
              {isCompleted && (
                <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600 h-4 w-4" />
                    <span className="text-sm font-medium text-green-800">Pipeline Completed</span>
                  </div>
                </div>
              )}
              <Button variant="outline">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Required Inputs Section */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-primary text-white">
                    <CardTitle className="flex items-center">
                      <Asterisk className="mr-2 h-4 w-4" />
                      Required Inputs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Sequencing Reads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FileUpload
                        label="Reads R1"
                        accept=".fastq.gz"
                        multiple
                        required
                        files={uploadedFiles.readsR1 || []}
                        onFilesChange={(files) => handleFileUpload("readsR1", files)}
                        onRemoveFile={(index) => removeFile("readsR1", index)}
                        ref={el => fileInputRefs.current.readsR1 = el}
                      />
                      <FileUpload
                        label="Reads R2 (optional)"
                        accept=".fastq.gz"
                        multiple
                        files={uploadedFiles.readsR2 || []}
                        onFilesChange={(files) => handleFileUpload("readsR2", files)}
                        onRemoveFile={(index) => removeFile("readsR2", index)}
                        ref={el => fileInputRefs.current.readsR2 = el}
                      />
                    </div>

                    {/* Organism Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="orgName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organism Name<span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="clade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clade <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="vertebrates">Vertebrates</SelectItem>
                                <SelectItem value="plants">Plants</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="relSpeciesName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Related Species<span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Reference Files */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FileUpload
                        label="Genome (FASTA)"
                        accept=".fasta,.fa,.fas"
                        required
                        files={uploadedFiles.genome ? [uploadedFiles.genome[0]] : []}
                        onFilesChange={(files) => handleFileUpload("genome", files)}
                        ref={el => fileInputRefs.current.genome = el}
                      />
                      <FileUpload
                        label="Annotation (GTF)"
                        accept=".gtf"
                        required
                        files={uploadedFiles.annotation ? [uploadedFiles.annotation[0]] : []}
                        onFilesChange={(files) => handleFileUpload("annotation", files)}
                        ref={el => fileInputRefs.current.annotation = el}
                      />
                      <FileUpload
                        label="rRNA Sequences (FASTA)"
                        accept=".fasta,.fa,.fas"
                        required
                        files={uploadedFiles.rRNAs ? [uploadedFiles.rRNAs[0]] : []}
                        onFilesChange={(files) => handleFileUpload("rRNAs", files)}
                        ref={el => fileInputRefs.current.rRNAs = el}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Optional Organism Inputs Section */}
                <Card className="overflow-hidden">
                  <CardHeader 
                    className="bg-slate-100 cursor-pointer"
                    onClick={() => setOptionalExpanded(!optionalExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center">
                        <Plus className="mr-2 h-4 w-4 text-slate-500" />
                        Optional Organism Inputs
                      </div>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${optionalExpanded ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                  {optionalExpanded && (
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUpload
                          label="Liftover Chain (GZ)"
                          accept=".gz"
                          files={uploadedFiles.liftover ? [uploadedFiles.liftover[0]] : []}
                          onFilesChange={(files) => handleFileUpload("liftover", files)}
                          ref={el => fileInputRefs.current.liftover = el}
                        />
                        <FileUpload
                          label="Noncoding BED"
                          accept=".bed"
                          files={uploadedFiles.noncoding ? [uploadedFiles.noncoding[0]] : []}
                          onFilesChange={(files) => handleFileUpload("noncoding", files)}
                          ref={el => fileInputRefs.current.noncoding = el}
                        />
                        <FileUpload
                          label="miRNA BED"
                          accept=".bed"
                          files={uploadedFiles.mir ? [uploadedFiles.mir[0]] : []}
                          onFilesChange={(files) => handleFileUpload("mir", files)}
                          ref={el => fileInputRefs.current.mir = el}
                        />
                        <FileUpload
                          label="snoRNA BED"
                          accept=".bed"
                          files={uploadedFiles.sno ? [uploadedFiles.sno[0]] : []}
                          onFilesChange={(files) => handleFileUpload("sno", files)}
                          ref={el => fileInputRefs.current.sno = el}
                        />
                        <FileUpload
                          label="Known lncRNAs (FASTA)"
                          accept=".fasta,.fa,.fas"
                          files={uploadedFiles.knownLncRNAs ? [uploadedFiles.knownLncRNAs[0]] : []}
                          onFilesChange={(files) => handleFileUpload("knownLncRNAs", files)}
                          ref={el => fileInputRefs.current.knownLncRNAs = el}
                        />
                        <FileUpload
                          label="Design TSV"
                          accept=".tsv"
                          files={uploadedFiles.design ? [uploadedFiles.design[0]] : []}
                          onFilesChange={(files) => handleFileUpload("design", files)}
                          ref={el => fileInputRefs.current.design = el}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Related Species Section */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center text-blue-800">
                      <Dna className="mr-2 h-4 w-4" />
                      Related Species (Required)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Core Related Species Files */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FileUpload
                        label="Related Species Genome"
                        accept=".fasta,.fa,.fas"
                        required
                        files={uploadedFiles.genomeRelatedSpecies ? [uploadedFiles.genomeRelatedSpecies[0]] : []}
                        onFilesChange={(files) => handleFileUpload("genomeRelatedSpecies", files)}
                        ref={el => fileInputRefs.current.genomeRelatedSpecies = el}
                      />
                      <FileUpload
                        label="Related Species Annotation"
                        accept=".gtf"
                        required
                        files={uploadedFiles.annotationRelatedSpecies ? [uploadedFiles.annotationRelatedSpecies[0]] : []}
                        onFilesChange={(files) => handleFileUpload("annotationRelatedSpecies", files)}
                        ref={el => fileInputRefs.current.annotationRelatedSpecies = el}
                      />
                    </div>

                    {/* Optional Related Species Files */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-4">Optional Related Species Files</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUpload
                          label="Related Liftover Chain (GZ)"
                          accept=".gz"
                          files={uploadedFiles.relLiftover ? [uploadedFiles.relLiftover[0]] : []}
                          onFilesChange={(files) => handleFileUpload("relLiftover", files)}
                          ref={el => fileInputRefs.current.relLiftover = el}
                        />
                        <FileUpload
                          label="Related Noncoding BED"
                          accept=".bed"
                          files={uploadedFiles.relNoncoding ? [uploadedFiles.relNoncoding[0]] : []}
                          onFilesChange={(files) => handleFileUpload("relNoncoding", files)}
                          ref={el => fileInputRefs.current.relNoncoding = el}
                        />
                        <FileUpload
                          label="Related miRNA BED"
                          accept=".bed"
                          files={uploadedFiles.relMir ? [uploadedFiles.relMir[0]] : []}
                          onFilesChange={(files) => handleFileUpload("relMir", files)}
                          ref={el => fileInputRefs.current.relMir = el}
                        />
                        <FileUpload
                          label="Related snoRNA BED"
                          accept=".bed"
                          files={uploadedFiles.relSno ? [uploadedFiles.relSno[0]] : []}
                          onFilesChange={(files) => handleFileUpload("relSno", files)}
                          ref={el => fileInputRefs.current.relSno = el}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Form
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={runPipelineMutation.isPending || isRunning}
                    className="bg-primary hover:bg-blue-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {runPipelineMutation.isPending ? "Starting..." : "Run Pipeline"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pipeline Progress */}
            <PipelineProgress 
              status={pipelineStatus?.status || "idle"}
              currentStep={pipelineStatus?.currentStep}
            />

            {/* Results Panel */}
            {isCompleted && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <FileArchive className="mr-2 h-4 w-4 text-green-600" />
                    Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">Pipeline Completed Successfully</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Analysis finished at {new Date().toLocaleString()}
                        </p>
                      </div>
                      <CheckCircle className="text-green-600 h-5 w-5" />
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => pipelineJobId && downloadResultsMutation.mutate(pipelineJobId)}
                    disabled={downloadResultsMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadResultsMutation.isPending ? "Downloading..." : "Download Results"}
                  </Button>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Transcripts:</span>
                      <span className="font-medium">12,543</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">LncRNAs Identified:</span>
                      <span className="font-medium">2,847</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Novel LncRNAs:</span>
                      <span className="font-medium">1,203</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Processing Time:</span>
                      <span className="font-medium">2h 34m</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Information */}
            <Card className="overflow-hidden">
            <CardHeader>
            <CardTitle className="flex items-center">
      <FaDocker className="mr-2 h-4 w-4 text-primary" />
      System Info
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3 text-sm">
    {!systemInfo ? (
      <p className="text-slate-500">Loading system info...</p>
    ) : (
      <>
        <div className="flex justify-between">
          <span className="text-slate-600">Docker Status:</span>
          <span
            className={`flex items-center ${
              systemInfo.dockerRunning ? "text-green-600" : "text-red-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-1 ${
                systemInfo.dockerRunning ? "bg-green-600" : "bg-red-600"
              }`}
            />
            {systemInfo.dockerRunning ? "Running" : "Stopped"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">CPU Usage:</span>
          <span className="font-medium">{systemInfo.cpuUsagePercent}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">Memory Usage:</span>
          <span className="font-medium">
            {systemInfo.memory
              ? `${(systemInfo.memory.used / 1024 ** 3).toFixed(1)} GB / ${(systemInfo.memory.total / 1024 ** 3).toFixed(1)} GB`
              : "N/A"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">Available Storage:</span>
          <span className="font-medium">
            {systemInfo.storage?.free != null
              ? `${(systemInfo.storage.free / 1024 ** 3).toFixed(0)} GB`
              : "N/A"}
              </span>
              </div>
              </>
              )}
              </CardContent>
              </Card>
	     </div>
        </div>
      </main>
    </div>
  );
}
