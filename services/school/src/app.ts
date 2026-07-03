import express from 'express';
import schoolRoutes from './routes/school.routes';

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/schools', schoolRoutes);

export { app };
