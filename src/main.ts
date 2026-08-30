// Loads .env before any module reads process.env.
import 'dotenv/config';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Env, logEnvAvailability } from './common/config/env';

const BODY_LIMIT = '10mb';
const API_PREFIX = 'api';

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const CORS_HEADERS = ['Content-Type', 'Authorization'];
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const logger = new Logger('Bootstrap');

const stripTrailingSlash = (value: string) => value.trim().replace(/\/$/, '');

/** Allowed origins from FRONTEND_URL + CORS_ORIGINS. */
function allowedOrigins(): Set<string> {
  const configured = Env.corsOrigins.split(',');
  const origins = new Set(
    [Env.urls.frontend, ...configured].map(stripTrailingSlash).filter(Boolean),
  );
  if (!Env.isProduction) DEV_ORIGINS.forEach((origin) => origins.add(origin));
  return origins;
}

function configureCors(app: INestApplication): void {
  const exact = allowedOrigins();
  logger.log(`CORS: ${[...exact].join(', ') || '(none)'}`);

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (curl, mobile) send no Origin.
      if (!origin) return cb(null, true);
      cb(null, exact.has(stripTrailingSlash(origin)));
    },
    methods: CORS_METHODS,
    allowedHeaders: CORS_HEADERS,
    credentials: true,
  });
}

function configureSwagger(app: INestApplication): void {
  if (Env.isProduction) return;
  const config = new DocumentBuilder()
    .setTitle('Coinzu API')
    .setDescription('Coinzu backend API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
  logger.log(`Swagger UI at /${API_PREFIX}/docs`);
}

async function bootstrap(): Promise<void> {
  logEnvAvailability();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.use(compression());
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  configureCors(app);
  configureSwagger(app);
  app.enableShutdownHooks();

  await app.listen(Env.port);
  logger.log(`coinzu-backend listening on :${Env.port} (${Env.nodeEnv})`);
}

void bootstrap();
