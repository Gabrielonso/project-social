import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';
import { SoundsService } from './sounds.service';
import { SoundFilterDto } from './dtos/sound-filter.dto';

@ApiTags('Sounds')
@Controller('sounds')
export class SoundsController {
  constructor(private readonly soundsService: SoundsService) {}

  @UseGuards(JwtOptionalGuard)
  @Get('')
  @ApiOperation({
    summary:
      'Get sounds and their usage (ordered by usage count, then recency)',
  })
  async getSounds(@Query() filter: SoundFilterDto) {
    return this.soundsService.getSounds(filter);
  }

  @UseGuards(JwtOptionalGuard)
  @Get('trending')
  @ApiOperation({
    summary:
      'Get trending sounds within an optional date range (hottest first)',
  })
  async getTrending(@Query() filter: SoundFilterDto) {
    return this.soundsService.getTrendingSounds(filter);
  }

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @Get(':soundId/usage')
  @ApiOperation({
    summary: 'Get posts/ads that use a particular sound',
  })
  async getSoundUsage(
    @Param('soundId') soundId: string,
    @Query() filter: SoundFilterDto,
    @Req() req,
  ) {
    const viewerId: string | undefined = req?.user?.id;
    return this.soundsService.getSoundUsage(soundId, viewerId, filter);
  }
}

