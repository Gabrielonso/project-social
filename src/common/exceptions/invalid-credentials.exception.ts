import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCredentialsExceptions extends HttpException {
  constructor() {
    super('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}
