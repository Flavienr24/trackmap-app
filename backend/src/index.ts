import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import productsRoutes from './routes/products';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'trackmap-backend'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed', { error });
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/products', productsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();