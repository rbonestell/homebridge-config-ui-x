import { Logger, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { ConfigModule } from "../config/config.module";
import { ConfigService } from "../config/config.service";
import { LoggerModule } from "../logger/logger.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./guards/admin.guard";
import { WsAdminGuard } from "./guards/ws-admin-guard";
import { WsGuard } from "./guards/ws.guard";
import { JwtStrategy } from "./jwt.strategy";
import { SecretStoreService } from "../secrets/secret-store.service";
import { SecretsModule } from "../secrets/secrets.module";
import { KeyChainService } from "../secrets/keychain.service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule, SecretsModule, LoggerModule],
      useFactory: async (
        configService: ConfigService,
        secretStoreService: SecretStoreService
      ) => ({
        secret: secretStoreService.getSecret("JwtSecretKey"),
        signOptions: {
          expiresIn: configService.ui.sessionTimeout,
        },
      }),
      inject: [ConfigService, SecretStoreService, KeyChainService],
    }),
    SecretsModule,
    ConfigModule,
    LoggerModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    WsGuard,
    WsAdminGuard,
    AdminGuard,
    SecretStoreService,
    KeyChainService,
    Logger,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
