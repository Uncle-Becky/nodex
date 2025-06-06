#!/usr/bin/env node

/**
 * Smart Type Fixer
 * Intelligently detects and fixes only truly missing types, ignoring built-ins
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class SmartTypeFixer {
  constructor() {
    this.projectTypes = new Set();
    this.missingTypes = new Set();
    this.builtInTypes = new Set([
      // JavaScript built-ins
      'Object',
      'Array',
      'Map',
      'Set',
      'Date',
      'Promise',
      'Error',
      'JSON',
      'Math',
      'Number',
      'String',
      'Boolean',
      'RegExp',
      'Function',
      'Symbol',
      'BigInt',
      'WeakMap',
      'WeakSet',
      'ArrayBuffer',

      // Browser built-ins
      'Window',
      'Document',
      'Element',
      'HTMLElement',
      'HTMLInputElement',
      'HTMLButtonElement',
      'HTMLFormElement',
      'HTMLDivElement',
      'Event',
      'MouseEvent',
      'KeyboardEvent',
      'MessageEvent',
      'Worker',
      'Blob',
      'File',
      'FileReader',
      'URL',
      'URLSearchParams',
      'FormData',
      'Headers',
      'Request',
      'Response',
      'fetch',

      // React built-ins
      'React',
      'ReactDOM',
      'Component',
      'PureComponent',
      'Fragment',
      'StrictMode',
      'Suspense',
      'ElementType',
      'ComponentType',
      'ReactElement',
      'ReactNode',
      'JSX',

      // TypeScript built-ins
      'Partial',
      'Required',
      'Readonly',
      'Record',
      'Pick',
      'Omit',
      'Exclude',
      'Extract',
      'NonNullable',
      'ReturnType',
      'InstanceType',
      'Parameters',
      'ConstructorParameters',
      'Uppercase',
      'Lowercase',

      // XY Flow built-ins
      'Node',
      'Edge',
      'NodeChange',
      'EdgeChange',
      'Connection',
      'Handle',
      'Position',
      'EdgeLabelRenderer',
      'Background',
      'MiniMap',
      'Controls',
      'Panel',
    ]);

    this.agentSpecificPatterns = [
      /Agent$/,
      /Event$/,
      /Config$/,
      /Options$/,
      /State$/,
      /Props$/,
      /Manager$/,
      /Worker$/,
      /Bus$/,
      /Pool$/,
    ];
  }

  async analyze() {
    console.log('🧠 Smart Type Fixer');
    console.log('===================');

    await this.scanExistingTypes();
    await this.findMissingTypes();
    await this.generateSmartDefinitions();
    this.generateReport();
  }

  async scanExistingTypes() {
    console.log('📁 Scanning existing types...');
    const srcDir = join(projectRoot, 'src');
    if (existsSync(srcDir)) {
      await this.scanForTypes(srcDir);
    }
    console.log(`   Found ${this.projectTypes.size} existing types`);
  }

  async scanForTypes(dirPath) {
    const items = readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        await this.scanForTypes(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        this.extractTypesFromFile(fullPath);
      }
    }
  }

  extractTypesFromFile(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const patterns = [
      /(?:export\s+)?interface\s+(\w+)/g,
      /(?:export\s+)?type\s+(\w+)/g,
      /(?:export\s+)?class\s+(\w+)/g,
      /(?:export\s+)?enum\s+(\w+)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        this.projectTypes.add(match[1]);
      }
    });
  }

  async findMissingTypes() {
    console.log('🔍 Finding missing types...');
    const srcDir = join(projectRoot, 'src');
    if (existsSync(srcDir)) {
      await this.analyzeUsage(srcDir);
    }

    const filtered = new Set();
    this.missingTypes.forEach(type => {
      if (
        !this.builtInTypes.has(type) &&
        !this.projectTypes.has(type) &&
        this.isProjectType(type)
      ) {
        filtered.add(type);
      }
    });

    this.missingTypes = filtered;
    console.log(`   Found ${this.missingTypes.size} missing types`);
  }

  async analyzeUsage(dirPath) {
    const items = readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        await this.analyzeUsage(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        this.findUsagesInFile(fullPath);
      }
    }
  }

  findUsagesInFile(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const patterns = [
      /:\s*([A-Z]\w+)/g,
      /<([A-Z]\w+)>/g,
      /implements\s+([A-Z]\w+)/g,
      /extends\s+([A-Z]\w+)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const type = match[1];
        if (type && !this.isImported(content, type)) {
          this.missingTypes.add(type);
        }
      }
    });
  }

  isImported(content, typeName) {
    return new RegExp(`import.*${typeName}.*from`).test(content);
  }

  isProjectType(typeName) {
    return (
      typeName.length >= 3 &&
      /Agent$|Event$|Config$|Props$|State$|Manager$|Worker$|Options$/.test(
        typeName
      )
    );
  }

  async generateSmartDefinitions() {
    console.log('🔧 Generating definitions...');

    const definitions = new Map();
    this.missingTypes.forEach(typeName => {
      const def = this.createDefinition(typeName);
      const file = this.getTargetFile(typeName);

      if (!definitions.has(file)) {
        definitions.set(file, []);
      }
      definitions.get(file).push({ typeName, definition: def });
    });

    for (const [file, defs] of definitions) {
      await this.writeDefinitions(file, defs);
    }
  }

  createDefinition(typeName) {
    if (typeName.endsWith('Agent')) {
      return `export interface ${typeName} {
  id: string;
  type: string;
  status: 'active' | 'idle' | 'error';
  initialize(): Promise<void>;
  process(data: unknown): Promise<unknown>;
}`;
    }

    if (typeName.endsWith('Event')) {
      return `export interface ${typeName} {
  type: string;
  timestamp: number;
  data: unknown;
}`;
    }

    if (typeName.endsWith('Config')) {
      return `export interface ${typeName} {
  enabled: boolean;
  options: Record<string, unknown>;
}`;
    }

    return `export interface ${typeName} {
  id: string;
}`;
  }

  getTargetFile(typeName) {
    if (typeName.includes('Agent')) return 'src/types/agents.ts';
    if (typeName.includes('Event')) return 'src/types/events.ts';
    if (typeName.includes('Config')) return 'src/types/config.ts';
    return 'src/types/index.ts';
  }

  async writeDefinitions(targetFile, definitions) {
    const fullPath = join(projectRoot, targetFile);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let content = existsSync(fullPath)
      ? readFileSync(fullPath, 'utf8')
      : '// Project-specific type definitions\n\n';

    definitions.forEach(({ definition }) => {
      content += `\n${definition}\n`;
    });

    writeFileSync(fullPath, content);
    console.log(
      `   ✅ ${relative(projectRoot, fullPath)} (${definitions.length} types)`
    );
  }

  generateReport() {
    console.log('\n📊 Report');
    console.log('=========');
    console.log(`✅ Existing types: ${this.projectTypes.size}`);
    console.log(`🔧 Generated: ${this.missingTypes.size}`);

    if (this.missingTypes.size === 0) {
      console.log('🎉 No missing types found!');
    }
  }
}

new SmartTypeFixer().analyze().catch(console.error);
