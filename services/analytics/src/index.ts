import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Database } from './config/database';
import { RedisCache } from './config/redis';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { createAnalyticsRoutes } from './routes/analytics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Initialize dependencies
const database = new Database();
const cache = new RedisCache();
const repository = new AnalyticsRepository(database);
const service = new AnalyticsService(repository, cache);
const controller = new AnalyticsController(service);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/analytics', limiter);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics', timestamp: new Date() });
});

app.use('/api/analytics', createAnalyticsRoutes(controller));

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Analytics service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.end();
  process.exit(0);
});
