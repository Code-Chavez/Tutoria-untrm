import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './infrastructure/config/env';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import routes from './interfaces/http/routes';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
