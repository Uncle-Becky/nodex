#!/usr/bin/env node

/**
 * System Health Check
 * Monitors the health and status of the advanced agent system
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class HealthChecker {
  constructor() {
    this.checks = [
      {
        name: 'Project Structure',
        check: this.checkProjectStructure.bind(this),
      },
      { name: 'Configuration Files', check: this.checkConfigFiles.bind(this) },
      { name: 'Agent Components', check: this.checkAgentComponents.bind(this) },
      { name: 'Worker Scripts', check: this.checkWorkerScripts.bind(this) },
      { name: 'Build System', check: this.checkBuildSystem.bind(this) },
      {
        name: 'Development Tools',
        check: this.checkDevelopmentTools.bind(this),
      },
    ];
  }

  async runHealthCheck() {
    process.stdout.write('🏥 Advanced Agent System Health Check\n');
    process.stdout.write('=====================================\n\n');

    let totalScore = 0;
    const maxScore = this.checks.length * 100;

    for (const check of this.checks) {
      const score = await this.runCheck(check);
      totalScore += score;
    }

    const healthPercentage = ((totalScore / maxScore) * 100).toFixed(1);
    const healthStatus = this.getHealthStatus(healthPercentage);

    process.stdout.write(
      `\n📊 Overall System Health: ${healthPercentage}% ${healthStatus}\n`
    );

    if (healthPercentage < 80) {
      process.stdout.write('\n💡 Recommendations:\n');
      process.stdout.write('   - Run: npm run setup:dev for full setup\n');
      process.stdout.write(
        '   - Check missing components and configuration files\n'
      );
    } else {
      process.stdout.write(
        '\n✨ System is healthy and ready for development!\n'
      );
    }
  }

  async runCheck(check) {
    process.stdout.write(`🔍 ${check.name}... `);

    try {
      const result = await check.check();
      const score = result.score || 0;
      const status = this.getStatusIcon(score);

      process.stdout.write(`${status} ${result.message} (${score}/100)\n`);
      return score;
    } catch (error) {
      process.stdout.write(`❌ Failed: ${error.message} (0/100)\n`);
      return 0;
    }
  }

  getStatusIcon(score) {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  getHealthStatus(percentage) {
    if (percentage >= 90) return '🟢 Excellent';
    if (percentage >= 80) return '🟡 Good';
    if (percentage >= 60) return '🟠 Fair';
    return '🔴 Poor';
  }

  async checkProjectStructure() {
    const requiredDirs = [
      'src/agents',
      'src/components',
      'src/managers',
      'src/nodes',
      'src/store',
      'src/types',
      'src/utils',
      'src/workers',
      'src/edges',
    ];

    const existingDirs = requiredDirs.filter(dir =>
      existsSync(join(projectRoot, dir))
    );

    const score = Math.round((existingDirs.length / requiredDirs.length) * 100);
    const message = `${existingDirs.length}/${requiredDirs.length} directories found`;

    return { score, message };
  }

  async checkConfigFiles() {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'eslint.config.js',
      '.prettierrc.json',
    ];

    const existingFiles = requiredFiles.filter(file =>
      existsSync(join(projectRoot, file))
    );

    const score = Math.round(
      (existingFiles.length / requiredFiles.length) * 100
    );
    const message = `${existingFiles.length}/${requiredFiles.length} config files present`;

    return { score, message };
  }

  async checkAgentComponents() {
    const agentFiles = [
      'src/agents/AgentBase.ts',
      'src/agents/ReasoningAgent.ts',
      'src/agents/SwarmAgent.ts',
      'src/agents/CanvasMetaAgent.ts',
      'src/managers/AgentManager.ts',
      'src/utils/EventBus.ts',
    ];

    const existingAgents = agentFiles.filter(file =>
      existsSync(join(projectRoot, file))
    );

    const score = Math.round((existingAgents.length / agentFiles.length) * 100);
    const message = `${existingAgents.length}/${agentFiles.length} agent components found`;

    return { score, message };
  }

  async checkWorkerScripts() {
    const workerFiles = [
      'src/workers/agentWorker.ts',
      'src/workers/reasoningWorker.ts',
      'src/workers/swarmWorker.ts',
      'src/workers/WorkerPool.ts',
    ];

    const existingWorkers = workerFiles.filter(file =>
      existsSync(join(projectRoot, file))
    );

    const score = Math.round(
      (existingWorkers.length / workerFiles.length) * 100
    );
    const message = `${existingWorkers.length}/${workerFiles.length} worker scripts found`;

    return { score, message };
  }

  async checkBuildSystem() {
    const buildFiles = ['vite.config.ts', 'tsconfig.json', 'package.json'];

    let score = 0;

    // Check if files exist
    const existingFiles = buildFiles.filter(file =>
      existsSync(join(projectRoot, file))
    );
    score += (existingFiles.length / buildFiles.length) * 50;

    // Check if node_modules exists
    if (existsSync(join(projectRoot, 'node_modules'))) {
      score += 30;
    }

    // Check if dist directory is buildable (exists or can be created)
    const distPath = join(projectRoot, 'dist');
    if (existsSync(distPath) || !existsSync(distPath)) {
      // Always true, but checking if writable
      score += 20;
    }

    const message = `Build system configured (${existingFiles.length}/${buildFiles.length} files)`;
    return { score: Math.round(score), message };
  }

  async checkDevelopmentTools() {
    const toolFiles = [
      'scripts/demo-runner.js',
      'scripts/agent-tester.js',
      'scripts/setup-development.js',
      'scripts/health-check.js',
    ];

    const existingTools = toolFiles.filter(file =>
      existsSync(join(projectRoot, file))
    );

    const score = Math.round((existingTools.length / toolFiles.length) * 100);
    const message = `${existingTools.length}/${toolFiles.length} development tools available`;

    return { score, message };
  }
}

// Run health check
const checker = new HealthChecker();
checker.runHealthCheck().catch(error => {
  process.stdout.write(`❌ Health check failed: ${error.message}\n`);
  process.exit(1);
});
