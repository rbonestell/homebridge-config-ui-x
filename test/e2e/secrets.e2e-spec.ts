import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { TestingModule } from '@nestjs/testing';

import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SecretsModule } from '../../src/modules/secrets/secrets.module';
import { AdminGuard } from '../../src/core/auth/guards/admin.guard';
import { TestAdminGuard } from '../mocks/test-admin.guard';
import { setHomebridgeTestEnvValues } from './utils/test-setup';

describe('Secrets API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Set up test environment
    await setHomebridgeTestEnvValues();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SecretsModule],
    })
      .overrideGuard(AdminGuard)
      .useClass(TestAdminGuard)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        skipMissingProperties: false,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(async () => {
    // No authentication needed with mocked AdminGuard
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/secrets (POST)', () => {
    it('should store a homebridge-level secret', async () => {
      const response = await app.inject({
        method: 'POST',
        path: '/api/secrets/test-secret',
        payload: { value: 'secret-value' }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: 'Secret stored successfully',
      });
    });

    it('should store a plugin-specific secret', async () => {
      const response = await app.inject({
        method: 'POST',
        path: '/api/secrets/test-plugin/api-key',
        payload: { value: 'plugin-secret-value' }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: 'Secret stored successfully',
      });
    });

    it('should accept authenticated requests with mocked guard', async () => {
      const response = await app.inject({
        method: 'POST',
        path: '/api/secrets/test-secret-auth',
        payload: { value: 'secret-value' }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: 'Secret stored successfully',
      });
    });

    it('should reject requests without value', async () => {
      const response = await app.inject({
        method: 'POST',
        path: '/api/secrets/test-secret',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('/api/secrets (GET)', () => {
    beforeAll(async () => {
      // Store a test secret
      await app.inject({
        method: 'POST',
        path: '/api/secrets/test-plugin/api-key',
        payload: { value: 'stored-secret-value' }
      });
    });

    it('should retrieve a stored secret', async () => {
      const response = await app.inject({
        method: 'GET',
        path: '/api/secrets/test-plugin/api-key',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        value: 'stored-secret-value',
      });
    });

    it('should return not found for non-existent secret', async () => {
      const response = await app.inject({
        method: 'GET',
        path: '/api/secrets/test-plugin/non-existent',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        message: 'Secret not found',
      });
    });

    it('should handle requests with mocked authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        path: '/api/secrets/test-plugin/non-existent-key'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        message: 'Secret not found',
      });
    });
  });

  describe('/api/secrets (DELETE)', () => {
    beforeAll(async () => {
      // Store a test secret
      await app.inject({
        method: 'POST',
        path: '/api/secrets/test-plugin/api-key',
        payload: { value: 'stored-secret-value' }
      });
    });

    it('should delete a stored secret', async () => {
      const response = await app.inject({
        method: 'DELETE',
        path: '/api/secrets/test-plugin/api-key',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: 'Secret deleted successfully',
      });

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        path: '/api/secrets/test-plugin/api-key',
      });

      expect(getResponse.statusCode).toBe(200);
      expect(JSON.parse(getResponse.body).success).toBe(false);
    });

    it('should handle delete requests with mocked authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        path: '/api/secrets/test-plugin/non-existent-key'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: 'Secret deleted successfully',
      });
    });
  });

  describe('Plugin Configuration Integration', () => {
    it.skip('should handle plugin config with secret fields (requires config-editor module)', async () => {
      // This test is skipped because it requires the config-editor module
      // which is not imported in this minimal test setup
    });
  });
});