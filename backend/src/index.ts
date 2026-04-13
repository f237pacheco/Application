import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { paymentsRouter } from './routes/payments';
import { servicesRouter } from './routes/services';
import { partnerRouter } from './routes/partner';
import { webhooksRouter } from './routes/webhooks';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/requireAuth';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Raw body for Stripe webhooks (must come before express.json)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// JSON body parsing
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);

// Protected routes
app.use('/api/payments', requireAuth, paymentsRouter);
app.use('/api/services', requireAuth, servicesRouter);
app.use('/api/partner', requireAuth, partnerRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Velona backend running on port ${PORT}`);
});

export default app;
