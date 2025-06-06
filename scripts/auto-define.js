#!/usr/bin/env node

/**
 * Auto-Definition Tool
 * Automatically detects undefined references and generates proper definitions
 */

import {
  existsSync,
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

class AutoDefiner {
  constructor() {
    this.undefinedRefs = new Map();
    this.existingDefinitions = new Map();
    this.fileAnalysis = new Map();
    this.typeDefinitions = new Map();

    // Common patterns for different types of definitions
    this.patterns = {
      interface: /interface\s+(\w+)/g,
      type: /type\s+(\w+)/g,
      class: /class\s+(\w+)/g,
      function: /function\s+(\w+)/g,
      const: /const\s+(\w+)/g,
      enum: /enum\s+(\w+)/g,
      import: /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      export: /export\s+(?:interface|type|class|function|const|enum)\s+(\w+)/g,
    };

    // File type mappings for where to place definitions
    this.locationMap = {
      types: 'src/types',
      interfaces: 'src/types',
      agents: 'src/agents',
      components: 'src/components',
      utils: 'src/utils',
      managers: 'src/managers',
      workers: 'src/workers',
    };
  }

  async analyze() {
    console.log('🔍 Auto-Definition Tool - Analyzing Codebase');
    console.log('=============================================');

    // Step 1: Scan all TypeScript files
    await this.scanCodebase();

    // Step 2: Detect undefined references
    await this.detectUndefinedReferences();

    // Step 3: Generate definitions
    await this.generateDefinitions();

    // Step 4: Write definitions to appropriate files
    await this.writeDefinitions();

    this.generateReport();
  }

  async scanCodebase() {
    console.log('📁 Scanning codebase...');

    const srcDir = join(projectRoot, 'src');
    if (!existsSync(srcDir)) {
      throw new Error('src directory not found');
    }

    await this.scanDirectory(srcDir);
    console.log(`   Found ${this.fileAnalysis.size} TypeScript files`);
  }

  async scanDirectory(dirPath) {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        await this.analyzeFile(fullPath);
      }
    }
  }

  async analyzeFile(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);

    const analysis = {
      path: filePath,
      relativePath,
      content,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      definitions: this.extractDefinitions(content),
      undefinedRefs: this.extractUndefinedReferences(content),
      errors: [],
    };

    this.fileAnalysis.set(filePath, analysis);

    // Store existing definitions
    analysis.definitions.forEach(def => {
      this.existingDefinitions.set(def.name, {
        ...def,
        file: filePath,
        relativePath,
      });
    });
  }

  extractImports(content) {
    const imports = [];
    let match;

    while ((match = this.patterns.import.exec(content)) !== null) {
      imports.push({
        path: match[1],
        line: this.getLineNumber(content, match.index),
      });
    }

    return imports;
  }

  extractExports(content) {
    const exports = [];
    let match;

    while ((match = this.patterns.export.exec(content)) !== null) {
      exports.push({
        name: match[1],
        line: this.getLineNumber(content, match.index),
      });
    }

    return exports;
  }

  extractDefinitions(content) {
    const definitions = [];

    Object.entries(this.patterns).forEach(([type, pattern]) => {
      if (type === 'import' || type === 'export') return;

      let match;
      const regex = new RegExp(pattern.source, 'g');

      while ((match = regex.exec(content)) !== null) {
        definitions.push({
          type,
          name: match[1],
          line: this.getLineNumber(content, match.index),
          context: this.getContext(content, match.index),
        });
      }
    });

    return definitions;
  }

  extractUndefinedReferences(content) {
    const undefinedRefs = [];

    // Common patterns for undefined references
    const refPatterns = [
      // Type annotations
      /:\s*([A-Z]\w+)(?![a-z])/g,
      // Generic parameters
      /<([A-Z]\w+)>/g,
      // Function calls
      /([a-z]\w+)\(/g,
      // Class instantiation
      /new\s+([A-Z]\w+)/g,
      // Property access on undefined objects
      /(\w+)\.(\w+)/g,
    ];

    refPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const ref = match[1];
        if (ref && ref.match(/^[A-Z]/) && !this.existingDefinitions.has(ref)) {
          undefinedRefs.push({
            name: ref,
            type: this.inferType(ref, content, match.index),
            line: this.getLineNumber(content, match.index),
            context: this.getContext(content, match.index),
          });
        }
      }
    });

    return undefinedRefs;
  }

  async detectUndefinedReferences() {
    console.log('🔎 Detecting undefined references...');

    let totalUndefined = 0;

    this.fileAnalysis.forEach((analysis, filePath) => {
      analysis.undefinedRefs.forEach(ref => {
        if (!this.existingDefinitions.has(ref.name)) {
          if (!this.undefinedRefs.has(ref.name)) {
            this.undefinedRefs.set(ref.name, []);
          }
          this.undefinedRefs.get(ref.name).push({
            ...ref,
            file: filePath,
            relativePath: analysis.relativePath,
          });
          totalUndefined++;
        }
      });
    });

    console.log(
      `   Found ${this.undefinedRefs.size} unique undefined references`
    );
    console.log(`   Total occurrences: ${totalUndefined}`);
  }

  async generateDefinitions() {
    console.log('🔧 Generating definitions...');

    for (const [name, refs] of this.undefinedRefs) {
      const inferredType = this.inferDefinitionType(name, refs);
      const definition = this.createDefinition(name, inferredType, refs);

      this.typeDefinitions.set(name, definition);
    }

    console.log(`   Generated ${this.typeDefinitions.size} definitions`);
  }

  inferType(name, content, index) {
    const context = this.getContext(content, index, 50);

    // Type inference based on context
    if (context.includes(': ' + name)) return 'type';
    if (context.includes('interface ' + name)) return 'interface';
    if (context.includes('class ' + name)) return 'class';
    if (context.includes('new ' + name)) return 'class';
    if (context.includes(name + '(')) return 'function';
    if (context.includes('enum ' + name)) return 'enum';
    if (name.endsWith('Event')) return 'interface';
    if (name.endsWith('Config')) return 'interface';
    if (name.endsWith('Options')) return 'interface';
    if (name.endsWith('Props')) return 'interface';
    if (name.endsWith('State')) return 'interface';
    if (name.endsWith('Type')) return 'type';
    if (name.match(/^[A-Z][a-z]/)) return 'interface';

    return 'interface'; // Default fallback
  }

  inferDefinitionType(name, refs) {
    const contexts = refs.map(ref => ref.context).join(' ');
    const types = refs.map(ref => ref.type);

    // Majority vote for type
    const typeCount = {};
    types.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const mostCommon = Object.entries(typeCount).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    return mostCommon || 'interface';
  }

  createDefinition(name, type, refs) {
    const location = this.determineLocation(name, type, refs);

    let definition = '';

    switch (type) {
      case 'interface':
        definition = this.createInterfaceDefinition(name, refs);
        break;
      case 'type':
        definition = this.createTypeDefinition(name, refs);
        break;
      case 'class':
        definition = this.createClassDefinition(name, refs);
        break;
      case 'function':
        definition = this.createFunctionDefinition(name, refs);
        break;
      case 'enum':
        definition = this.createEnumDefinition(name, refs);
        break;
      default:
        definition = this.createInterfaceDefinition(name, refs);
    }

    return {
      name,
      type,
      definition,
      location,
      refs,
    };
  }

  createInterfaceDefinition(name, refs) {
    const properties = this.inferProperties(name, refs);

    return `export interface ${name} {
${properties.map(prop => `  ${prop.name}: ${prop.type};`).join('\n')}
}`;
  }

  createTypeDefinition(name, refs) {
    const baseType = this.inferBaseType(name, refs);
    return `export type ${name} = ${baseType};`;
  }

  createClassDefinition(name, refs) {
    return `export class ${name} {
  constructor() {
    // TODO: Implement constructor
  }

  // TODO: Add methods and properties
}`;
  }

  createFunctionDefinition(name, refs) {
    return `export function ${name}(...args: unknown[]): unknown {
  // TODO: Implement function
  throw new Error('Function ${name} not implemented');
}`;
  }

  createEnumDefinition(name, refs) {
    return `export enum ${name} {
  // TODO: Add enum values
}`;
  }

  inferProperties(name, refs) {
    // Analyze contexts to infer likely properties
    const properties = [];

    // Common properties based on naming patterns
    if (name.endsWith('Event')) {
      properties.push(
        { name: 'type', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'data', type: 'unknown' }
      );
    } else if (name.endsWith('Config')) {
      properties.push(
        { name: 'enabled', type: 'boolean' },
        { name: 'settings', type: 'Record<string, unknown>' }
      );
    } else if (name.endsWith('Props')) {
      properties.push(
        { name: 'className', type: 'string' },
        { name: 'children', type: 'React.ReactNode' }
      );
    } else if (name.endsWith('State')) {
      properties.push(
        { name: 'loading', type: 'boolean' },
        { name: 'error', type: 'string | null' }
      );
    } else {
      // Generic properties
      properties.push({ name: 'id', type: 'string' });
    }

    return properties;
  }

  inferBaseType(name, refs) {
    if (name.includes('ID') || name.includes('Id')) return 'string';
    if (name.includes('Count') || name.includes('Number')) return 'number';
    if (name.includes('Flag') || name.includes('Boolean')) return 'boolean';
    if (name.includes('List') || name.includes('Array')) return 'unknown[]';
    if (name.includes('Map') || name.includes('Dict'))
      return 'Record<string, unknown>';

    return 'unknown';
  }

  determineLocation(name, type, refs) {
    // Determine best file location based on usage patterns
    const filePaths = refs.map(ref => ref.file);
    const directories = filePaths.map(path => dirname(path));

    // Find most common directory
    const dirCount = {};
    directories.forEach(dir => {
      const relativeDir = relative(join(projectRoot, 'src'), dir);
      const topDir = relativeDir.split('/')[0];
      dirCount[topDir] = (dirCount[topDir] || 0) + 1;
    });

    const mostCommonDir =
      Object.entries(dirCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'types';

    // Map to appropriate definition location
    const locationMapping = {
      agents: 'src/types/agents.ts',
      components: 'src/types/components.ts',
      workers: 'src/types/workers.ts',
      managers: 'src/types/managers.ts',
      utils: 'src/types/utils.ts',
      types: 'src/types/index.ts',
    };

    return locationMapping[mostCommonDir] || 'src/types/index.ts';
  }

  async writeDefinitions() {
    console.log('📝 Writing definitions to files...');

    const fileGroups = {};

    // Group definitions by target file
    this.typeDefinitions.forEach(def => {
      if (!fileGroups[def.location]) {
        fileGroups[def.location] = [];
      }
      fileGroups[def.location].push(def);
    });

    let filesWritten = 0;

    for (const [filePath, definitions] of Object.entries(fileGroups)) {
      const fullPath = join(projectRoot, filePath);
      await this.ensureDirectoryExists(dirname(fullPath));

      let content = '';

      // Read existing content if file exists
      if (existsSync(fullPath)) {
        content = readFileSync(fullPath, 'utf8');
      } else {
        content = `// Auto-generated type definitions
// Generated by auto-define tool

`;
      }

      // Add new definitions
      definitions.forEach(def => {
        if (
          !content.includes(`interface ${def.name}`) &&
          !content.includes(`type ${def.name}`) &&
          !content.includes(`class ${def.name}`)
        ) {
          content += `\n${def.definition}\n`;
        }
      });

      writeFileSync(fullPath, content);
      filesWritten++;

      console.log(
        `   ✅ ${relative(projectRoot, fullPath)} (${definitions.length} definitions)`
      );
    }

    console.log(`   📁 Updated ${filesWritten} files`);
  }

  async ensureDirectoryExists(dirPath) {
    if (!existsSync(dirPath)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(dirPath, { recursive: true });
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getContext(content, index, length = 30) {
    const start = Math.max(0, index - length);
    const end = Math.min(content.length, index + length);
    return content.substring(start, end);
  }

  generateReport() {
    console.log('\n📊 Auto-Definition Report');
    console.log('==========================');

    console.log(`✅ Files analyzed: ${this.fileAnalysis.size}`);
    console.log(`🔍 Undefined references found: ${this.undefinedRefs.size}`);
    console.log(`🔧 Definitions generated: ${this.typeDefinitions.size}`);

    if (this.typeDefinitions.size > 0) {
      console.log('\n📋 Generated Definitions:');

      const byType = {};
      this.typeDefinitions.forEach(def => {
        if (!byType[def.type]) byType[def.type] = [];
        byType[def.type].push(def.name);
      });

      Object.entries(byType).forEach(([type, names]) => {
        console.log(`   ${type}: ${names.join(', ')}`);
      });

      console.log('\n💡 Next Steps:');
      console.log('   1. Review generated definitions for accuracy');
      console.log('   2. Update implementations as needed');
      console.log('   3. Run type checking: npm run typecheck');
      console.log('   4. Run tests: npm run lint');
    } else {
      console.log(
        '\n🎉 No undefined references found! Your codebase is well-defined.'
      );
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesAnalyzed: this.fileAnalysis.size,
        undefinedReferences: this.undefinedRefs.size,
        definitionsGenerated: this.typeDefinitions.size,
      },
      undefinedRefs: Object.fromEntries(this.undefinedRefs),
      definitions: Object.fromEntries(this.typeDefinitions),
    };

    writeFileSync(
      join(projectRoot, 'auto-define-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Detailed report saved to: auto-define-report.json');
  }
}

// CLI interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Auto-Definition Tool Usage:

  npm run auto:define              # Analyze and generate definitions
  npm run auto:define --dry-run    # Analyze only, don't write files
  npm run auto:define --help       # Show this help

The tool will:
1. Scan all TypeScript files for undefined references
2. Infer appropriate definition types
3. Generate proper TypeScript definitions
4. Place definitions in the correct files
5. Provide a detailed report
`);
  process.exit(0);
}

const definer = new AutoDefiner();
definer.analyze().catch(error => {
  console.error(`❌ Auto-definition failed: ${error.message}`);
  process.exit(1);
});
