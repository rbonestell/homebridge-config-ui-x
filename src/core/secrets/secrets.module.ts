import { Module } from "@nestjs/common";
import { KeyChainService } from "./keychain.service";
import { SecretStoreService } from "./secret-store.service";

@Module({
  providers: [SecretStoreService, KeyChainService],
  exports: [SecretStoreService, KeyChainService],
})
export class SecretsModule {}
