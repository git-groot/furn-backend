import { Request, Response } from 'express';

export interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
  send: (data: any) => MockResponse;
  setHeader: (name: string, val: string) => MockResponse;
}

export const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, val: string) {
      this.headers[name] = val;
      return this;
    },
  };
  return res;
};

export const createMockRequest = (options: {
  method?: string;
  url?: string;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  user?: any;
}): Request => {
  return {
    method: options.method || 'GET',
    originalUrl: options.url || '/',
    url: options.url || '/',
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user,
    ip: '127.0.0.1',
    on: jest.fn(),
  } as unknown as Request;
};
