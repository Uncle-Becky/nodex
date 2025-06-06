import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  css: {
    postcss: './postcss.config.js',
  },

  // Build configuration optimized for advanced agent system
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate chunks for better loading performance
          'react-vendor': ['react', 'react-dom'],
          'flow-vendor': ['@xyflow/react'],
          'agent-core': [
            './src/agents/AgentBase.ts',
            './src/managers/AgentManager.ts',
            './src/utils/EventBus.ts',
          ],
        },
      },
    },
  },

  // Worker configuration for agent system
  worker: {
    format: 'es',
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    // Enable HTTPS for advanced features if needed
    // https: true
  },

  // Optimizations for dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@xyflow/react', 'zustand'],
    // Exclude worker files from pre-bundling
    exclude: ['./src/workers/*'],
  },

  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __AGENT_SYSTEM_VERSION__: JSON.stringify(
      process.env.npm_package_version || '1.0.0'
    ),
  },

  // Enable advanced features
  esbuild: {
    target: 'esnext',
    // Keep class names for agent reflection
    keepNames: true,
  },
});
