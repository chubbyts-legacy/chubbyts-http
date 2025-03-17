import { createReadStream, existsSync } from 'fs';
import type { Duplex, Stream } from 'stream';
import { PassThrough } from 'stream';
import type { Method, Query, Request, Response, ServerRequest, Uri } from '@chubbyts/chubbyts-http-types/dist/message';
import { statusMap } from '@chubbyts/chubbyts-http-types/dist/message';
import type {
  RequestFactory,
  ResponseFactory,
  ServerRequestFactory,
  StreamFactory,
  StreamFromFileFactory,
  StreamFromResourceFactory,
  UriFactory,
} from '@chubbyts/chubbyts-http-types/dist/message-factory';
import { parse as queryParser } from 'qs';

export const createUriFactory = (): UriFactory => {
  return (uri: string): Uri => {
    const { protocol, username, password, hostname, port, pathname, search, hash } = new URL(uri);

    return {
      schema: protocol.substring(0, protocol.length - 1),
      userInfo: password !== '' ? username + ':' + password : username,
      host: hostname,
      port: port ? parseInt(port, 10) : undefined,
      path: pathname,
      query: search ? (queryParser(search.substring(1)) as Query) : {},
      fragment: hash ? hash.substring(1) : '',
    };
  };
};

export const createStreamFactory = (): StreamFactory => {
  return (content: string): Duplex => {
    const stream = new PassThrough();
    stream.write(content);

    return stream;
  };
};

export const createStreamFromResourceFactory = (): StreamFromResourceFactory => {
  return (stream: Stream): Duplex => {
    const newStream = new PassThrough();
    stream.pipe(newStream);

    return newStream;
  };
};

export const createStreamFromFileFactory = (
  streamFromResourceFactory: StreamFromResourceFactory = createStreamFromResourceFactory(),
): StreamFromFileFactory => {
  return (filename: string): Duplex => {
    if (!existsSync(filename)) {
      throw new Error(`File with filename: "${filename}" does not exists.`);
    }

    return streamFromResourceFactory(createReadStream(filename));
  };
};

export const createRequestFactory = (
  uriFactory: UriFactory = createUriFactory(),
  streamFactory: StreamFactory = createStreamFactory(),
): RequestFactory => {
  return (method: Method, uri: string | Uri): Request => {
    return {
      method,
      uri: typeof uri !== 'string' ? { ...uri } : uriFactory(uri),
      protocolVersion: '1.0',
      headers: {},
      body: streamFactory(''),
    };
  };
};

export const createServerRequestFactory = (
  requestFactory: RequestFactory = createRequestFactory(),
): ServerRequestFactory => {
  return (method: Method, uri: string | Uri): ServerRequest => {
    return {
      ...requestFactory(method, uri),
      attributes: {},
    };
  };
};

/**
 * @deprecated Use `statusMap` (import { statusMap } from '@chubbyts/chubbyts-http-types/dist/message';).
 */
export const statusCodeMap = statusMap;

export const createResponseFactory = (streamFactory: StreamFactory = createStreamFactory()): ResponseFactory => {
  return (status: number, reasonPhrase?: string): Response => {
    return {
      status,
      reasonPhrase: reasonPhrase ?? statusMap.get(status) ?? '',
      protocolVersion: '1.0',
      headers: {},
      body: streamFactory(''),
    };
  };
};
