import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AgentProcess, ProcessNode, FlowEdge } from '../types';

interface ProcessFlowChartProps {
  processes: AgentProcess[];
  width?: number;
  height?: number;
  realtime?: boolean;
}

interface FlowNode extends ProcessNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export default function ProcessFlowChart({ 
  processes, 
  width = 800, 
  height = 500,
  realtime = true 
}: ProcessFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<FlowNode, FlowEdge> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Convert processes to nodes and edges
    const { nodes, edges } = processesToFlowData(processes);
    if (nodes.length === 0) return;

    // Set up simulation
    const newSimulation = d3.forceSimulation<FlowNode>(nodes)
      .force('link', d3.forceLink<FlowNode, FlowEdge>(edges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    setSimulation(newSimulation);

    // Create main SVG
    svg.attr('width', width).attr('height', height);

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Create main group
    const g = svg.append('g');

    // Add arrow markers
    svg.append('defs').selectAll('marker')
      .data(['normal', 'decision', 'error'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        switch (d) {
          case 'decision': return '#8b5cf6';
          case 'error': return '#ef4444';
          default: return '#6b7280';
        }
      });

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('stroke', d => {
        switch (d.type) {
          case 'decision': return '#8b5cf6';
          case 'error': return '#ef4444';
          default: return '#6b7280';
        }
      })
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.type === 'decision' ? '5,5' : 'none')
      .attr('marker-end', d => `url(#arrow-${d.type || 'normal'})`);

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, FlowNode>()
        .on('start', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0);
          d.fx = undefined;
          d.fy = undefined;
        }))
      .on('click', (_, d) => {
        setSelectedNode(d);
      });

    // Add node shapes
    node.append('rect')
      .attr('width', d => getNodeWidth(d))
      .attr('height', d => getNodeHeight(d))
      .attr('x', d => -getNodeWidth(d) / 2)
      .attr('y', d => -getNodeHeight(d) / 2)
      .attr('rx', d => d.type === 'decision' ? 20 : 5)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add node icons
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '14px')
      .text(d => getNodeIcon(d));

    // Add node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .text(d => {
        const maxLength = 12;
        return d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
      });

    // Add edge labels
    const edgeLabels = g.append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(edges.filter(d => d.label))
      .enter().append('text')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', '#666')
      .text(d => d.label!);

    // Animation for running nodes
    const animateRunningNodes = () => {
      node.filter(d => d.status === 'running')
        .select('rect')
        .transition()
        .duration(1000)
        .attr('stroke-width', 4)
        .transition()
        .duration(1000)
        .attr('stroke-width', 2)
        .on('end', animateRunningNodes);
    };

    if (realtime) {
      animateRunningNodes();
    }

    // Update positions on simulation tick
    newSimulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as unknown as FlowNode).x)
        .attr('y1', d => (d.source as unknown as FlowNode).y)
        .attr('x2', d => (d.target as unknown as FlowNode).x)
        .attr('y2', d => (d.target as unknown as FlowNode).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);

      edgeLabels
        .attr('x', d => ((d.source as unknown as FlowNode).x + (d.target as unknown as FlowNode).x) / 2)
        .attr('y', d => ((d.source as unknown as FlowNode).y + (d.target as unknown as FlowNode).y) / 2);
    });

    return () => {
      newSimulation.stop();
    };

  }, [processes, width, height, realtime]);

  const processesToFlowData = (processes: AgentProcess[]) => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // Create input node
    if (processes.length > 0) {
      nodes.push({
        id: 'input',
        type: 'input',
        label: 'User Input',
        status: 'completed',
        x: 0,
        y: 0
      });
    }

    // Convert processes to nodes
    processes.forEach((process) => {
      nodes.push({
        id: process.id,
        type: process.decision ? 'decision' : 'process',
        label: process.step,
        status: process.status,
        data: process,
        x: 0,
        y: 0
      });

      // Add tool nodes if tools were used
      if (process.tools && process.tools.length > 0) {
        process.tools.forEach((tool, toolIndex) => {
          const toolNodeId = `${process.id}-tool-${toolIndex}`;
          nodes.push({
            id: toolNodeId,
            type: 'tool',
            label: tool,
            status: process.status,
            x: 0,
            y: 0
          });

          // Add edge from process to tool
          edges.push({
            id: `${process.id}-to-${toolNodeId}`,
            source: process.id,
            target: toolNodeId,
            type: 'normal'
          });
        });
      }
    });

    // Add output node
    const lastProcess = processes[processes.length - 1];
    if (lastProcess && lastProcess.status === 'completed') {
      nodes.push({
        id: 'output',
        type: 'output',
        label: 'AI Response',
        status: 'completed',
        x: 0,
        y: 0
      });

      edges.push({
        id: `${lastProcess.id}-to-output`,
        source: lastProcess.id,
        target: 'output',
        type: 'normal'
      });
    }

    // Create edges between processes
    processes.forEach((process, index) => {
      if (index === 0) {
        // Connect input to first process
        edges.push({
          id: `input-to-${process.id}`,
          source: 'input',
          target: process.id,
          type: 'normal'
        });
      } else {
        // Connect to previous process
        const prevProcess = processes[index - 1];
        edges.push({
          id: `${prevProcess.id}-to-${process.id}`,
          source: prevProcess.id,
          target: process.id,
          type: prevProcess.decision ? 'decision' : 'normal',
          label: prevProcess.decision?.selectedOption
        });
      }
    });

    return { nodes, edges };
  };

  const getNodeWidth = (node: FlowNode): number => {
    switch (node.type) {
      case 'decision': return 80;
      case 'tool': return 60;
      case 'input':
      case 'output': return 70;
      default: return 75;
    }
  };

  const getNodeHeight = (node: FlowNode): number => {
    return node.type === 'decision' ? 50 : 40;
  };

  const getNodeColor = (node: FlowNode): string => {
    if (node.type === 'decision') {
      return node.status === 'completed' ? '#a855f7' : '#c084fc';
    }
    
    switch (node.status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getNodeIcon = (node: FlowNode): string => {
    switch (node.type) {
      case 'input': return '📝';
      case 'output': return '💬';
      case 'decision': return '🔀';
      case 'tool': return '🔧';
      default: return '⚙️';
    }
  };

  return (
    <div className="process-flow-chart">
      <div className="flex">
        <div className="flex-1">
          <svg ref={svgRef}></svg>
          
          {/* Controls */}
          <div className="absolute top-4 left-4 bg-white rounded shadow-lg p-2 space-x-2">
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current!);
                svg.transition().duration(750).call(
                  d3.zoom<SVGSVGElement, unknown>().transform,
                  d3.zoomIdentity
                );
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              Reset Zoom
            </button>
            <button
              onClick={() => simulation?.restart()}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Restart
            </button>
          </div>
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-80 p-4 bg-gray-50 border-l">
            <h3 className="font-medium text-gray-900 mb-3">Node Details</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Label</div>
                <div className="text-sm text-gray-900">{selectedNode.label}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Type</div>
                <div className="text-sm text-gray-900 capitalize flex items-center gap-2">
                  <span>{getNodeIcon(selectedNode)}</span>
                  {selectedNode.type}
                </div>
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

              {selectedNode.data && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Process Data</div>
                  <div className="bg-white p-3 rounded border text-xs">
                    {selectedNode.data.details && (
                      <div className="mb-2">
                        <div className="font-medium text-gray-600">Details:</div>
                        <div className="text-gray-800">{selectedNode.data.details}</div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-500">
                      <span>Start: {selectedNode.data.startTime.toLocaleTimeString()}</span>
                      {selectedNode.data.endTime && (
                        <span>
                          Duration: {Math.round((selectedNode.data.endTime.getTime() - selectedNode.data.startTime.getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
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