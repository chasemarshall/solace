import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withErrorHandling, validateEnvVars, validateRequestBody } from '@/lib/api/errorHandler';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: any, init?: any) => ({
      data,
      status: init?.status || 200,
      headers: new Headers(),
    })),
  },
}));

describe('errorHandler utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateEnvVars', () => {
    it('should not throw when all variables are defined', () => {
      expect(() => {
        validateEnvVars({
          VAR1: 'value1',
          VAR2: 'value2',
          VAR3: 'value3',
        });
      }).not.toThrow();
    });

    it('should throw when one variable is missing', () => {
      expect(() => {
        validateEnvVars({
          VAR1: 'value1',
          VAR2: undefined,
        });
      }).toThrow('Missing required environment variables: VAR2');
    });

    it('should throw when multiple variables are missing', () => {
      expect(() => {
        validateEnvVars({
          VAR1: 'value1',
          VAR2: undefined,
          VAR3: undefined,
        });
      }).toThrow('Missing required environment variables: VAR2, VAR3');
    });

    it('should throw error with statusCode 500', () => {
      try {
        validateEnvVars({
          MISSING_VAR: undefined,
        });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toContain('MISSING_VAR');
      }
    });

    it('should handle all variables missing', () => {
      expect(() => {
        validateEnvVars({
          VAR1: undefined,
          VAR2: undefined,
        });
      }).toThrow('Missing required environment variables: VAR1, VAR2');
    });

    it('should handle empty object', () => {
      expect(() => {
        validateEnvVars({});
      }).not.toThrow();
    });

    it('should treat empty string as missing', () => {
      expect(() => {
        validateEnvVars({
          VAR1: '',
        });
      }).toThrow('Missing required environment variables: VAR1');
    });
  });

  describe('validateRequestBody', () => {
    it('should not throw when all required fields are present', () => {
      const body = {
        field1: 'value1',
        field2: 'value2',
        field3: 123,
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2', 'field3']);
      }).not.toThrow();
    });

    it('should throw when one field is missing', () => {
      const body = {
        field1: 'value1',
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2']);
      }).toThrow('Missing required fields: field2');
    });

    it('should throw when multiple fields are missing', () => {
      const body = {
        field1: 'value1',
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2', 'field3']);
      }).toThrow('Missing required fields: field2, field3');
    });

    it('should throw when field is undefined', () => {
      const body = {
        field1: 'value1',
        field2: undefined,
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2']);
      }).toThrow('Missing required fields: field2');
    });

    it('should throw when field is null', () => {
      const body = {
        field1: 'value1',
        field2: null,
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2']);
      }).toThrow('Missing required fields: field2');
    });

    it('should throw when field is empty string', () => {
      const body = {
        field1: 'value1',
        field2: '',
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2']);
      }).toThrow('Missing required fields: field2');
    });

    it('should throw error with statusCode 400', () => {
      try {
        validateRequestBody({ field1: 'value' }, ['field1', 'field2']);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('field2');
      }
    });

    it('should accept 0 as valid value', () => {
      const body = {
        field1: 0,
        field2: false,
      };

      expect(() => {
        validateRequestBody(body, ['field1', 'field2']);
      }).not.toThrow();
    });

    it('should accept boolean false as valid value', () => {
      const body = {
        isActive: false,
      };

      expect(() => {
        validateRequestBody(body, ['isActive']);
      }).not.toThrow();
    });

    it('should handle empty required array', () => {
      const body = { field1: 'value' };

      expect(() => {
        validateRequestBody(body, []);
      }).not.toThrow();
    });
  });

  describe('withErrorHandling', () => {
    it('should return success response when handler succeeds', async () => {
      const mockHandler = vi.fn(async () => ({ success: true, data: 'test' }));

      const response = await withErrorHandling(mockHandler, 'Test error');

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual({ success: true, data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should return error response when handler throws Error', async () => {
      const mockHandler = vi.fn(async () => {
        throw new Error('Test error message');
      });

      const response = await withErrorHandling(mockHandler, 'Operation failed');

      expect(response.data).toEqual({
        error: 'Operation failed',
        details: 'Test error message',
      });
      expect(response.status).toBe(500);
    });

    it('should return error response when handler throws non-Error', async () => {
      const mockHandler = vi.fn(async () => {
        throw 'String error';
      });

      const response = await withErrorHandling(mockHandler, 'Operation failed');

      expect(response.data).toEqual({
        error: 'Operation failed',
        details: 'Unknown error',
      });
      expect(response.status).toBe(500);
    });

    it('should use custom status code from error object', async () => {
      const mockHandler = vi.fn(async () => {
        throw Object.assign(new Error('Not found'), { statusCode: 404 });
      });

      const response = await withErrorHandling(mockHandler, 'Resource not found');

      expect(response.data).toEqual({
        error: 'Resource not found',
        details: 'Not found',
      });
      expect(response.status).toBe(404);
    });

    it('should handle validation errors with custom status code', async () => {
      const mockHandler = vi.fn(async () => {
        throw Object.assign(new Error('Invalid input'), { statusCode: 400 });
      });

      const response = await withErrorHandling(mockHandler, 'Validation failed');

      expect(response.data).toEqual({
        error: 'Validation failed',
        details: 'Invalid input',
      });
      expect(response.status).toBe(400);
    });

    it('should handle errors with non-number statusCode', async () => {
      const mockHandler = vi.fn(async () => {
        throw Object.assign(new Error('Error'), { statusCode: 'not-a-number' });
      });

      const response = await withErrorHandling(mockHandler, 'Operation failed');

      // Should default to 500 when statusCode is not a number
      expect(response.status).toBe(500);
    });

    it('should preserve error details in response', async () => {
      const detailedError = new Error('Detailed error with stack trace');
      const mockHandler = vi.fn(async () => {
        throw detailedError;
      });

      const response = await withErrorHandling(mockHandler, 'Failed to process');

      expect(response.data.details).toBe('Detailed error with stack trace');
    });

    it('should handle async operations correctly', async () => {
      const mockHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { asyncResult: true };
      });

      const response = await withErrorHandling(mockHandler, 'Async operation failed');

      expect(response.data).toEqual({ asyncResult: true });
      expect(response.status).toBe(200);
    });
  });

  describe('integration', () => {
    it('should handle validateEnvVars errors in withErrorHandling', async () => {
      const mockHandler = vi.fn(async () => {
        validateEnvVars({
          REQUIRED_VAR: undefined,
        });
        return { success: true };
      });

      const response = await withErrorHandling(mockHandler, 'Configuration error');

      expect(response.data.error).toBe('Configuration error');
      expect(response.data.details).toContain('REQUIRED_VAR');
      expect(response.status).toBe(500);
    });

    it('should handle validateRequestBody errors in withErrorHandling', async () => {
      const mockHandler = vi.fn(async () => {
        validateRequestBody({ field1: 'value' }, ['field1', 'field2']);
        return { success: true };
      });

      const response = await withErrorHandling(mockHandler, 'Invalid request');

      expect(response.data.error).toBe('Invalid request');
      expect(response.data.details).toContain('field2');
      expect(response.status).toBe(400);
    });
  });
});
