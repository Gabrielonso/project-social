import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(private readonly configService: ConfigService) {}

  private getCredentials() {
    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');
    if (!apiKey || !apiSecret) {
      throw new Error(
        'LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.',
      );
    }
    return { apiKey, apiSecret };
  }

  async createParticipantToken(
    userId: string,
    username: string | undefined,
    roomName: string,
  ): Promise<string> {
    const { apiKey, apiSecret } = this.getCredentials();
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: username ?? userId,
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    return token.toJwt();
  }
}
