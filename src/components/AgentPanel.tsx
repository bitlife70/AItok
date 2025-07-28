import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  XMarkIcon,
  ClockIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ShareIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';
import DecisionTreeVisualization from './DecisionTreeVisualization';
import ProcessFlowChart from './ProcessFlowChart';

export default function AgentPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'processes' | 'performance' | 'tools' | 'flow' | 'decisions'>('processes');
  const [performanceData, setPerformanceData] = useState({
    avgResponseTime: 0,
    totalRequests: 0,
    successRate: 0
  });

  const { 
    agentPanelOpen, 
    toggleAgentPanel, 
    agentProcesses, 
    currentAgentStep 
  } = useStore();

  // Calculate performance metrics
  useEffect(() => {
    const completedProcesses = agentProcesses.filter(p => p.endTime);
    const totalTime = completedProcesses.reduce((sum, p) => {
      return sum + (p.endTime!.getTime() - p.startTime.getTime());
    }, 0);
    
    const avgTime = completedProcesses.length > 0 ? totalTime / completedProcesses.length : 0;
    const successRate = agentProcesses.length > 0 
      ? (agentProcesses.filter(p => p.status === 'completed').length / agentProcesses.length) * 100 
      : 0;

    setPerformanceData({
      avgResponseTime: avgTime,
      totalRequests: agentProcesses.length,
      successRate
    });
  }, [agentProcesses]);

  if (!agentPanelOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'running':
        return <PlayIcon className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <PauseIcon className="w-4 h-4 text-gray-400" />;
      default:
        return <CpuChipIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="agent-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('agent.title')}</h2>
          <button
            onClick={toggleAgentPanel}
            className="btn-ghost"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Current Step */}
        {currentAgentStep && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <PlayIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-pulse" />
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('agent.currentStep')}</div>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{currentAgentStep}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-5 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded transition-colors ${
              activeTab === 'processes'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CpuChipIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">List</span>
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded transition-colors ${
              activeTab === 'flow'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShareIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Flow</span>
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded transition-colors ${
              activeTab === 'decisions'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <EyeIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Tree</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded transition-colors ${
              activeTab === 'performance'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChartBarIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded transition-colors ${
              activeTab === 'tools'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <WrenchScrewdriverIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Tools</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'processes' && (
          <>
            {agentProcesses.length === 0 ? (
              <div className="text-center py-8">
                <CpuChipIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No processes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agentProcesses.slice().reverse().map((process) => (
                  <div key={process.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{process.step}</div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(process.status)}
                        <span className={`text-xs font-medium ${
                          process.status === 'completed' ? 'text-green-600' :
                          process.status === 'error' ? 'text-red-600' :
                          process.status === 'running' ? 'text-blue-600' :
                          'text-gray-500'
                        }`}>
                          {process.status}
                        </span>
                      </div>
                    </div>
                    
                    {process.details && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 bg-gray-50 dark:bg-gray-700 rounded p-2">{process.details}</div>
                    )}
                    
                    {process.tools && process.tools.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tools Used:</div>
                        <div className="flex flex-wrap gap-1">
                          {process.tools.map((tool, index) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                        {process.startTime.toLocaleTimeString()}
                      </div>
                      {process.endTime && (
                        <span className="font-medium">
                          {formatDuration(process.endTime.getTime() - process.startTime.getTime())}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Response Time</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(performanceData.avgResponseTime)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Success Rate</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {performanceData.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {agentProcesses.filter(p => p.status === 'completed').length} / {performanceData.totalRequests} completed
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Requests</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {performanceData.totalRequests}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">All time</div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Process Status</div>
              <div className="space-y-2">
                {['completed', 'running', 'error', 'pending'].map(status => {
                  const count = agentProcesses.filter(p => p.status === status).length;
                  const percentage = agentProcesses.length > 0 ? (count / agentProcesses.length) * 100 : 0;
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <span className="text-sm capitalize text-gray-900 dark:text-gray-100">{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              status === 'completed' ? 'bg-green-500' :
                              status === 'error' ? 'bg-red-500' :
                              status === 'running' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="h-full">
            <ProcessFlowChart 
              processes={agentProcesses} 
              width={600} 
              height={400}
              realtime={true}
            />
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="h-full">
            <DecisionTreeVisualization 
              processes={agentProcesses} 
              width={600} 
              height={400}
            />
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* Tools Usage */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tool Usage</div>
              {(() => {
                const toolUsage = new Map<string, number>();
                agentProcesses.forEach(p => {
                  if (p.tools) {
                    p.tools.forEach(tool => {
                      toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
                    });
                  }
                });

                if (toolUsage.size === 0) {
                  return (
                    <div className="text-center py-4">
                      <WrenchScrewdriverIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tools used yet</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {Array.from(toolUsage.entries())
                      .sort(([,a], [,b]) => b - a)
                      .map(([tool, count]) => (
                        <div key={tool} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tool}</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{count} uses</span>
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      {agentProcesses.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{agentProcesses.length} total processes</span>
            <span>
              {agentProcesses.filter(p => p.status === 'completed').length} completed, {' '}
              {agentProcesses.filter(p => p.status === 'error').length} errors
            </span>
          </div>
        </div>
      )}
    </div>
  );
}