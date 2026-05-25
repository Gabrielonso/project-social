import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { LiveKitWebhookService } from '../services/livekit-webhook.service';

@Controller('livekit')
export class LiveKitWebhookController {
  constructor(private readonly liveKitWebhookService: LiveKitWebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authorization?: string,
  ) {
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : (req.rawBody?.toString('utf8') ?? '');
    await this.liveKitWebhookService.handleWebhook(rawBody, authorization);
    return { ok: true };
  }
}
