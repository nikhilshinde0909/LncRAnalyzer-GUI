import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, ListTodo } from "lucide-react";

interface PipelineProgressProps {
  status: string;
  currentStep?: string;
}

export default function PipelineProgress({ status, currentStep }: PipelineProgressProps) {
  const steps = [
    "Adapter Trimming",
    "rRNA Removal", 
    "Genome Alignment",
    "Transcript Assembly",
    "LncRNA Identification",
    "Functional Analysis",
    "Report Generation"
  ];

  const getStepStatus = (step: string, index: number) => {
    if (status === "idle") return "pending";
    if (status === "completed") return "completed";
    if (status === "failed") return index === 0 ? "failed" : "pending";
    
    if (currentStep === step) return "running";
    
    const currentIndex = steps.indexOf(currentStep || "");
    if (currentIndex > index) return "completed";
    if (currentIndex === index) return "running";
    return "pending";
  };

  const getProgress = () => {
    if (status === "idle") return 0;
    if (status === "completed") return 100;
    if (status === "failed") return 10;
    
    const currentIndex = steps.indexOf(currentStep || "");
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "running":
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "running":
        return `Running: ${currentStep || "Starting..."}`;
      case "completed":
        return "Pipeline Completed";
      case "failed":
        return "Pipeline Failed";
      default:
        return "Ready to start";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center">
          <ListTodo className="mr-2 h-4 w-4 text-primary" />
          Pipeline Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">{getStatusText()}</span>
            <span className="text-sm text-slate-500">{Math.round(getProgress())}%</span>
          </div>
          
          <Progress value={getProgress()} className="w-full" />
          
          {/* Pipeline Steps */}
          <div className="space-y-3 mt-6">
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(step, index);
              return (
                <div 
                  key={step}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    stepStatus === "running" ? "bg-blue-50 border border-blue-200" : 
                    stepStatus === "completed" ? "bg-green-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6">
                    {stepStatus === "pending" ? (
                      <span className="text-xs font-medium text-slate-600 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                        {index + 1}
                      </span>
                    ) : (
                      getStatusIcon(stepStatus)
                    )}
                  </div>
                  <span className={`text-sm ${
                    stepStatus === "completed" ? "text-green-700 font-medium" :
                    stepStatus === "running" ? "text-blue-700 font-medium" :
                    stepStatus === "failed" ? "text-red-700" :
                    "text-slate-500"
                  }`}>
                    {step}
                  </span>
                  {stepStatus === "running" && (
                    <Clock className="text-blue-600 h-4 w-4 ml-auto animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
