import type { AgentManager } from '../managers/AgentManager';
import { eventBus } from './eventBus';

export class DemoScenarios {
  private agentManager: AgentManager;

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
  }

  /**
   * Demonstrates sophisticated reasoning with logical problems
   */
  async runAdvancedReasoningDemo(): Promise<void> {
    console.log('🧠 Starting Advanced Reasoning Demo...');

    // Create a network of reasoning agents
    const reasoningIds = await Promise.all([
      this.agentManager.createAgent('reasoning'),
      this.agentManager.createAgent('reasoning'),
      this.agentManager.createAgent('reasoning'),
    ]);

    // Complex logical scenarios
    const scenarios = [
      {
        target: reasoningIds[0],
        problem:
          "In a town with exactly 1000 people, where every person either always tells the truth or always lies, you meet someone who says 'I am a liar.' Analyze this paradox using logical reasoning.",
      },
      {
        target: reasoningIds[1],
        problem:
          'Given: All brilliant minds solve complex problems. Some scientists are brilliant minds. Therefore, what can we conclude about scientists and problem-solving capabilities?',
      },
      {
        target: reasoningIds[2],
        problem:
          'A farmer has 17 sheep, and all but 9 die. How many are left? Explain the reasoning process and common cognitive biases in this problem.',
      },
    ];

    // Send problems with delays
    scenarios.forEach((scenario, index) => {
      setTimeout(() => {
        eventBus.publish({
          id: `reasoning-scenario-${index}-${Date.now()}`,
          type: 'AGENT_MESSAGE',
          timestamp: Date.now(),
          source: 'demo',
          target: scenario.target,
          payload: {
            message: scenario.problem,
            context: 'logical_reasoning_challenge',
            priority: 'high',
          },
        });
      }, index * 2000);
    });

    // Trigger cross-agent discussion
    setTimeout(() => {
      eventBus.publish({
        id: `cross-reasoning-${Date.now()}`,
        type: 'SYSTEM_EVENT',
        timestamp: Date.now(),
        source: 'demo',
        payload: {
          action: 'initiate_discussion',
          participants: reasoningIds,
          topic: 'Compare and contrast your reasoning approaches',
        },
      });
    }, 8000);
  }

  /**
   * Demonstrates advanced swarm intelligence with complex optimization
   */
  async runAdvancedSwarmDemo(): Promise<void> {
    console.log('🐝 Starting Advanced Swarm Demo...');

    // Create a larger swarm with different configurations
    const swarmIds = await Promise.all([
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
    ]);

    // Complex multi-objective optimization
    const objectives = [
      {
        name: 'resource_gathering',
        targets: [
          { x: 25, y: 25, value: 100 },
          { x: 75, y: 25, value: 80 },
          { x: 50, y: 75, value: 120 },
        ],
      },
      {
        name: 'formation_maintenance',
        centerPoint: { x: 50, y: 50 },
        radius: 30,
      },
      {
        name: 'threat_avoidance',
        threats: [
          { x: 30, y: 60, radius: 15 },
          { x: 70, y: 40, radius: 12 },
        ],
      },
    ];

    // Initialize swarm with complex behaviors
    setTimeout(() => {
      swarmIds.forEach((id, index) => {
        this.agentManager.sendCanvasCommand(id, 'set_behavior_mode', [
          'multi_objective',
        ]);

        setTimeout(() => {
          this.agentManager.sendCanvasCommand(id, 'add_objective', [
            objectives[index % objectives.length],
          ]);
        }, index * 500);
      });
    }, 1000);

    // Trigger consensus formation
    setTimeout(() => {
      eventBus.publish({
        id: `swarm-consensus-${Date.now()}`,
        type: 'SYSTEM_EVENT',
        timestamp: Date.now(),
        source: 'demo',
        payload: {
          action: 'initiate_consensus',
          swarmIds,
          proposal: 'optimal_formation_strategy',
        },
      });
    }, 5000);

    // Dynamic environment changes
    setTimeout(() => {
      swarmIds.forEach(id => {
        this.agentManager.sendCanvasCommand(id, 'environmental_change', [
          {
            type: 'resource_depletion',
            location: { x: 75, y: 25 },
            severity: 0.7,
          },
        ]);
      });
    }, 10000);
  }

  /**
   * Demonstrates emergent behaviors and inter-agent learning
   */
  async runEmergentBehaviorDemo(): Promise<void> {
    console.log('🌟 Starting Emergent Behavior Demo...');

    // Mixed agent types for complex interactions
    const mixedIds = await Promise.all([
      this.agentManager.createAgent('reasoning'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('reasoning'),
      this.agentManager.createAgent('swarm'),
      this.agentManager.createAgent('swarm'),
    ]);

    // Create a problem-solving scenario
    const problem = {
      id: 'collaborative_optimization',
      description:
        'Find the optimal path through a complex maze while avoiding dynamic obstacles',
      parameters: {
        mazeSize: { width: 100, height: 100 },
        obstacles: [
          { x: 30, y: 30, size: 10, isMoving: true },
          { x: 70, y: 70, size: 8, isMoving: false },
          { x: 50, y: 20, size: 12, isMoving: true },
        ],
        goal: { x: 90, y: 90 },
        startPoints: [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 10, y: 20 },
        ],
      },
    };

    // Assign roles to different agent types
    setTimeout(() => {
      // Reasoning agents analyze the problem
      mixedIds
        .filter((_, i) => i % 2 === 0)
        .forEach(id => {
          eventBus.publish({
            id: `problem-analysis-${id}-${Date.now()}`,
            type: 'AGENT_MESSAGE',
            timestamp: Date.now(),
            source: 'demo',
            target: id,
            payload: {
              message:
                'Analyze the maze problem and suggest optimal strategies',
              problem,
              role: 'strategist',
            },
          });
        });

      // Swarm agents execute exploration
      mixedIds
        .filter((_, i) => i % 2 === 1)
        .forEach(id => {
          this.agentManager.sendCanvasCommand(id, 'explore_maze', [
            {
              maze: problem.parameters,
              startPoint:
                problem.parameters.startPoints[
                  Math.floor(
                    Math.random() * problem.parameters.startPoints.length
                  )
                ],
              role: 'explorer',
            },
          ]);
        });
    }, 2000);

    // Cross-pollination of ideas
    setTimeout(() => {
      eventBus.publish({
        id: `cross-pollination-${Date.now()}`,
        type: 'SYSTEM_EVENT',
        timestamp: Date.now(),
        source: 'demo',
        payload: {
          action: 'knowledge_sharing',
          participants: mixedIds,
          context: 'maze_solving_collaboration',
        },
      });
    }, 6000);

    // Adaptive learning trigger
    setTimeout(() => {
      mixedIds.forEach(id => {
        eventBus.publish({
          id: `adaptive-learning-${id}-${Date.now()}`,
          type: 'CANVAS_COMMAND',
          timestamp: Date.now(),
          source: 'canvas',
          target: id,
          payload: {
            command: 'adapt_strategy',
            feedback:
              'Previous approach showed 67% efficiency, adjust parameters',
            reinforcement: 'positive',
          },
        });
      });
    }, 10000);
  }

  /**
   * Stress test the system with high message throughput and complex behaviors
   */
  async runStressTestDemo(): Promise<void> {
    console.log('⚡ Starting System Stress Test...');

    // Create a large network
    const agentIds = await Promise.all([
      ...Array(5)
        .fill(null)
        .map(() => this.agentManager.createAgent('reasoning')),
      ...Array(8)
        .fill(null)
        .map(() => this.agentManager.createAgent('swarm')),
    ]);

    // High-frequency message generation
    const messageInterval = setInterval(() => {
      const sourceId = agentIds[Math.floor(Math.random() * agentIds.length)];
      const targetId = agentIds[Math.floor(Math.random() * agentIds.length)];

      if (sourceId && targetId && sourceId !== targetId) {
        eventBus.publish({
          id: `stress-message-${Date.now()}-${Math.random()}`,
          type: 'AGENT_MESSAGE',
          timestamp: Date.now(),
          source: sourceId,
          target: targetId,
          payload: {
            message: `Stress test message from ${sourceId}`,
            data: Array(100)
              .fill(0)
              .map(() => Math.random()),
            priority: Math.random() > 0.5 ? 'high' : 'normal',
          },
        });
      }
    }, 100);

    // Stop stress test after 30 seconds
    setTimeout(() => {
      clearInterval(messageInterval);
      console.log('⚡ Stress test completed');
    }, 30000);

    // Monitor system performance
    setTimeout(() => {
      eventBus.publish({
        id: `performance-check-${Date.now()}`,
        type: 'SYSTEM_EVENT',
        timestamp: Date.now(),
        source: 'demo',
        payload: {
          action: 'performance_analysis',
          agentCount: agentIds.length,
          testDuration: 30000,
        },
      });
    }, 31000);
  }

  /**
   * Comprehensive showcase of all system capabilities
   */
  async runMasterDemo(): Promise<void> {
    console.log('🎭 Starting Master Demonstration...');

    // Run all demos in sequence with proper spacing
    await this.runAdvancedReasoningDemo();

    setTimeout(async () => {
      await this.runAdvancedSwarmDemo();
    }, 5000);

    setTimeout(async () => {
      await this.runEmergentBehaviorDemo();
    }, 15000);

    setTimeout(async () => {
      await this.runStressTestDemo();
    }, 30000);

    // Final system summary
    setTimeout(() => {
      eventBus.publish({
        id: `master-demo-complete-${Date.now()}`,
        type: 'SYSTEM_EVENT',
        timestamp: Date.now(),
        source: 'demo',
        payload: {
          action: 'demo_complete',
          message:
            'Master demonstration showcasing advanced multi-agent system capabilities completed',
          achievements: [
            'Advanced reasoning with logical problems',
            'Sophisticated swarm intelligence optimization',
            'Emergent behaviors and inter-agent learning',
            'System stress testing and performance analysis',
          ],
        },
      });
    }, 65000);
  }
}
