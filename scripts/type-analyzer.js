#!/usr/bin/env node

/**
 * Advanced Type Analyzer
 * Uses TypeScript compiler API for sophisticated type analysis and definition generation
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class TypeAnalyzer {
  constructor() {
    this.typeIssues = new Map();
    this.missingTypes = new Set();
    this.inferredTypes = new Map();
    this.suggestions = [];
  }

  async analyze() {
    console.log('🔬 Advanced Type Analyzer');
    console.log('==========================');

    // Step 1: Run TypeScript compiler to get type errors
    await this.runTypeScript();

    // Step 2: Analyze common patterns
    await this.analyzePatterns();

    // Step 3: Generate intelligent suggestions
    await this.generateSuggestions();

    // Step 4: Create type definitions
    await this.createDefinitions();

    this.generateReport();
  }

  async runTypeScript() {
    console.log('🔍 Running TypeScript compiler analysis...');

    return new Promise((resolve, reject) => {
      const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
        cwd: projectRoot,
        stdio: 'pipe',
      });

      let output = '';
      let errorOutput = '';

      tsc.stdout.on('data', data => {
        output += data.toString();
      });

      tsc.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      tsc.on('close', code => {
        this.parseTypeScriptOutput(output + errorOutput);
        console.log(`   Found ${this.typeIssues.size} type issues`);
        resolve();
      });

      tsc.on('error', reject);
    });
  }

  parseTypeScriptOutput(output) {
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse TypeScript error format: file(line,col): error TS#### message
      const match = line.match(
        /^(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/
      );

      if (match) {
        const [, file, lineNum, col, errorCode, message] = match;

        const issue = {
          file: file.replace(projectRoot, ''),
          line: parseInt(lineNum),
          column: parseInt(col),
          code: errorCode,
          message,
          category: this.categorizeError(errorCode, message),
        };

        if (!this.typeIssues.has(file)) {
          this.typeIssues.set(file, []);
        }
        this.typeIssues.get(file).push(issue);

        // Extract missing types
        this.extractMissingTypes(message);
      }
    }
  }

  categorizeError(code, message) {
    const codeNum = parseInt(code);

    // Common TypeScript error categories
    if ([2304, 2305, 2339].includes(codeNum)) return 'missing-declaration';
    if ([2322, 2323, 2324].includes(codeNum)) return 'type-mismatch';
    if ([2345, 2346, 2347].includes(codeNum)) return 'argument-mismatch';
    if ([2349, 2350].includes(codeNum)) return 'callable-signature';
    if ([2367, 2368].includes(codeNum)) return 'property-access';
    if ([2769, 2770].includes(codeNum)) return 'missing-property';

    return 'other';
  }

  extractMissingTypes(message) {
    // Extract type names from error messages
    const patterns = [
      /Cannot find name '(\w+)'/,
      /Property '(\w+)' does not exist/,
      /Type '(\w+)' is not assignable/,
      /'(\w+)' refers to a value, but is being used as a type/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        this.missingTypes.add(match[1]);
      }
    }
  }

  async analyzePatterns() {
    console.log('🧩 Analyzing code patterns...');

    // Group issues by type
    const categories = {};
    this.typeIssues.forEach(issues => {
      issues.forEach(issue => {
        if (!categories[issue.category]) {
          categories[issue.category] = [];
        }
        categories[issue.category].push(issue);
      });
    });

    // Analyze each category
    Object.entries(categories).forEach(([category, issues]) => {
      this.analyzeCategory(category, issues);
    });

    console.log(
      `   Analyzed ${Object.keys(categories).length} issue categories`
    );
  }

  analyzeCategory(category, issues) {
    switch (category) {
      case 'missing-declaration':
        this.analyzeMissingDeclarations(issues);
        break;
      case 'type-mismatch':
        this.analyzeTypeMismatches(issues);
        break;
      case 'missing-property':
        this.analyzeMissingProperties(issues);
        break;
      default:
        // Generic analysis
        break;
    }
  }

  analyzeMissingDeclarations(issues) {
    issues.forEach(issue => {
      const typeMatch = issue.message.match(/Cannot find name '(\w+)'/);
      if (typeMatch) {
        const typeName = typeMatch[1];
        this.inferredTypes.set(
          typeName,
          this.inferTypeFromUsage(typeName, issue)
        );
      }
    });
  }

  analyzeTypeMismatches(issues) {
    issues.forEach(issue => {
      // Analyze type mismatches to suggest better type definitions
      this.suggestions.push({
        type: 'type-refinement',
        file: issue.file,
        line: issue.line,
        message: `Consider refining type definition based on: ${issue.message}`,
        priority: 'medium',
      });
    });
  }

  analyzeMissingProperties(issues) {
    issues.forEach(issue => {
      const propMatch = issue.message.match(
        /Property '(\w+)' does not exist on type '(\w+)'/
      );
      if (propMatch) {
        const [, property, type] = propMatch;
        this.suggestions.push({
          type: 'add-property',
          targetType: type,
          property,
          file: issue.file,
          line: issue.line,
          message: `Add property '${property}' to type '${type}'`,
          priority: 'high',
        });
      }
    });
  }

  inferTypeFromUsage(typeName, issue) {
    // Smart type inference based on naming patterns and context
    const patterns = {
      Event: 'interface',
      Config: 'interface',
      Options: 'interface',
      Props: 'interface',
      State: 'interface',
      Type: 'type',
      Enum: 'enum',
    };

    for (const [suffix, typeKind] of Object.entries(patterns)) {
      if (typeName.endsWith(suffix)) {
        return {
          kind: typeKind,
          properties: this.inferProperties(typeName, suffix),
          file: issue.file,
          usage: issue.message,
        };
      }
    }

    // Default inference
    return {
      kind: 'interface',
      properties: [{ name: 'id', type: 'string' }],
      file: issue.file,
      usage: issue.message,
    };
  }

  inferProperties(typeName, suffix) {
    const propertyMap = {
      Event: [
        { name: 'type', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'data', type: 'unknown' },
        { name: 'source', type: 'string' },
      ],
      Config: [
        { name: 'enabled', type: 'boolean' },
        { name: 'options', type: 'Record<string, unknown>' },
      ],
      Options: [
        { name: 'timeout', type: 'number' },
        { name: 'retries', type: 'number' },
      ],
      Props: [
        { name: 'className', type: 'string' },
        { name: 'children', type: 'React.ReactNode' },
      ],
      State: [
        { name: 'loading', type: 'boolean' },
        { name: 'error', type: 'string | null' },
        { name: 'data', type: 'unknown' },
      ],
    };

    return propertyMap[suffix] || [{ name: 'id', type: 'string' }];
  }

  async generateSuggestions() {
    console.log('💡 Generating intelligent suggestions...');

    // Generate definitions for missing types
    this.missingTypes.forEach(typeName => {
      if (this.inferredTypes.has(typeName)) {
        const typeInfo = this.inferredTypes.get(typeName);
        this.suggestions.push({
          type: 'create-definition',
          typeName,
          typeKind: typeInfo.kind,
          properties: typeInfo.properties,
          targetFile: this.determineTargetFile(typeName, typeInfo.file),
          priority: 'high',
          message: `Create ${typeInfo.kind} definition for '${typeName}'`,
        });
      }
    });

    console.log(`   Generated ${this.suggestions.length} suggestions`);
  }

  determineTargetFile(typeName, sourceFile) {
    // Intelligent file placement based on usage context
    const sourceDir = dirname(sourceFile);

    if (sourceDir.includes('agents')) return 'src/types/agents.ts';
    if (sourceDir.includes('components')) return 'src/types/components.ts';
    if (sourceDir.includes('workers')) return 'src/types/workers.ts';
    if (sourceDir.includes('managers')) return 'src/types/managers.ts';
    if (sourceDir.includes('utils')) return 'src/types/utils.ts';

    return 'src/types/index.ts';
  }

  async createDefinitions() {
    console.log('🔧 Creating type definitions...');

    const definitionsByFile = {};

    // Group suggestions by target file
    this.suggestions
      .filter(s => s.type === 'create-definition')
      .forEach(suggestion => {
        if (!definitionsByFile[suggestion.targetFile]) {
          definitionsByFile[suggestion.targetFile] = [];
        }
        definitionsByFile[suggestion.targetFile].push(suggestion);
      });

    // Write definitions to files
    for (const [targetFile, definitions] of Object.entries(definitionsByFile)) {
      await this.writeDefinitionsToFile(targetFile, definitions);
    }

    console.log(
      `   Created definitions in ${Object.keys(definitionsByFile).length} files`
    );
  }

  async writeDefinitionsToFile(targetFile, definitions) {
    const fullPath = join(projectRoot, targetFile);

    // Ensure directory exists
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(dir, { recursive: true });
    }

    let content = '';

    // Read existing content
    if (existsSync(fullPath)) {
      content = readFileSync(fullPath, 'utf8');
    } else {
      content = `// Auto-generated type definitions
// Generated by type-analyzer

`;
    }

    // Add new definitions
    definitions.forEach(def => {
      const definitionCode = this.generateDefinitionCode(def);

      // Check if definition already exists
      if (!content.includes(`${def.typeKind} ${def.typeName}`)) {
        content += `\n${definitionCode}\n`;
      }
    });

    writeFileSync(fullPath, content);
    console.log(
      `   ✅ ${relative(projectRoot, fullPath)} (${definitions.length} definitions)`
    );
  }

  generateDefinitionCode(suggestion) {
    const { typeName, typeKind, properties } = suggestion;

    switch (typeKind) {
      case 'interface':
        return `export interface ${typeName} {
${properties.map(prop => `  ${prop.name}: ${prop.type};`).join('\n')}
}`;

      case 'type':
        const baseType = properties[0]?.type || 'unknown';
        return `export type ${typeName} = ${baseType};`;

      case 'enum':
        return `export enum ${typeName} {
  // TODO: Add enum values
}`;

      default:
        return `export interface ${typeName} {
  id: string;
}`;
    }
  }

  generateReport() {
    console.log('\n📊 Type Analysis Report');
    console.log('========================');

    // Summary statistics
    const totalIssues = Array.from(this.typeIssues.values()).reduce(
      (sum, issues) => sum + issues.length,
      0
    );

    console.log(`📁 Files with type issues: ${this.typeIssues.size}`);
    console.log(`🔍 Total type issues: ${totalIssues}`);
    console.log(`❓ Missing types detected: ${this.missingTypes.size}`);
    console.log(`💡 Suggestions generated: ${this.suggestions.length}`);

    // Issue breakdown by category
    const categoryCount = {};
    this.typeIssues.forEach(issues => {
      issues.forEach(issue => {
        categoryCount[issue.category] =
          (categoryCount[issue.category] || 0) + 1;
      });
    });

    if (Object.keys(categoryCount).length > 0) {
      console.log('\n📋 Issues by Category:');
      Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });
    }

    // Priority suggestions
    const highPriority = this.suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      console.log(`\n🚨 High Priority Actions (${highPriority.length}):`);
      highPriority.slice(0, 5).forEach(suggestion => {
        console.log(`   - ${suggestion.message}`);
      });
    }

    // Next steps
    console.log('\n🎯 Recommended Actions:');
    console.log('   1. Review generated type definitions');
    console.log('   2. Run: npm run typecheck to verify fixes');
    console.log('   3. Run: npm run lint:fix for code quality');
    console.log('   4. Address high-priority suggestions manually');

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesWithIssues: this.typeIssues.size,
        totalIssues,
        missingTypes: this.missingTypes.size,
        suggestions: this.suggestions.length,
      },
      issues: Object.fromEntries(this.typeIssues),
      missingTypes: Array.from(this.missingTypes),
      suggestions: this.suggestions,
      categoryBreakdown: categoryCount,
    };

    writeFileSync(
      join(projectRoot, 'type-analysis-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Detailed report saved to: type-analysis-report.json');
  }
}

// CLI interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔬 Advanced Type Analyzer Usage:

  npm run type:analyze             # Run complete type analysis
  npm run type:analyze --help      # Show this help

The analyzer will:
1. Run TypeScript compiler to detect type errors
2. Categorize and analyze error patterns
3. Generate intelligent type definitions
4. Provide actionable suggestions
5. Create detailed analysis report
`);
  process.exit(0);
}

const analyzer = new TypeAnalyzer();
analyzer.analyze().catch(error => {
  console.error(`❌ Type analysis failed: ${error.message}`);
  process.exit(1);
});
