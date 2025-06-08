import express, { Express, Request, Response } from 'express';
import mcpRoutes from './routes/mcpRoutes';
// import dotenv from 'dotenv'; // Consider adding for env management

// dotenv.config(); // if using .env files

const app: Express = express();
const PORT = process.env.MCP_SERVER_PORT || 3001; // Example port

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CORS (consider more specific configuration for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('MCP Server is running!');
});

app.use('/api/mcp', mcpRoutes);

// Error handling middleware (basic example)
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server listening on port ${PORT}`);
});

export default app; // Export for potential testing
