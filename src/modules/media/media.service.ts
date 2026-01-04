import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUploadDto } from './dtos/create-upload.dto';
import { MEDIA_PROVIDER } from 'src/common/constants';
import { MediaProvider } from 'src/common/interfaces/media-provider.interface';
import { MediaType } from './enums/media-type.enum';
import { successResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_PROVIDER)
    private readonly mediaProvider: MediaProvider,
  ) {}

  async createUploadCredentials(userId: string, dto: CreateUploadDto) {
    try {
      this.validate(dto);
      const data = await this.mediaProvider.generateUploadCredentials({
        userId,
        ...dto,
      });

      return successResponse('Successfully generated credentials', data);
    } catch (error) {
      throw error;
    }
  }

  private validate(dto: CreateUploadDto) {
    if (dto.type === MediaType.VIDEO && !dto.mimeType.startsWith('video/')) {
      throw new BadRequestException('Invalid video type');
    }
  }
}
