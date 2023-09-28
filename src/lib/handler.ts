import {
  CrudFailureReason,
  DbOperations,
  PrismaErrorCode,
  ZodSchemas,
  isPrismaClientKnownRequestError,
  isPrismaClientUnknownRequestError,
  isPrismaClientValidationError,
  DbClientContract,
  ModelMeta,
  getDefaultModelMeta, getDefaultZodSchemas,
} from '@zenstackhq/runtime';
import SuperJSON from 'superjson';
import { upperCaseFirst } from 'upper-case-first';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { NextApiRequest, NextApiResponse } from 'next';
import { PagesRouteRequestHandlerOptions } from '@zenstackhq/server/next';
import { AdapterBaseOptions, Response } from '@zenstackhq/server/types';

export function loadAssets(options: AdapterBaseOptions) {
  // model metadata
  const modelMeta = options.modelMeta ?? getDefaultModelMeta(options.loadPath);

  // zod schemas
  let zodSchemas: ZodSchemas | undefined;
  if (typeof options.zodSchemas === 'object') {
    zodSchemas = options.zodSchemas;
  } else if (options.zodSchemas === true) {
    zodSchemas = getDefaultZodSchemas(options.loadPath);
    if (!zodSchemas) {
      throw new Error('Unable to load zod schemas from default location');
    }
  }

  return { modelMeta, zodSchemas };
}

/**
 * API request context
 */
export type RequestContext = {
  /**
   * The PrismaClient instance
   */
  prisma: DbClientContract;

  /**
   * The HTTP method
   */
  method: string;

  /**
   * The request endpoint path (excluding any prefix)
   */
  path: string;

  /**
   * The query parameters
   */
  query?: Record<string, string | string[]>;

  /**
   * The request body object
   */
  requestBody?: unknown;

  /**
   * Model metadata. By default loaded from the @see loadPath path. You can pass
   * it in explicitly to override.
   */
  modelMeta?: ModelMeta;

  /**
   * Zod schemas for validating create and update payloads. By default loaded from
   * the @see loadPath path. You can pass it in explicitly to override.
   */
  zodSchemas?: ZodSchemas;
};

/**
 * Base class for API handlers
 */
export abstract class APIHandlerBase {
  // model meta loaded from default location
  protected readonly defaultModelMeta: ModelMeta | undefined;

  constructor() {
    try {
      this.defaultModelMeta = getDefaultModelMeta(undefined);
    } catch {
      // noop
    }
  }
}


const ERROR_STATUS_MAPPING: Record<string, number> = {
  [PrismaErrorCode.CONSTRAINED_FAILED]: 403,
  [PrismaErrorCode.REQUIRED_CONNECTED_RECORD_NOT_FOUND]: 404,
  [PrismaErrorCode.DEPEND_ON_RECORD_NOT_FOUND]: 404,
};

export interface ExtendedRequestContext extends RequestContext {
  req: NextApiRequest;
  res: NextApiResponse;
}

export function logError(message: string, code?: string) {
  console.error(`@zenstackhq/server: error ${code ? '[' + code + ']' : ''}, ${message}`);
}

/**
 * Prisma RPC style API request handler that mirrors the Prisma Client API
 */
class RequestHandler extends APIHandlerBase {
  async handleRequest({
    req,
    res,
    prisma,
    method,
    path,
    query,
    requestBody,
    modelMeta,
    zodSchemas,
  }: ExtendedRequestContext): Promise<Response> {
    modelMeta = modelMeta ?? this.defaultModelMeta;
    if (!modelMeta) {
      throw new Error('Model metadata is not provided or loaded from default location');
    }

    const parts = path.split('/').filter((p) => !!p);
    const op = parts.pop();
    const model = parts.pop();

    if (parts.length !== 0 || !op || !model) {
      return { status: 400, body: this.makeError('invalid request path') };
    }

    method = method.toUpperCase();
    const dbOp = op as keyof DbOperations;
    let args: unknown;
    let resCode = 200;

    switch (dbOp) {
      case 'create':
      case 'createMany':
      case 'upsert':
        if (method !== 'POST') {
          return {
            status: 400,
            body: this.makeError('invalid request method, only POST is supported'),
          };
        }
        if (!requestBody) {
          return { status: 400, body: this.makeError('missing request body') };
        }

        args = requestBody;

        // TODO: upsert's status code should be conditional
        resCode = 201;
        break;

      case 'findFirst':
      case 'findUnique':
      case 'findMany':
      case 'aggregate':
      case 'groupBy':
      case 'count':
        if (method !== 'GET') {
          return {
            status: 400,
            body: this.makeError('invalid request method, only GET is supported'),
          };
        }
        try {
          args = query?.q ? this.unmarshalQ(query.q as string, query.meta as string | undefined) : {};
        } catch {
          return { status: 400, body: this.makeError('invalid "q" query parameter') };
        }
        break;

      case 'update':
      case 'updateMany':
        if (method !== 'PUT' && method !== 'PATCH') {
          return {
            status: 400,
            body: this.makeError('invalid request method, only PUT AND PATCH are supported'),
          };
        }
        if (!requestBody) {
          return { status: 400, body: this.makeError('missing request body') };
        }

        args = requestBody;
        break;

      case 'delete':
      case 'deleteMany':
        if (method !== 'DELETE') {
          return {
            status: 400,
            body: this.makeError('invalid request method, only DELETE is supported'),
          };
        }
        try {
          args = query?.q ? this.unmarshalQ(query.q as string, query.meta as string | undefined) : {};
        } catch {
          return { status: 400, body: this.makeError('invalid "q" query parameter') };
        }
        break;

      default:
        return { status: 400, body: this.makeError('invalid operation: ' + op) };
    }

    const { error, zodErrors, data: parsedArgs } = await this.processRequestPayload(args, model, dbOp, zodSchemas);
    if (error) {
      return { status: 400, body: this.makeError(error, CrudFailureReason.DATA_VALIDATION_VIOLATION, zodErrors) };
    }

    try {
      if (!prisma[model]) {
        return { status: 400, body: this.makeError(`unknown model name: ${model}`) };
      }

      const result = await prisma[model][dbOp](parsedArgs);

      let response: any = { data: result };

      // superjson serialize response
      if (result) {
        const { json, meta } = SuperJSON.serialize(result);
        response = { data: json };
        if (meta) {
          response.meta = { serialization: meta };
        }
      }

      return { status: resCode, body: response };
    } catch (err) {
      if (isPrismaClientKnownRequestError(err)) {
        const status = ERROR_STATUS_MAPPING[err.code] ?? 400;

        const { error } = this.makeError(err.message, err.meta?.reason as string, err.meta?.zodErrors as ZodError);
        return {
          status,
          body: {
            error: {
              ...error,
              prisma: true,
              code: err.code,
            },
          },
        };
      } else if (isPrismaClientUnknownRequestError(err) || isPrismaClientValidationError(err)) {
        logError(err.message);
        return {
          status: 400,
          body: {
            error: {
              prisma: true,
              message: err.message,
            },
          },
        };
      } else {
        const _err = err as Error;
        logError(_err.message + (_err.stack ? '\n' + _err.stack : ''));
        return {
          status: 400,
          body: this.makeError((err as Error).message),
        };
      }
    }
  }

