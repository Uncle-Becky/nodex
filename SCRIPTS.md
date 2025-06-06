# Advanced Agent System - Project Scripts & Utilities

This document provides a comprehensive guide to all the custom scripts and utilities built specifically for the Advanced Agent Node System.

## 🚀 Development Scripts

### Core Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start development server with debug mode
npm run dev:debug

# Start with agent-specific configuration
npm run dev:agents
```

### Build & Deploy Commands

```bash
# Standard build with type checking
npm run build

# Production build with linting and optimization
npm run build:production

# Build with bundle analysis
npm run build:analyze

# Preview production build
npm run preview
```

## 🧪 Testing & Quality Assurance

### Agent Testing

```bash
# Run all agent behavior tests
npm run agents:test

# Run tests for specific agent type
npm run agents:test AgentBase
npm run agents:test ReasoningAgent
npm run agents:test SwarmAgent

# Run specific test
npm run agents:test ReasoningAgent deductiveReasoning

# List all available tests
npm run agents:test --list
```

### Demo Scenarios

```bash
# Run all demo scenarios
npm run agents:demo

# Run specific demo scenario
npm run agents:demo "Swarm Intelligence"
npm run agents:demo "Reasoning Chain"

# List available scenarios
npm run agents:demo --list
```

### Performance Benchmarking

```bash
# Run all performance benchmarks
npm run agents:benchmark

# Run specific benchmark
npm run agents:benchmark "Event Bus Throughput"
npm run agents:benchmark "Memory Efficiency"

# List available benchmarks
npm run agents:benchmark --list
```

## 🔧 Code Quality & Maintenance

### Linting & Formatting

```bash
# Check code quality (strict)
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Watch for changes and lint automatically
npm run lint:watch

# Format code with Prettier
npm run format

# Check if code is properly formatted
npm run format:check
```

### Type Checking

```bash
# Run TypeScript type checking
npm run typecheck

# Run type checking in watch mode
npm run typecheck:watch
```

## 🏥 System Monitoring & Health

### Health Checks

```bash
# Run comprehensive system health check
npm run system:health

# Monitor system performance (continuous)
npm run system:monitor
```

### Worker Management

```bash
# Test worker pool functionality
npm run workers:test
```

## 🛠️ Utility Scripts

### Environment Setup

```bash
# Full development environment setup
npm run setup:dev

# Clean build artifacts
npm run clean

# Full clean (including node_modules)
npm run clean:full

# Prepare for deployment
npm run deploy:prepare
```

### Documentation

```bash
# Generate system documentation
npm run docs:generate

# Analyze system architecture
npm run agents:analyze
```

## 📋 Script Details

### Demo Runner (`scripts/demo-runner.js`)

**Purpose**: Automates testing of various agent scenarios and configurations.

**Features**:

- Automated scenario execution
- Performance metrics collection
- Results reporting and storage
- Server management

**Available Scenarios**:

1. **Basic Agent Communication** - Tests event bus and agent interaction
2. **Swarm Intelligence** - Demonstrates collective behavior
3. **Reasoning Chain** - Tests all reasoning types
4. **Canvas Meta-Agent** - Tests orchestration capabilities
5. **Worker Pool Stress Test** - Tests worker management

### Agent Tester (`scripts/agent-tester.js`)

**Purpose**: Automated testing for individual agent behaviors and interactions.

**Test Categories**:

- **AgentBase**: initialization, eventHandling, memoryOperations
- **ReasoningAgent**: deductiveReasoning, inductiveReasoning, abductiveReasoning, episodicMemory
- **SwarmAgent**: particleSwarmOptimization, consensusAlgorithm, emergentBehavior, swarmIntelligence
- **CanvasMetaAgent**: orchestration, monitoring, optimization
- **WorkerPool**: workerCreation, taskDistribution, loadBalancing, errorHandling

### Performance Benchmark (`scripts/benchmark-agents.js`)

**Purpose**: Measures performance metrics and identifies optimization opportunities.

**Benchmarks**:

- **Event Bus Throughput**: events/second processing capability
- **Agent Creation Speed**: agent instantiation performance
- **Memory Efficiency**: memory usage per agent
- **Reasoning Performance**: reasoning operations per second
- **Swarm Convergence**: time to reach consensus
- **Worker Pool Efficiency**: task processing throughput

### Health Checker (`scripts/health-check.js`)

**Purpose**: Monitors system health and configuration status.

**Health Checks**:

- Project structure integrity
- Configuration files presence
- Agent component availability
- Worker script completeness
- Build system readiness
- Development tools availability

### Development Setup (`scripts/setup-development.js`)

**Purpose**: Configures development environment and validates setup.

**Setup Tasks**:

- Node.js version validation
- Dependency verification
- Configuration file checks
- Directory structure creation
- Environment file setup
- Development tools preparation

## 🎯 Usage Examples

### Quick Start Development Session

```bash
# 1. Setup development environment
npm run setup:dev

# 2. Check system health
npm run system:health

# 3. Start development server
npm run dev
```

### Testing & Quality Assurance Workflow

```bash
# 1. Run all agent tests
npm run agents:test

# 2. Run performance benchmarks
npm run agents:benchmark

# 3. Check code quality
npm run lint

# 4. Format code
npm run format

# 5. Type check
npm run typecheck
```

### Production Deployment Preparation

```bash
# 1. Run comprehensive tests
npm run agents:test
npm run agents:benchmark

# 2. Build for production
npm run build:production

# 3. Preview build
npm run preview

# 4. Prepare deployment
npm run deploy:prepare
```

## 📊 Output Files

Scripts generate various output files for analysis:

- `demo-results.json` - Demo scenario results
- `test-results.json` - Agent test results  
- `benchmark-results.json` - Performance benchmark data
- `scripts-info.json` - Available scripts reference
- `.env.example` - Environment configuration template

## 🔍 Troubleshooting

### Common Issues

1. **Script not found**: Ensure you're in the project root directory
2. **Permission denied**: On Unix systems, make scripts executable: `chmod +x scripts/*.js`
3. **Dependencies missing**: Run `npm install` to install required packages
4. **Health check failing**: Run `npm run setup:dev` for complete setup

### Debug Mode

Most scripts support additional logging. Set environment variables:

```bash
DEBUG=1 npm run agents:test
VERBOSE=1 npm run agents:benchmark
```

## 🚀 Extending the Scripts

### Adding New Test Cases

1. Edit `scripts/agent-tester.js`
2. Add test to appropriate `testSuites` object
3. Implement test logic in `executeTest` method

### Adding New Benchmarks

1. Edit `scripts/benchmark-agents.js`
2. Add benchmark to `benchmarks` array
3. Implement benchmark logic in `executeBenchmark` method

### Adding New Demo Scenarios

1. Edit `scripts/demo-runner.js`
2. Add scenario to `scenarios` array
3. Implement scenario logic in `executeScenario` method

---

**Note**: All scripts are designed to work with the Advanced Agent Node System architecture and provide comprehensive testing, monitoring, and development support for the sophisticated agent ecosystem.
