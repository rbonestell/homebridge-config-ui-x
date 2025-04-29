import { Module } from "@nestjs/common";

import { ConfigService } from "./config.service";
import { SecretsModule } from "../secrets/secrets.module";

@Module({
  imports: [SecretsModule],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
