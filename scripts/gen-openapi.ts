// Writes the OpenAPI spec to openapi.json without starting the server or
// touching the database. Uses Nest's `preview` mode so the provider graph is
// built for introspection only (no DB connection, no lifecycle hooks).
// Run: npm run openapi:gen
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  app.setGlobalPrefix('api');

  // Same document config as configureSwagger() in src/main.ts.
  const config = new DocumentBuilder()
    .setTitle('Coinzu API')
    .setDescription('Coinzu backend API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${Object.keys(document.paths ?? {}).length} paths)`);
  await app.close();
}

void generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
