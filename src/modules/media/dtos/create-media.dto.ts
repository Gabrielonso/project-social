import { MediaType } from '../enums/media-type.enum';

export class CreateMediaDto {
  publicId: string;
  secureUrl: string;
  type: MediaType;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
}