  private makeError(message: string, reason?: string, zodErrors?: ZodError) {
    const error: any = { message, reason };
    if (reason === CrudFailureReason.ACCESS_POLICY_VIOLATION || reason === CrudFailureReason.RESULT_NOT_READABLE) {
      error.rejectedByPolicy = true;
    }
    if (reason === CrudFailureReason.DATA_VALIDATION_VIOLATION) {
      error.rejectedByValidation = true;
    }
    if (zodErrors) {
      error.zodErrors = zodErrors;
    }
    return { error };
  }

  private async processRequestPayload(args: any, model: string, dbOp: string, zodSchemas: ZodSchemas | undefined) {
    const { meta, ...rest } = args;
    if (meta?.serialization) {
      // superjson deserialization
      args = SuperJSON.deserialize({ json: rest, meta: meta.serialization });
    }
    return this.zodValidate(zodSchemas, model, dbOp as keyof DbOperations, args);
  }

  private getZodSchema(zodSchemas: ZodSchemas, model: string, operation: keyof DbOperations) {
    // e.g.: UserInputSchema { findUnique: [schema] }
    return zodSchemas.input?.[`${upperCaseFirst(model)}InputSchema`]?.[operation];
  }

  private zodValidate(zodSchemas: ZodSchemas | undefined, model: string, operation: keyof DbOperations, args: unknown) {
    const zodSchema = zodSchemas && this.getZodSchema(zodSchemas, model, operation);
    if (zodSchema) {
      const parseResult = zodSchema.safeParse(args);
      if (parseResult.success) {
        return { data: args };
      } else {
        return {
          error: fromZodError((parseResult as any).error).message,
          zodErrors: (parseResult as any).error,
        };
      }
    } else {
      return { data: args };
    }
  }

  private unmarshalQ(value: string, meta: string | undefined) {
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      throw new Error('invalid "q" query parameter');
    }

    if (meta) {
      let parsedMeta: any;
      try {
        parsedMeta = JSON.parse(meta);
      } catch {
        throw new Error('invalid "meta" query parameter');
      }

      if (parsedMeta.serialization) {
        return SuperJSON.deserialize({ json: parsedValue, meta: parsedMeta.serialization });
      }
    }

    return parsedValue;
  }
}

export function makeHandler() {
  const handler = new RequestHandler();
  return handler.handleRequest.bind(handler);
}

export function NextHandler(
  options: PagesRouteRequestHandlerOptions,
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const { modelMeta, zodSchemas } = loadAssets(options);

  const requestHandler = makeHandler();
  if (options.useSuperJson !== undefined) {
    console.warn(
      'The option "useSuperJson" is deprecated. The server APIs automatically use superjson for serialization.',
    );
  }

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const prisma = (await options.getPrisma(req, res)) as DbClientContract;
    if (!prisma) {
      res.status(500).json({ message: 'unable to get prisma from request context' });
      return;
    }

    if (!req.query.path) {
      res.status(400).json({ message: 'missing path parameter' });
      return;
    }
    const path = (req.query.path as string[]).join('/');

    try {
      const r = await requestHandler({
        req,
        res,
        method: req.method!,
        path,
        query: req.query as Record<string, string | string[]>,
        requestBody: req.body,
        prisma,
        modelMeta,
        zodSchemas
      });
      res.status(r.status).send(r.body);
    } catch (err) {
      res.status(500).send({ message: `An unhandled error occurred: ${err}` });
    }
  };
}
