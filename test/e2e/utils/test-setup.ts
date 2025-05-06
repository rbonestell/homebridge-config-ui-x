import { copy } from "fs-extra";
import { resolve } from "node:path/posix";

export async function setHomebridgeTestEnvValues() {
  try {
    process.env.UIX_BASE_PATH = resolve(__dirname, "../../");
    process.env.UIX_STORAGE_PATH = resolve(__dirname, "../", ".homebridge");
    process.env.UIX_CONFIG_PATH = resolve(
      process.env.UIX_STORAGE_PATH,
      "config.json"
    );

    let authFilePath = resolve(process.env.UIX_STORAGE_PATH, "auth.json");
    let secretsFilePath = resolve(process.env.UIX_STORAGE_PATH, "secrets.json");
    let legacySecretsFilePath = resolve(
      process.env.UIX_STORAGE_PATH,
      ".uix-secrets"
    );

    // Setup test package file
    await copy(
      resolve(__dirname, "../../../", "package.json"),
      resolve(process.env.UIX_BASE_PATH, "package.json")
    );

    // Setup test config
    await copy(
      resolve(__dirname, "../../mocks", "config.json"),
      process.env.UIX_CONFIG_PATH
    );

    // Setup test secrets file
    await copy(
      resolve(__dirname, "../../mocks", "secrets.json"),
      secretsFilePath
    );

    // Setup test auth file
    await copy(resolve(__dirname, "../../mocks", "auth.json"), authFilePath);
    await copy(
      resolve(__dirname, "../../mocks", ".uix-secrets"),
      legacySecretsFilePath
    );

    process.env.UIX_INSECURE_MODE = "1";
  } catch (error) {
    console.error("Error setting up test environment:", error);
    throw error;
  }
}
