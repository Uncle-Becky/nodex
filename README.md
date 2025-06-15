# NodeX - Advanced Multi-Agent System with React Flow

NodeX is a powerful, type-safe multi-agent system built with React Flow, enabling complex AI workflows, automated reasoning, and intelligent data processing through a visual interface.

## 🌟 Features

### Core Capabilities

- **Multi-Agent System**: Worker, Canvas Meta, Reasoning, and Swarm agents
- **Visual Flow Editor**: Intuitive React Flow-based interface
- **LLM Integration**: Support for OpenAI, Claude, Gemini, and Perplexity
- **Secure Code Execution**: XOR-based security with sandboxed environment
- **Advanced Analytics**: Real-time monitoring and execution history

### Node Types

- **LLM Nodes**: Chat and completion capabilities
- **Processing Nodes**: Code execution, data processing, file operations
- **Integration Nodes**: API connectors, web scrapers, search engines

### Security & Performance

- Type-safe message passing
- Rate limiting and resource management
- API key encryption
- Worker pool optimization
- Event-driven architecture

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for desired LLM providers

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nodex.git

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Configuration

1. Set up your API keys in the settings panel
2. Configure your preferred LLM providers
3. Customize node templates as needed

## 📚 Documentation

Detailed documentation is available in the `docs` directory:

- [System Architecture](docs/architecture.md)
- [Agent System](docs/agents.md)
- [Node Types](docs/nodes.md)
- [Security](docs/security.md)
- [API Reference](docs/api.md)
- [Best Practices](docs/best-practices.md)

## 🛠️ Development

### Project Structure

```
src/
├── agents/         # Agent implementations
├── components/     # React components
├── edges/         # Edge definitions
├── managers/      # System managers
├── nodes/         # Node implementations
├── services/      # Core services
├── store/         # State management
├── types/         # TypeScript definitions
├── utils/         # Utility functions
└── workers/       # Web worker implementations
```

### Key Services

- `ApiKeyManager`: API key management
- `ExecutionEngine`: Node execution
- `LLMService`: LLM integration
- `ExecutionHistoryService`: History tracking
- `FlowValidationService`: Flow validation

## 🔒 Security

- XOR-based code execution protection
- Sandboxed execution environment
- Secure message passing
- API key encryption
- Rate limiting
- Input validation

## 📊 Analytics

- Execution history tracking
- Performance metrics
- Cost monitoring
- Resource utilization
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React Flow for the visual interface
- OpenAI, Anthropic, Google, and Perplexity for LLM capabilities
- The open-source community for various dependencies

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using TypeScript, React, and React Flow
