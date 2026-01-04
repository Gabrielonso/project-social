import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';

export interface MediaProvider {
  generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials>;
}

export interface GenerateUploadInput {
  userId: string;
  type: MediaType;
  mimeType: string;
  size: number;
  uploadFolder: MediaUploadFolder;
}

export interface UploadCredentials {
  provider: 's3' | 'cloudinary';
  data: Record<string, any>;
}
