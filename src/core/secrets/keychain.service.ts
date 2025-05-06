import { Injectable, Logger } from "@nestjs/common";
import { KeyChain, KeyChainFactory } from "./keychain";
import * as configConstants from "../config/config.vars";

@Injectable()
export class KeyChainService implements KeyChain {
  private readonly keychain: KeyChain;

  constructor(private readonly logger: Logger) {
    // Initialize a KeyChain instance
    // Uses bridge pin for deterministic unique salt if InternalKeyChain is used
    this.keychain = KeyChainFactory.getKeyChain(
      "homebridge",
      configConstants.getStoragePath()
    );
  }

  /**
   * Create a new key for the given plugin name
   * @param pluginName - The name of the plugin for which to create a key
   * @returns A Buffer containing the key
   * @throws Error if the key cannot be created
   */
  public createKey(pluginName?: string): Buffer {
    try {
      return this.keychain.createKey(pluginName);
    } catch (error) {
      this.logger.error(
        `Failed to create key for plugin: ${pluginName}`,
        error
      );
      throw new Error(
        `Failed to create key for plugin: ${pluginName} due to error: ${error.message}`
      );
    }
  }

  /**
   * Get the key for the given plugin name
   * @param pluginName - The name of the plugin for which get the key
   * @returns A Buffer containing the key
   * @throws Error if the key cannot be retrieved
   */
  public getKey(pluginName?: string): Buffer | null {
    try {
      return this.keychain.getKey(pluginName);
    } catch (error) {
      this.logger.error(`Failed to get key for plugin: ${pluginName}`, error);
      throw new Error(
        `Failed to get key for plugin: ${pluginName} due to error: ${error.message}`
      );
    }
  }

  /**
   * Delete the key for the given plugin name
   * @param pluginName - The name of the plugin for which to delete the key
   * @throws Error if the key cannot be deleted
   */
  public deleteKey(pluginName?: string): void {
    try {
      this.keychain.deleteKey(pluginName);
    } catch (error) {
      this.logger.error(
        `Failed to delete key for plugin: ${pluginName}`,
        error
      );
      throw new Error(
        `Failed to delete key for plugin: ${pluginName} due to error: ${error.message}`
      );
    }
  }
}
