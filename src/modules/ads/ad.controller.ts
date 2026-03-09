import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdService } from './ad.service';
import { CreateAdDto } from './dtos/create-ad.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateAdDto } from './dtos/update-ad.dto';

@ApiTags('Ads')
@Controller('ads')
export class AdController {
  constructor(private readonly adService: AdService) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  @ApiOperation({ summary: 'Create an Ad' })
  @ApiBody({ type: CreateAdDto })
  @ApiBearerAuth()
  async createAd(@Body() dto: CreateAdDto, @Req() req) {
    const userId: string = req.user.id;
    return this.adService.createAd(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':adId')
  @ApiOperation({
    summary:
      'Edit an ad (allowed: topic, description, hashtags)',
  })
  @ApiBody({ type: UpdateAdDto })
  @ApiBearerAuth()
  async updateAd(
    @Param('adId', ParseUUIDPipe) adId: string,
    @Body() dto: UpdateAdDto,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.adService.updateAd(adId, dto, userId);
  }
}
