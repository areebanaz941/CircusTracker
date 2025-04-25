// api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../routes';
import serverless from 'serverless-http';

// Create Express app
const app = express();
app.use(express.json());

// Register all routes from your existing implementation
registerRoutes(app);

// Create serverless handler
const handler = serverless(app);

// Export the serverless handler
export default async function(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}