import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'src/common/utils/globals';

export type SendPushParams = {
  userId: string;
  title: string;
  body: string;
};

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPush(params: SendPushParams) {
    const appId = this.configService.get<string>('ONESIGNAL_APP_ID');
    const baseUrl = this.configService.get<string>('ONESIGNAL_BASE_URL');
    const apiKey = this.configService.get<string>('ONESIGNAL_API_KEY');

    if (!appId || !baseUrl || !apiKey) {
      this.logger.warn(
        'OneSignal not configured. Set ONESIGNAL_APP_ID, ONESIGNAL_BASE_URL, ONESIGNAL_API_KEY.',
      );
      return;
    }

    await request({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    })(
      `${baseUrl}/notifications`,
      {
        app_id: appId,
        target_channel: 'push',
        contents: { en: params.body },
        headings: { en: params.title },
        include_aliases: { external_id: [params.userId] },
      },
      'POST',
    );
  }
}
