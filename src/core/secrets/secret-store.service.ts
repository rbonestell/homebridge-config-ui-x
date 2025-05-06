import { Injectable, Logger } from "@nestjs/common";
import { resolve } from "node:path/posix";
import { KeyChainService } from "./keychain.service";
import { SecretStore } from "./secret-store";
import * as configConstants from "../config/config.vars";

@Injectable()
export class SecretStoreService {
  constructor(
    private readonly keyChainService: KeyChainService,
    private readonly logger: Logger
  ) {}

  /**
   * Store a secret value under this plugin
   */
  public setSecret(
    secretName: string,
    plaintextValue: string,
    pluginName?: string
  ): void {
    try {
      // Determine storage path for secrets
      const secretStore = this.getSecretStore(pluginName);

      // Set the secret value
      secretStore.setSecret(secretName, plaintextValue);
    } catch (error) {
      this.logger.error(
        `Failed to set secret ${secretName}: ${error.message}`,
        error.stack,
        SecretStoreService.name
      );
      throw error;
    }
  }

  /**
   * Load a secret value under this plugin
   */
  public getSecret(secretName: string, pluginName?: string): string | null {
    try {
      // Determine storage path for secrets
      const secretStore = this.getSecretStore(pluginName);

      // Get the secret value
      return secretStore.getSecret(secretName);
    } catch (error) {
      this.logger.error(
        `Failed to get secret ${secretName}: ${error.message}`,
        error.stack,
        SecretStoreService.name
      );
      throw error;
    }
  }

  /**
   * Delete a secret value under this plugin
   */
  public deleteSecret(secretName: string, pluginName?: string): void {
    try {
      // Determine storage path for secrets
      const secretStore = this.getSecretStore(pluginName);

      // Delete the secret
      secretStore.deleteSecret(secretName);
    } catch (error) {
      this.logger.error(
        `Failed to delete secret ${secretName}: ${error.message}`,
        error.stack,
        SecretStoreService.name
      );
      throw error;
    }
  }

  /**
   * Get a SecretStore instance specific to a plugin
   * or Hombebridge system-level if no plugin name is provided
   * @param pluginName - The name of the plugin for which to initialize the secret store
   * @returns A SecretStore instance
   */
  private getSecretStore(pluginName?: string) {
    const persistPath = pluginName
      ? resolve(configConstants.getStoragePath(), "persist")
      : configConstants.getStoragePath();

    // Initialize SecretStore instance
    const secretStore = new SecretStore(
      this.keyChainService,
      persistPath,
      "homebridge",
      pluginName
    );
    return secretStore;
  }
}
