import { homedir } from "node:os";
import { resolve } from "node:path/posix";

export const getConfigPath = () => {
  return (
    process.env.UIX_CONFIG_PATH || resolve(homedir(), ".homebridge/config.json")
  );
};

export const getStoragePath = () => {
  return process.env.UIX_STORAGE_PATH || resolve(homedir(), ".homebridge");
};

export const getCustomPluginPath = () => {
  return process.env.UIX_CUSTOM_PLUGIN_PATH;
};

export const getStrictPluginResolution = () => {
  return process.env.UIX_STRICT_PLUGIN_RESOLUTION === "1";
};

/**
 * Legacy secrets storage path, for backwards compatibility
 * @deprecated Secrets should be stored using SecretStoreService
 */
export const getUIXSecretsFilePath = () =>
  resolve(getStoragePath(), ".uix-secrets");

export const getAuthFilePath = () => resolve(getStoragePath(), "auth.json");

export const getAccessoryLayoutPath = () =>
  resolve(getStoragePath(), "accessories", "uiAccessoriesLayout.json");

export const getConfigBackupPath = () =>
  resolve(getStoragePath(), "backups/config-backups");

export const getInstanceBackupPath = () =>
  resolve(getStoragePath(), "backups/instance-backups");

export const homebridgeInsecureMode = () =>
  Boolean(process.env.UIX_INSECURE_MODE === "1");
