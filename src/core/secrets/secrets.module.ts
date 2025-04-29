import { Logger, Module } from "@nestjs/common";
import { KeyChainService } from "./keychain.service";
import { SecretStoreService } from "./secret-store.service";

@Module({
  providers: [Logger, SecretStoreService, KeyChainService],
  exports: [SecretStoreService, KeyChainService],
})
export class SecretsModule {}
