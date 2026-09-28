import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

// Swagger-only: documents the { success, data } envelope the interceptor adds, so generated clients get real types.
export function ApiData(model: Type<unknown>, status = 200) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}

export function ApiList(model: Type<unknown> | 'string', status = 200) {
  const items =
    model === 'string' ? { type: 'string' } : { $ref: getSchemaPath(model) };
  return applyDecorators(
    ...(model === 'string' ? [] : [ApiExtraModels(model)]),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['data', 'total'],
            properties: {
              data: { type: 'array', items },
              total: { type: 'integer' },
            },
          },
        },
      },
    }),
  );
}

// A `{ [key]: model[] }` payload, for grouped lookups whose keys are data (dropdown types).
export function ApiGrouped(model: Type<unknown>, status = 200) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            additionalProperties: { type: 'array', items: { $ref: getSchemaPath(model) } },
          },
        },
      },
    }),
  );
}
