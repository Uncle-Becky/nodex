#!/usr/bin/env node

/**
 * Development Environment Setup
 * Configures environment, checks dependencies, and prepares the system
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class DevelopmentSetup {
  constructor() {
    this.checks = [
      { name: 'Node.js Version', check: this.checkNodeVersion.bind(this) },
      {
        name: 'Package Dependencies',
        check: this.checkDependencies.bind(this),
      },
      {
        name: 'TypeScript Configuration',
        check: this.checkTypeScript.bind(this),
      },
      { name: 'ESLint Configuration', check: this.checkESLint.bind(this) },
      { name: 'Vite Configuration', check: this.checkVite.bind(this) },
      { name: 'Worker Scripts', check: this.checkWorkers.bind(this) },
      { name: 'Environment Files', check: this.checkEnvironment.bind(this) },
      {
        name: 'Development Directories',
        check: this.checkDirectories.bind(this),
      },
    ];

    this.results = {};
  }

  async runSetup() {
    console.log('🚀 Advanced Agent System - Development Setup');
    console.log('=============================================');

    for (const check of this.checks) {
      await this.runCheck(check);
    }

    this.generateReport();
    await this.performSetupActions();
  }

  async runCheck(check) {
    process.stdout.write(`🔍 Checking ${check.name}... `);

    try {
      const result = await check.check();
      this.results[check.name] = {
        success: true,
        result,
        timestamp: new Date().toISOString(),
      };

      const status =
        result.status === 'ok'
          ? '✅'
          : result.status === 'warning'
            ? '⚠️'
            : '❌';
      process.stdout.write(`${status} ${result.message}\n`);
    } catch (error) {
      this.results[check.name] = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      process.stdout.write(`❌ ${error.message}\n`);
    }
  }

  async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);

    if (major >= 18) {
      return { status: 'ok', message: `Node.js ${version} (Compatible)` };
    } else if (major >= 16) {
      return {
        status: 'warning',
        message: `Node.js ${version} (Upgrade recommended)`,
      };
    } else {
      throw new Error(`Node.js ${version} is too old. Requires >= 16.0.0`);
    }
  }

  async checkDependencies() {
    const packageJsonPath = join(projectRoot, 'package.json');
    const nodeModulesPath = join(projectRoot, 'node_modules');

    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    if (!existsSync(nodeModulesPath)) {
      return {
        status: 'error',
        message: 'Dependencies not installed. Run npm install.',
      };
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

    return {
      status: 'ok',
      message: `${depCount + devDepCount} packages installed`,
      details: { dependencies: depCount, devDependencies: devDepCount },
    };
  }

  async checkTypeScript() {
    const tsconfigPath = join(projectRoot, 'tsconfig.json');
    const tsconfigNodePath = join(projectRoot, 'tsconfig.node.json');

    if (!existsSync(tsconfigPath)) {
      throw new Error('tsconfig.json not found');
    }

    if (!existsSync(tsconfigNodePath)) {
      return { status: 'warning', message: 'tsconfig.node.json missing' };
    }

    return { status: 'ok', message: 'TypeScript configuration complete' };
  }

  async checkESLint() {
    const eslintConfigPath = join(projectRoot, 'eslint.config.js');
    const prettierConfigPath = join(projectRoot, '.prettierrc.json');

    if (!existsSync(eslintConfigPath)) {
      throw new Error('eslint.config.js not found');
    }

    if (!existsSync(prettierConfigPath)) {
      return { status: 'warning', message: 'Prettier configuration missing' };
    }

    return { status: 'ok', message: 'Code quality tools configured' };
  }

  async checkVite() {
    const viteConfigPath = join(projectRoot, 'vite.config.ts');

    if (!existsSync(viteConfigPath)) {
      throw new Error('vite.config.ts not found');
    }

    return { status: 'ok', message: 'Vite build configuration found' };
  }

  async checkWorkers() {
    const workerDir = join(projectRoot, 'src', 'workers');
    const requiredWorkers = [
      'agentWorker.ts',
      'reasoningWorker.ts',
      'swarmWorker.ts',
      'WorkerPool.ts',
    ];

    if (!existsSync(workerDir)) {
      throw new Error('Workers directory not found');
    }

    const missingWorkers = requiredWorkers.filter(
      worker => !existsSync(join(workerDir, worker))
    );

    if (missingWorkers.length > 0) {
      return {
        status: 'warning',
        message: `Missing workers: ${missingWorkers.join(', ')}`,
      };
    }

    return { status: 'ok', message: 'All worker scripts present' };
  }

  async checkEnvironment() {
    const envExamplePath = join(projectRoot, '.env.example');
    const envPath = join(projectRoot, '.env');

    // Create .env.example if it doesn't exist
    if (!existsSync(envExamplePath)) {
      const envExample = `# Advanced Agent System Environment Variables
# Development settings
NODE_ENV=development
VITE_DEV_MODE=true
VITE_AGENT_DEBUG=false

# Performance settings
VITE_MAX_AGENTS=100
VITE_WORKER_POOL_SIZE=8
VITE_EVENT_BUS_BUFFER_SIZE=1000

# Monitoring settings
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=info

# Feature flags
VITE_ENABLE_SWARM_INTELLIGENCE=true
VITE_ENABLE_REASONING_AGENTS=true
VITE_ENABLE_META_AGENTS=true
`;
      writeFileSync(envExamplePath, envExample);
    }

    if (!existsSync(envPath)) {
      return {
        status: 'warning',
        message: '.env file missing. Copy from .env.example',
      };
    }

    return { status: 'ok', message: 'Environment configuration ready' };
  }

  async checkDirectories() {
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
      'scripts',
    ];

    const missingDirs = requiredDirs.filter(
      dir => !existsSync(join(projectRoot, dir))
    );

    if (missingDirs.length > 0) {
      return {
        status: 'warning',
        message: `Missing directories: ${missingDirs.join(', ')}`,
      };
    }

    return { status: 'ok', message: 'All required directories present' };
  }

  generateReport() {
    console.log('\n📊 Setup Status Report');
    console.log('======================');

    const successful = Object.values(this.results).filter(
      r => r.success
    ).length;
    const total = Object.keys(this.results).length;

    console.log(`✅ Successful checks: ${successful}/${total}`);

    const warnings = Object.entries(this.results)
      .filter(
        ([_, result]) => result.success && result.result?.status === 'warning'
      )
      .map(([name, _]) => name);

    const errors = Object.entries(this.results)
      .filter(
        ([_, result]) => !result.success || result.result?.status === 'error'
      )
      .map(([name, _]) => name);

    if (warnings.length > 0) {
      console.log(`⚠️  Warnings: ${warnings.length}`);
      warnings.forEach(name => console.log(`   - ${name}`));
    }

    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach(name => console.log(`   - ${name}`));
    }

    if (warnings.length === 0 && errors.length === 0) {
      console.log('🎉 Development environment is fully configured!');
    }
  }

  async performSetupActions() {
    console.log('\n🔧 Performing Setup Actions');
    console.log('============================');

    // Create missing directories
    const requiredDirs = [
      'logs',
      'temp',
      'docs/generated',
      'benchmark-results',
      'test-results',
    ];

    for (const dir of requiredDirs) {
      const dirPath = join(projectRoot, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }

    // Create .env from .env.example if needed
    const envPath = join(projectRoot, '.env');
    const envExamplePath = join(projectRoot, '.env.example');

    if (!existsSync(envPath) && existsSync(envExamplePath)) {
      const envContent = readFileSync(envExamplePath, 'utf8');
      writeFileSync(envPath, envContent);
      console.log('📄 Created .env from .env.example');
    }

    // Create development scripts info file
    const scriptsInfo = {
      development: {
        'npm run dev': 'Start development server with hot reload',
        'npm run dev:debug': 'Start development server with debug mode',
        'npm run dev:agents': 'Start with agent-specific configuration',
      },
      testing: {
        'npm run agents:test': 'Run agent behavior tests',
        'npm run agents:demo': 'Run demo scenarios',
        'npm run agents:benchmark': 'Run performance benchmarks',
      },
      building: {
        'npm run build': 'Build for production',
        'npm run build:analyze': 'Build with bundle analysis',
        'npm run preview': 'Preview production build',
      },
      quality: {
        'npm run lint': 'Check code quality',
        'npm run lint:fix': 'Fix auto-fixable issues',
        'npm run format': 'Format code with Prettier',
      },
      system: {
        'npm run system:health': 'Check system health',
        'npm run system:monitor': 'Monitor system performance',
      },
    };

    writeFileSync(
      join(projectRoot, 'scripts-info.json'),
      JSON.stringify(scriptsInfo, null, 2)
    );

    console.log('📋 Created scripts reference guide');
    console.log('\n✨ Setup complete! You can now start development with:');
    console.log('   npm run dev');
  }
}

// CLI interface
const setup = new DevelopmentSetup();
setup.runSetup().catch(console.error);
