import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  error?: any;
}

export type WsResponse<T = any> = {
  success: boolean;
  event: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export function successResponse<T = undefined>(
  message: string,
  data?: T,
  statusCode: number = HttpStatus.OK,
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    statusCode,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return response;
}

export function wsSuccess(event: string, data: any): WsResponse {
  return { success: true, event, data };
}

export function wsFailure(
  event: string,
  code: string,
  message: string,
): WsResponse {
  return {
    success: false,
    event,
    error: { code, message },
  };
}
