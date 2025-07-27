import { 
  XMarkIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';

export default function AgentPanel() {
  const { 
    agentPanelOpen, 
    toggleAgentPanel, 
    agentProcesses, 
    currentAgentStep 
  } = useStore();

  if (!agentPanelOpen) return null;

  return (
    <div className="agent-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Agent</h2>
          <button
            onClick={toggleAgentPanel}
            className="btn-ghost"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>

        {/* Current Step */}
        {currentAgentStep && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-900 mb-1">Current Step</div>
            <div className="text-sm text-blue-700">{currentAgentStep}</div>
          </div>
        )}
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto p-4">
        {agentProcesses.length === 0 ? (
          <div className="text-center py-8">
            <CpuChipIcon className="w-6 h-6 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No processes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agentProcesses.map((process) => (
              <div key={process.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">{process.step}</div>
                  <div className={`agent-status ${process.status}`}>
                    <div className={`status-dot ${process.status}`}></div>
                    {process.status}
                  </div>
                </div>
                
                {process.details && (
                  <div className="text-xs text-gray-600 mb-2">{process.details}</div>
                )}
                
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  {process.startTime.toLocaleTimeString()}
                  {process.endTime && (
                    <span className="ml-2">
                      ({Math.round((process.endTime.getTime() - process.startTime.getTime()) / 1000)}s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {agentProcesses.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Statistics</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{agentProcesses.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {agentProcesses.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-500">Done</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {agentProcesses.filter(p => p.status === 'error').length}
              </div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}