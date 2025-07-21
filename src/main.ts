import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { envs } from './configs/envs.config';
import { auth0 } from './configs/auth0.config';
import { auth } from 'express-openid-connect';
import { setupSwagger } from './configs/swagger.config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    if (envs.node !== 'test') {
      app.use(auth(auth0));
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    setupSwagger(app);

    await app.listen(envs.server.port);
    console.log(
      `🚀 App running on http://${envs.server.host}:${envs.server.port}/api`,
    );
  } catch (err) {
    console.error('❌ Error during bootstrap:', err);
    process.exit(1);
  }
}
void bootstrap();
