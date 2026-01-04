import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AdService } from './ad.service';
import { CreateAdDto } from './dtos/create-ad.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

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
}
