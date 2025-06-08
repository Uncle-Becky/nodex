import React, { useState } from 'react';
import type { NodeType } from '../types/nodes';

interface NodeTemplate {
  type: NodeType;
  label: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  defaultData: Record<string, unknown>;
}

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (
    template: NodeTemplate,
    position: { x: number; y: number }
  ) => void;
}

const nodeTemplates: NodeTemplate[] = [
  // LLM Nodes
  {
    type: 'llm_chat',
    label: 'LLM Chat',
    description: 'Interactive chat with language models',
    category: 'LLM',
    icon: '💬',
    color: 'bg-green-100 border-green-300',
    defaultData: {
      provider: 'openai',
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 2048,
      conversationHistory: true,
    },
  },
  {
    type: 'llm_completion',
    label: 'LLM Completion',
    description: 'Text completion and generation',
    category: 'LLM',
    icon: '📝',
    color: 'bg-green-100 border-green-300',
    defaultData: {
      provider: 'openai',
      prompt: 'Complete the following text: {{input}}',
      temperature: 0.7,
      maxTokens: 1024,
      outputFormat: 'text',
    },
  },

  // Code Execution
  {
    type: 'code_executor',
    label: 'Code Executor',
    description: 'Execute JavaScript, Python, or other code',
    category: 'Execution',
    icon: '⚡',
    color: 'bg-yellow-100 border-yellow-300',
    defaultData: {
      language: 'javascript',
      code: '// Process the input\nreturn input.toUpperCase();',
      timeout: 5000,
      allowNetworkAccess: false,
      allowFileAccess: false,
    },
  },

  // Data Processing
  {
    type: 'data_processor',
    label: 'Data Processor',
    description: 'Filter, transform, and manipulate data',
    category: 'Data',
    icon: '🔄',
    color: 'bg-blue-100 border-blue-300',
    defaultData: {
      operations: [
        {
          type: 'filter',
          parameters: { field: 'status', operator: 'equals', value: 'active' },
        },
      ],
      validation: true,
    },
  },
  {
    type: 'web_scraper',
    label: 'Web Scraper',
    description: 'Extract data from websites',
    category: 'Data',
    icon: '🌐',
    color: 'bg-blue-100 border-blue-300',
    defaultData: {
      url: 'https://example.com',
      selectors: { title: 'h1', content: '.content' },
      timeout: 10000,
      respectRobots: true,
      rateLimit: 1000,
    },
  },
  {
    type: 'file_processor',
    label: 'File Processor',
    description: 'Read, write, and process files',
    category: 'Data',
    icon: '📁',
    color: 'bg-blue-100 border-blue-300',
    defaultData: {
      supportedTypes: ['txt', 'json', 'csv'],
      operations: [{ type: 'read', parameters: {} }],
      maxFileSize: 10485760, // 10MB
    },
  },

  // Analysis
  {
    type: 'text_analyzer',
    label: 'Text Analyzer',
    description: 'Analyze sentiment, entities, and more',
    category: 'Analysis',
    icon: '📊',
    color: 'bg-purple-100 border-purple-300',
    defaultData: {
      analysisTypes: ['sentiment', 'entities'],
      confidence: 0.8,
    },
  },
  {
    type: 'image_analyzer',
    label: 'Image Analyzer',
    description: 'OCR, object detection, and image analysis',
    category: 'Analysis',
    icon: '🖼️',
    color: 'bg-purple-100 border-purple-300',
    defaultData: {
      analysisTypes: ['ocr'],
      provider: 'openai',
      confidence: 0.8,
      outputFormat: 'json',
    },
  },

  // Control Flow
  {
    type: 'workflow_controller',
    label: 'Workflow Controller',
    description: 'Control execution flow and logic',
    category: 'Control',
    icon: '🎛️',
    color: 'bg-orange-100 border-orange-300',
    defaultData: {
      controlType: 'sequential',
      errorHandling: 'stop',
      maxIterations: 10,
    },
  },
  {
    type: 'condition_checker',
    label: 'Condition Checker',
    description: 'Conditional logic and branching',
    category: 'Control',
    icon: '❓',
    color: 'bg-orange-100 border-orange-300',
    defaultData: {
      conditions: [{ field: 'value', operator: 'greater', value: 0 }],
    },
  },

  // Utilities
  {
    type: 'memory_bank',
    label: 'Memory Bank',
    description: 'Store and retrieve data',
    category: 'Utility',
    icon: '🧠',
    color: 'bg-gray-100 border-gray-300',
    defaultData: {
      storageType: 'temporary',
      maxSize: 1048576, // 1MB
      encryption: false,
      searchable: true,
    },
  },
  {
    type: 'api_connector',
    label: 'API Connector',
    description: 'Connect to external APIs',
    category: 'Utility',
    icon: '🔌',
    color: 'bg-gray-100 border-gray-300',
    defaultData: {
      method: 'GET',
      url: 'https://api.example.com/data',
      timeout: 10000,
      retries: 3,
      rateLimit: 1000,
    },
  },
  {
    type: 'formatter',
    label: 'Formatter',
    description: 'Format and transform output',
    category: 'Utility',
    icon: '✨',
    color: 'bg-gray-100 border-gray-300',
    defaultData: {
      format: 'json',
      template: '{{input}}',
    },
  },
  {
    type: 'logger',
    label: 'Logger',
    description: 'Log and monitor data flow',
    category: 'Utility',
    icon: '📋',
    color: 'bg-gray-100 border-gray-300',
    defaultData: {
      level: 'info',
      includeTimestamp: true,
      includeMetadata: true,
    },
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({
  isOpen,
  onClose,
  onAddNode,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'All',
    ...Array.from(new Set(nodeTemplates.map(t => t.category))),
  ];

  const filteredTemplates = nodeTemplates.filter(template => {
    const matchesCategory =
      selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch =
      template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddNode = (template: NodeTemplate) => {
    // Add node at a random position for now
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    onAddNode(template, position);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden'>
        <div className='p-6'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-900'>Node Palette</h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 text-2xl'
            >
              ×
            </button>
          </div>

          {/* Search and Filter */}
          <div className='mb-6 space-y-4'>
            <div>
              <input
                type='text'
                placeholder='Search nodes...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Node Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto'>
            {filteredTemplates.map(template => (
              <div
                key={template.type}
                className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all ${template.color}`}
                onClick={() => handleAddNode(template)}
              >
                <div className='flex items-start gap-3'>
                  <div className='text-2xl'>{template.icon}</div>
                  <div className='flex-1'>
                    <h3 className='font-semibold text-gray-900 mb-1'>
                      {template.label}
                    </h3>
                    <p className='text-sm text-gray-600 mb-2'>
                      {template.description}
                    </p>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs px-2 py-1 bg-white rounded-full border'>
                        {template.category}
                      </span>
                      <button className='text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700'>
                        Add Node
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className='text-center py-12'>
              <div className='text-gray-400 text-6xl mb-4'>🔍</div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                No nodes found
              </h3>
              <p className='text-gray-600'>
                Try adjusting your search or category filter.
              </p>
            </div>
          )}

          <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
            <h4 className='text-sm font-semibold text-gray-900 mb-2'>
              Getting Started
            </h4>
            <p className='text-xs text-gray-600'>
              Click on any node to add it to your canvas. You can then configure
              its settings and connect it to other nodes. Start with an LLM Chat
              node to begin building your AI workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
