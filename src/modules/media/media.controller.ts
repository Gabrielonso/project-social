import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUploadDto } from './dtos/create-upload.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('uploads')
  @ApiOperation({ summary: 'Create S3 upload session (mediaId flow)' })
  @ApiBody({ type: CreateUploadDto })
  createUpload(@Req() req, @Body() dto: CreateUploadDto) {
    return this.mediaService.createUpload(req.user.id, dto);
  }

  @Post('uploads/:id/complete')
  @ApiOperation({ summary: 'Confirm direct S3 upload and start processing' })
  completeUpload(@Req() req, @Param('id') id: string) {
    return this.mediaService.completeUpload(req.user.id, id);
  }

  @Get('uploads/:id')
  @ApiOperation({ summary: 'Poll upload / processing status' })
  getUploadStatus(@Req() req, @Param('id') id: string) {
    return this.mediaService.getUploadStatus(req.user.id, id);
  }

  @Delete('uploads/:id')
  @HttpCode(202)
  @ApiOperation({ summary: 'Cancel draft upload (async cleanup)' })
  cancelUpload(@Req() req, @Param('id') id: string) {
    return this.mediaService.requestCancelUpload(req.user.id, id);
  }

  @Post('upload-credentials')
  @ApiOperation({ summary: 'Create upload credentials (Cloudinary fallback)' })
  @ApiBody({ type: CreateUploadDto })
  getUploadSignature(@Req() req, @Body() dto: CreateUploadDto) {
    return this.mediaService.createUploadCredentials(req.user.id, dto);
  }
}
