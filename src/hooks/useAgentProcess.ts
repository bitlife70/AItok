import { useStore } from '../store/useStore';
import { UploadedFile } from '../types';
import { AgentProcessService } from '../services/agentProcessService';

export function useAgentProcess() {
  const { addAgentProcess, updateAgentProcess, setCurrentAgentStep } = useStore();

  const startInputAnalysis = (processId: string, content: string, files?: UploadedFile[]) => {
    const process = AgentProcessService.createInputAnalysisProcess(processId, content, files);
    addAgentProcess(process);
    setCurrentAgentStep('Analyzing user input');
  };

  const completeInputAnalysis = (processId: string) => {
    updateAgentProcess(processId, AgentProcessService.completeProcess());
  };

  const startContextPreparation = (processId: string, modelName: string) => {
    const contextProcessId = AgentProcessService.generateProcessId('process-context');
    const process = AgentProcessService.createContextPreparationProcess(contextProcessId, processId, modelName);
    addAgentProcess(process);
    setCurrentAgentStep('Preparing context for LLM');
    return contextProcessId;
  };

  const startStreaming = (parentId: string) => {
    const streamProcessId = AgentProcessService.generateProcessId('process-stream');
    const process = AgentProcessService.createStreamingProcess(streamProcessId, parentId);
    addAgentProcess(process);
    setCurrentAgentStep('Streaming LLM response');
    return streamProcessId;
  };

  const startFinalProcessing = (parentId: string, contentLength: number) => {
    const finalProcessId = AgentProcessService.generateProcessId('process-final');
    const process = AgentProcessService.createFinalProcessingProcess(finalProcessId, parentId, contentLength);
    addAgentProcess(process);
    return finalProcessId;
  };

  const completeProcess = (processId: string) => {
    updateAgentProcess(processId, AgentProcessService.completeProcess());
  };

  const errorProcess = (processId: string, error: Error | string) => {
    const errorUpdate = AgentProcessService.createErrorProcess(processId, error instanceof Error ? error.message : error);
    updateAgentProcess(processId, errorUpdate);
    setCurrentAgentStep(null);
  };

  const finishAllProcesses = () => {
    setCurrentAgentStep(null);
  };

  return {
    startInputAnalysis,
    completeInputAnalysis,
    startContextPreparation,
    startStreaming,
    startFinalProcessing,
    completeProcess,
    errorProcess,
    finishAllProcesses
  };
}