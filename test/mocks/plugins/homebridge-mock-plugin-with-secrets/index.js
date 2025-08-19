module.exports = (api) => {
  api.registerPlatform('MockPluginWithSecrets', MockPlatform);
};

class MockPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    
    this.log.info('Mock Plugin With Secrets initialized');
    
    // In a real plugin, secrets would be accessed through the secrets API
    // For testing purposes, we just log that the plugin was configured
    if (config.apiKey) {
      this.log.info('API Key is configured (secret)');
    }
    if (config.password) {
      this.log.info('Password is configured (secret)');
    }
  }
  
  configureAccessory(accessory) {
    // Mock implementation
  }
}