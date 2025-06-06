# 🧠 Neural Agent System

An advanced multi-agent AI platform built with React, TypeScript, and Vite. This system demonstrates sophisticated agent behaviors including reasoning, swarm intelligence, and collective decision-making through an interactive visual interface.

![Neural Agent System](https://img.shields.io/badge/React-19.0.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-blue)
![Vite](https://img.shields.io/badge/Vite-6.3.5-purple)

## ✨ Features

### 🤖 Agent Types

- **🧠 Reasoning Agents** - Advanced cognitive agents with episodic memory, semantic processing, and multi-modal reasoning (deductive, inductive, abductive)
- **🐝 Swarm Agents** - Collective intelligence using particle swarm optimization, consensus algorithms, and emergent behaviors
- **⚡ Worker Agents** - Task execution specialists with performance monitoring and lifecycle management
- **🎯 Canvas Meta-Agent** - System orchestrator that observes all events and coordinates agent interactions

### 🌟 Core Capabilities

- **Event Bus System** - Type-safe, extensible messaging with publish/subscribe patterns
- **Real-time Visualization** - Interactive React Flow interface with live agent metrics
- **Dynamic Connections** - Drag-and-drop agent networking with data flow visualization
- **Advanced Analytics** - Performance monitoring, network analysis, and swarm metrics
- **Worker Pool Management** - Dynamic scaling and automatic cleanup of web workers
- **Persistent Memory** - Agent state management with episodic and semantic memory systems

### 🎬 Demo Scenarios

- **Reasoning Demo** - Watch agents contemplate philosophical questions and share insights
- **Swarm Demo** - Observe collective optimization with 5 collaborative agents
- **Mixed Demo** - Experience multi-agent cooperation across different agent types
- **Data Edge Demo** - Real-time data visualization between connected agents

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/neural-agent-system.git
cd neural-agent-system

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 🎮 Usage Guide

### Basic Operations

1. **Create Agents** - Use the control panel buttons to spawn different agent types
2. **Connect Agents** - Drag from one agent to another to create communication channels
3. **Run Demos** - Click demo buttons to see pre-configured scenarios
4. **Monitor System** - Use the Analytics panel to view real-time metrics

### Demo Scenarios

#### 🧩 Reasoning Demo

```typescript
// Creates reasoning agents that contemplate existence
runReasoningDemo() // Spawns 2 reasoning agents
// Agents will process: "What is the meaning of existence?"
```

#### 🌊 Swarm Demo  

```typescript
// Creates 5 swarm agents for collective optimization
runSwarmDemo() // Spawns interconnected swarm network
// Agents optimize toward target coordinates using PSO
```

## 🏗️ Architecture

### Agent Base Classes

```typescript
// Core agent architecture
AgentBase -> ReasoningAgent
          -> SwarmAgent  
          -> CanvasMetaAgent
          -> WorkerAgent
```

### Event Bus System

```typescript
// Type-safe messaging
interface BusEvent {
  id: string;
  type: EventType;
  source: AgentId;
  target?: AgentId;
  payload: unknown;
  timestamp: number;
}
```

### Memory Systems

```typescript
// Episodic memory for reasoning agents
interface Memory {
  id: string;
  content: unknown;
  timestamp: number;
  importance: number;
  tags: string[];
  embedding?: number[];
}
```

## 🛠️ Development

### Project Structure

```
src/
├── agents/          # Agent implementations
├── components/      # React components
├── edges/          # Custom React Flow edges
├── managers/       # System management
├── nodes/          # Custom React Flow nodes
├── store/          # State management
├── types/          # TypeScript definitions
├── utils/          # Utility functions
└── workers/        # Web workers
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run typecheck    # Run TypeScript checks
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
```

### Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Visualization**: React Flow (@xyflow/react)
- **State Management**: Zustand
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 with custom components

## 🧪 Agent Behaviors

### Reasoning Agent Capabilities

- **Deductive Reasoning** - Logical conclusions from premises
- **Inductive Reasoning** - Pattern recognition and generalization  
- **Abductive Reasoning** - Best explanation inference
- **Episodic Memory** - Event storage and retrieval
- **Semantic Processing** - Context understanding

### Swarm Intelligence Features

- **Particle Swarm Optimization** - Collective optimization algorithms
- **Consensus Mechanisms** - Distributed decision making
- **Emergent Behaviors** - Self-organizing patterns
- **Convergence Analysis** - Solution quality metrics

## 📊 Performance Metrics

The system tracks comprehensive metrics:

- **Network Health** - Agent count, connections, message flow
- **Swarm Intelligence** - Convergence rates, diversity index, consensus
- **Individual Agents** - Response times, error rates, uptime
- **System Analytics** - Topology density, performance trends

## 🔧 Configuration

### Agent Parameters

```typescript
// Customize agent behavior
const agentConfig = {
  reasoning: {
    confidenceThreshold: 0.7,
    memoryLimit: 1000,
    reasoningMethods: ['deductive', 'inductive', 'abductive']
  },
  swarm: {
    swarmSize: 5,
    convergenceThreshold: 0.95,
    optimizationTarget: { x: 50, y: 50 }
  }
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React Flow team for the excellent visualization library
- Tailwind CSS for the utility-first CSS framework
- The AI research community for inspiration on multi-agent systems

## 🔮 Future Enhancements

- [ ] Machine Learning integration for adaptive behaviors
- [ ] Distributed agent deployment across multiple nodes
- [ ] Advanced reasoning with LLM integration
- [ ] Real-time collaboration features
- [ ] Agent marketplace and plugin system

---

**Built with ❤️ and advanced AI concepts**
