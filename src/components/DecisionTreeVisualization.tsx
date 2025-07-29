import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AgentProcess, AgentDecision } from '../types';

interface DecisionTreeNode {
  id: string;
  name: string;
  type: 'process' | 'decision' | 'option';
  status: 'pending' | 'running' | 'completed' | 'error';
  children?: DecisionTreeNode[];
  decision?: AgentDecision;
  confidence?: number;
  x?: number;
  y?: number;
  parent?: DecisionTreeNode;
}

interface DecisionTreeVisualizationProps {
  processes: AgentProcess[];
  width?: number;
  height?: number;
}

export default function DecisionTreeVisualization({ 
  processes, 
  width = 800, 
  height = 600 
}: DecisionTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<DecisionTreeNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || processes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create tree data structure from processes
    const treeData = buildTreeFromProcesses(processes);
    if (!treeData) return;

    // Set up margins and dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const treeLayout = d3.tree<DecisionTreeNode>()
      .size([innerWidth, innerHeight]);

    // Create hierarchy
    const root = d3.hierarchy(treeData);
    const treeNodes = treeLayout(root);

    // Add links
    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        const source = d.source;
        const target = d.target;
        return `M${source.x},${source.y}L${target.x},${target.y}`;
      })
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('stroke-dasharray', (d) => {
        if (d.target.data.type === 'decision') return '5,5';
        return 'none';
      });

    // Add nodes
    const nodes = g.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedNode(d.data);
      });

    // Add node circles
    nodes.append('circle')
      .attr('r', (d) => {
        if (d.data.type === 'decision') return 12;
        if (d.data.type === 'option') return 8;
        return 10;
      })
      .attr('fill', (d) => {
        switch (d.data.status) {
          case 'completed': return '#10b981';
          case 'running': return '#3b82f6';
          case 'error': return '#ef4444';
          case 'pending': return '#6b7280';
          default: return '#9ca3af';
        }
      })
      .attr('stroke', (d) => {
        if (d.data.type === 'decision') return '#8b5cf6';
        return '#fff';
      })
      .attr('stroke-width', 2);

    // Add node labels
    nodes.append('text')
      .attr('dy', '0.3em')
      .attr('x', (d) => d.children ? -15 : 15)
      .style('text-anchor', (d) => d.children ? 'end' : 'start')
      .style('font-size', '12px')
      .style('font-weight', (d) => d.data.type === 'decision' ? 'bold' : 'normal')
      .text((d) => {
        const maxLength = 20;
        const name = d.data.name;
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
      });

    // Add confidence indicators for decisions
    nodes.filter(d => d.data.type === 'decision' && d.data.confidence !== undefined)
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', 0)
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(d => `${Math.round(d.data.confidence! * 100)}%`);

    // Add animations for running nodes
    nodes.filter(d => d.data.status === 'running')
      .select('circle')
      .transition()
      .duration(1000)
      .attr('r', (d) => {
        if (d.data.type === 'decision') return 15;
        if (d.data.type === 'option') return 11;
        return 13;
      })
      .transition()
      .duration(1000)
      .attr('r', (d) => {
        if (d.data.type === 'decision') return 12;
        if (d.data.type === 'option') return 8;
        return 10;
      })
      .on('end', function() {
        const element = d3.select(this).node() as Element;
        if (element && element.parentNode) {
          element.parentNode.dispatchEvent(new Event('rerun'));
        }
      });

  }, [processes, width, height]);

  const buildTreeFromProcesses = (processes: AgentProcess[]): DecisionTreeNode | null => {
    if (processes.length === 0) return null;

    // Find root process (no parent)
    const rootProcess = processes.find(p => !p.parentId) || processes[0];
    
    const buildNode = (process: AgentProcess): DecisionTreeNode => {
      const node: DecisionTreeNode = {
        id: process.id,
        name: process.step,
        type: process.decision ? 'decision' : 'process',
        status: process.status,
        decision: process.decision,
        confidence: process.decision?.confidence
      };

      // Add children
      const childProcesses = processes.filter(p => p.parentId === process.id);
      if (childProcesses.length > 0) {
        node.children = childProcesses.map(buildNode);
      }

      // Add decision options as children if this is a decision node
      if (process.decision && process.decision.options.length > 0) {
        const optionNodes: DecisionTreeNode[] = process.decision.options.map(option => ({
          id: `${process.id}-option-${option.id}`,
          name: option.label,
          type: 'option',
          status: option.id === process.decision!.selectedOption ? 'completed' : 'pending'
        }));

        node.children = [...(node.children || []), ...optionNodes];
      }

      return node;
    };

    return buildNode(rootProcess);
  };

  return (
    <div className="decision-tree-visualization">
      <div className="flex">
        <div className="flex-1">
          <svg ref={svgRef}></svg>
        </div>
        
        {/* Details Panel */}
        {selectedNode && (
          <div className="w-80 p-4 bg-gray-50 border-l">
            <h3 className="font-medium text-gray-900 mb-3">Node Details</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Name</div>
                <div className="text-sm text-gray-900">{selectedNode.name}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Type</div>
                <div className="text-sm text-gray-900 capitalize">{selectedNode.type}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Status</div>
                <div className={`text-sm font-medium ${
                  selectedNode.status === 'completed' ? 'text-green-600' :
                  selectedNode.status === 'running' ? 'text-blue-600' :
                  selectedNode.status === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {selectedNode.status}
                </div>
              </div>

              {selectedNode.decision && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Decision</div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-900 mb-2">
                      {selectedNode.decision.question}
                    </div>
                    
                    {selectedNode.decision.options.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-600">Options:</div>
                        {selectedNode.decision.options.map(option => (
                          <div 
                            key={option.id}
                            className={`text-xs p-2 rounded ${
                              option.id === selectedNode.decision!.selectedOption 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {option.label}
                            {option.weight && (
                              <span className="ml-2 text-gray-500">
                                ({Math.round(option.weight * 100)}%)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedNode.decision.reasoning && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600">Reasoning:</div>
                        <div className="text-xs text-gray-700">{selectedNode.decision.reasoning}</div>
                      </div>
                    )}

                    {selectedNode.confidence && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600">Confidence:</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${selectedNode.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700">
                            {Math.round(selectedNode.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}