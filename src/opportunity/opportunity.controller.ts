import { Body, Controller, Post } from '@nestjs/common';
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto } from './dtos/create-opportunity.dto';
import { ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('opportunities')
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiBody({ type: CreateOpportunityDto })
  async createOpportunity(@Body() dto: CreateOpportunityDto) {
    return this.opportunityService.createOpportunity(dto);
  }
}
