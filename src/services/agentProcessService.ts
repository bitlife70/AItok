import { UploadedFile } from '../types';

export interface ProcessDecisionOption {
  id: string;
  label: string;
  weight: number;
}

export interface ProcessDecision {
  question: string;
  options: ProcessDecisionOption[];
  selectedOption: string;
  reasoning: string;
  confidence: number;
}

export interface AgentProcess {
  id: string;
  step: string;
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  details?: string;
  tools?: string[];
  parentId?: string;
  decision?: ProcessDecision;
}

export class AgentProcessService {
  static createInputAnalysisProcess(processId: string, content: string, files?: UploadedFile[]): AgentProcess {
    return {
      id: processId,
      step: 'Analyzing user input',
      status: 'running',
      startTime: new Date(),
      details: `Analyzing message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      tools: ['text-analyzer'],
      decision: files && files.length > 0 ? {
        question: 'How to handle attached files?',
        options: [
          { id: 'process-text', label: 'Process text files', weight: 0.8 },
          { id: 'analyze-images', label: 'Analyze images', weight: 0.6 },
          { id: 'extract-content', label: 'Extract content', weight: 0.9 }
        ],
        selectedOption: files.some(f => f.content) ? 'process-text' : 'analyze-images',
        reasoning: 'Files detected in message, determining best processing approach',
        confidence: 0.85
      } : undefined
    };
  }

  static createContextPreparationProcess(processId: string, parentId: string, modelName: string): AgentProcess {
    return {
      id: processId,
      step: 'Preparing context for LLM',
      status: 'running',
      startTime: new Date(),
      details: `Using model: ${modelName}`,
      tools: ['context-builder', 'token-counter'],
      parentId,
      decision: {
        question: 'Which model strategy to use?',
        options: [
          { id: 'direct', label: 'Direct response', weight: 0.7 },
          { id: 'chain-of-thought', label: 'Chain of thought', weight: 0.8 },
          { id: 'tool-use', label: 'Tool-assisted', weight: 0.6 }
        ],
        selectedOption: 'chain-of-thought',
        reasoning: `Selected ${modelName} for optimal response quality`,
        confidence: 0.92
      }
    };
  }

  static createStreamingProcess(processId: string, parentId: string): AgentProcess {
    return {
      id: processId,
      step: 'Streaming LLM response',
      status: 'running',
      startTime: new Date(),
      details: 'Receiving real-time response from LLM',
      tools: ['stream-processor', 'response-validator'],
      parentId
    };
  }

  static createFinalProcessingProcess(processId: string, parentId: string, contentLength: number): AgentProcess {
    return {
      id: processId,
      step: 'Finalizing response',
      status: 'running',
      startTime: new Date(),
      details: `Generated ${contentLength} characters`,
      tools: ['response-formatter', 'quality-checker'],
      parentId
    };
  }

  static createErrorProcess(_processId: string, error: string): Partial<AgentProcess> {
    return {
      status: 'error',
      endTime: new Date(),
      step: 'Error occurred',
      details: error
    };
  }

  static completeProcess(): Partial<AgentProcess> {
    return {
      status: 'completed',
      endTime: new Date()
    };
  }

  static generateProcessId(prefix: string = 'process'): string {
    return `${prefix}-${Date.now()}`;
  }
}