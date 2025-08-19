import { Logger, Module } from '@nestjs/common';
import { SecretsModule as CoreSecretsModule } from '../../core/secrets/secrets.module';
import { SecretsController } from './secrets.controller';

@Module({
  imports: [CoreSecretsModule],
  controllers: [SecretsController],
  providers: [Logger],
})
export class SecretsModule {}