import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  error?: any;
}

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
