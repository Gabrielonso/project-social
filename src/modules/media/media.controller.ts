import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUploadDto } from './dtos/create-upload.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-credentials')
  @ApiOperation({ summary: `Create upload credentials` })
  @ApiBody({ type: CreateUploadDto })
  getUploadSignature(@Req() req, @Body() dto: CreateUploadDto) {
    const userId = req.user.id;

    return this.mediaService.createUploadCredentials(userId, dto);
  }
}
