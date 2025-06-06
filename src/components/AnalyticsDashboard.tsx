import React, { useEffect, useState } from 'react';
import type {
  AgentInfo,
  NetworkMetrics,
  SwarmMetrics,
} from '../managers/AgentManager';
import type { BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';

export const AnalyticsDashboard: React.FC = () => {
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>({
    totalAgents: 0,
    activeConnections: 0,
    messageFlow: 0,
    averageLatency: 0,
    topologyDensity: 0,
  });

  const [swarmMetrics, setSwarmMetrics] = useState<SwarmMetrics>({
    swarmSize: 0,
    convergenceRate: 0,
    diversityIndex: 0,
    consensusCount: 0,
    averageFitness: 0,
  });

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [recentEvents, setRecentEvents] = useState<BusEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('SYSTEM_EVENT', (event) => {
      const payload = event.payload as any;

      if (payload.action === 'analytics_update') {
        setNetworkMetrics(payload.networkMetrics);
        setSwarmMetrics(payload.swarmMetrics);
        setRecentEvents(payload.messageHistory || []);
      }
    });

    return unsubscribe;
  }, []);

  const getHealthColor = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return 'text-green-500';
    if (value >= thresholds[0]) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatNumber = (num: number, decimals = 2) => {
    return Number(num.toFixed(decimals)).toString();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        📊 Analytics
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto z-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            System Analytics
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Network Metrics */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b pb-1">
            Network Health
          </h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Total Agents</div>
              <div className="text-lg font-semibold">
                {networkMetrics.totalAgents}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Active Connections</div>
              <div className="text-lg font-semibold">
                {networkMetrics.activeConnections}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Message Flow</div>
              <div
                className={`text-lg font-semibold ${getHealthColor(networkMetrics.messageFlow, [1, 5])}`}
              >
                {formatNumber(networkMetrics.messageFlow)}/s
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Avg Latency</div>
              <div
                className={`text-lg font-semibold ${getHealthColor(50 - networkMetrics.averageLatency, [25, 40])}`}
              >
                {formatNumber(networkMetrics.averageLatency)}ms
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <div className="text-gray-600 mb-2">Topology Density</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, networkMetrics.topologyDensity * 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(networkMetrics.topologyDensity * 100)}%
            </div>
          </div>
        </div>

        {/* Swarm Intelligence Metrics */}
        {swarmMetrics.swarmSize > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 border-b pb-1">
              Swarm Intelligence
            </h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-green-50 p-3 rounded">
                <div className="text-gray-600">Swarm Size</div>
                <div className="text-lg font-semibold text-green-700">
                  {swarmMetrics.swarmSize}
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded">
                <div className="text-gray-600">Avg Fitness</div>
                <div className="text-lg font-semibold text-green-700">
                  {formatNumber(swarmMetrics.averageFitness)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-green-50 p-3 rounded">
                <div className="text-gray-600 mb-2">Convergence Rate</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, swarmMetrics.convergenceRate * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatNumber(swarmMetrics.convergenceRate * 100)}%
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded">
                <div className="text-gray-600 mb-2">Diversity Index</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, swarmMetrics.diversityIndex * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatNumber(swarmMetrics.diversityIndex * 100)}%
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded">
              <div className="text-gray-600">Consensus Events</div>
              <div className="text-lg font-semibold text-green-700">
                {swarmMetrics.consensusCount}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b pb-1">
            Recent Activity
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentEvents
              .slice(-10)
              .reverse()
              .map((event, i) => (
                <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-700">
                      {event.type}
                    </span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-600 mt-1">
                    From: {event.source} {event.target && `→ ${event.target}`}
                  </div>
                  {typeof event.payload === 'object' &&
                    event.payload !== null && (
                      <div className="text-gray-500 mt-1 truncate">
                        {JSON.stringify(event.payload).slice(0, 50)}...
                      </div>
                    )}
                </div>
              ))}

            {recentEvents.length === 0 && (
              <div className="text-gray-500 text-center py-4">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b pb-1">
            System Status
          </h4>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>Event Bus</span>
              <span className="text-green-500">🟢 Active</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>Worker Pool</span>
              <span className="text-green-500">🟢 Running</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>Canvas Agent</span>
              <span className="text-green-500">🟢 Observing</span>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b pb-1">Insights</h4>

          <div className="text-xs space-y-2">
            {networkMetrics.messageFlow > 10 && (
              <div className="bg-yellow-50 p-2 rounded text-yellow-800">
                ⚠️ High message throughput detected
              </div>
            )}

            {networkMetrics.averageLatency > 100 && (
              <div className="bg-red-50 p-2 rounded text-red-800">
                🐌 High latency detected
              </div>
            )}

            {swarmMetrics.convergenceRate > 0.8 &&
              swarmMetrics.swarmSize > 3 && (
                <div className="bg-green-50 p-2 rounded text-green-800">
                  ✨ Swarm showing high convergence
                </div>
              )}

            {networkMetrics.totalAgents === 0 && (
              <div className="bg-blue-50 p-2 rounded text-blue-800">
                💡 Add some agents to see the system in action
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
