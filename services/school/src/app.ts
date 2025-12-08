import express from 'express';
import schoolRoutes from './routes/school.routes';

const app = express();
app.use(express.json());

// Routes
app.use('/api/schools', schoolRoutes);

export { app };
