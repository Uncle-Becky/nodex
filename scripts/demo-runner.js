#!/usr/bin/env node

/**
 * Advanced Agent System Demo Runner
 * Automates testing of various agent scenarios and configurations
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class DemoRunner {
  constructor() {
    this.scenarios = [
      {
        name: 'Basic Agent Communication',
        description: 'Tests basic event bus and agent interaction',
        config: { agentCount: 3, duration: 30000 },
        url: '/demo/basic-communication',
      },
      {
        name: 'Swarm Intelligence',
        description: 'Demonstrates swarm optimization and collective behavior',
        config: { agentCount: 10, swarmSize: 5, duration: 45000 },
        url: '/demo/swarm-intelligence',
      },
      {
        name: 'Reasoning Chain',
        description: 'Tests deductive, inductive, and abductive reasoning',
        config: { reasoningDepth: 5, duration: 60000 },
        url: '/demo/reasoning-chain',
      },
      {
        name: 'Canvas Meta-Agent',
        description: 'Tests meta-agent orchestration and monitoring',
        config: { metaAgentEnabled: true, duration: 40000 },
        url: '/demo/meta-agent',
      },
      {
        name: 'Worker Pool Stress Test',
        description: 'Stress tests worker pool management',
        config: { workerCount: 8, taskLoad: 'high', duration: 30000 },
        url: '/demo/worker-stress',
      },
    ];

    this.results = {};
  }

  async runScenario(scenario) {
    console.log(`\n🚀 Running: ${scenario.name}`);
    console.log(`📋 Description: ${scenario.description}`);
    console.log(`⚙️  Config:`, JSON.stringify(scenario.config, null, 2));

    const startTime = Date.now();

    try {
      // Start development server if not running
      const serverProcess = await this.ensureDevServer();

      // Wait for server to be ready
      await this.waitForServer();

      // Run the scenario
      const result = await this.executeScenario(scenario);

      const duration = Date.now() - startTime;

      this.results[scenario.name] = {
        success: true,
        duration,
        result,
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results[scenario.name] = {
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      console.log(`❌ Failed after ${duration}ms: ${error.message}`);
    }
  }

  async executeScenario(scenario) {
    // Simulate scenario execution
    // In a real implementation, this would interact with the actual demo system
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          agentsCreated: scenario.config.agentCount || 1,
          eventsProcessed: Math.floor(Math.random() * 1000) + 100,
          performanceScore: Math.floor(Math.random() * 100) + 1,
        });
      }, scenario.config.duration / 10); // Simulate faster for demo
    });
  }

  async ensureDevServer() {
    // Check if dev server is already running
    try {
      const response = await fetch('http://localhost:3000');
      console.log('📡 Development server is already running');
      return null;
    } catch {
      console.log('🔧 Starting development server...');
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: true,
      });

      return serverProcess;
    }
  }

  async waitForServer(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fetch('http://localhost:3000');
        console.log('✅ Server is ready');
        return;
      } catch {
        console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Server failed to start within timeout');
  }

  async runAllScenarios() {
    console.log('🎯 Advanced Agent System Demo Runner');
    console.log('=====================================');

    for (const scenario of this.scenarios) {
      await this.runScenario(scenario);
    }

    this.generateReport();
  }

  async runSpecificScenario(scenarioName) {
    const scenario = this.scenarios.find(s =>
      s.name.toLowerCase().includes(scenarioName.toLowerCase())
    );

    if (!scenario) {
      console.log(`❌ Scenario not found: ${scenarioName}`);
      console.log('📋 Available scenarios:');
      this.scenarios.forEach(s => console.log(`  - ${s.name}`));
      return;
    }

    await this.runScenario(scenario);
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Demo Results Summary');
    console.log('========================');

    const successful = Object.values(this.results).filter(
      r => r.success
    ).length;
    const total = Object.keys(this.results).length;

    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(
      `⏱️  Total Duration: ${Object.values(this.results).reduce((sum, r) => sum + r.duration, 0)}ms`
    );

    Object.entries(this.results).forEach(([name, result]) => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${name}: ${duration}`);

      if (result.success && result.result) {
        console.log(`   - Agents: ${result.result.agentsCreated}`);
        console.log(`   - Events: ${result.result.eventsProcessed}`);
        console.log(`   - Score: ${result.result.performanceScore}`);
      } else if (!result.success) {
        console.log(`   - Error: ${result.error}`);
      }
    });

    // Save results to file
    const resultsFile = join(projectRoot, 'demo-results.json');
    writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: demo-results.json`);
  }
}

// CLI interface
const args = process.argv.slice(2);
const runner = new DemoRunner();

if (args.length === 0) {
  runner.runAllScenarios().catch(console.error);
} else if (args[0] === '--list') {
  console.log('📋 Available Demo Scenarios:');
  runner.scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   ${scenario.description}`);
  });
} else {
  runner.runSpecificScenario(args.join(' ')).catch(console.error);
}
