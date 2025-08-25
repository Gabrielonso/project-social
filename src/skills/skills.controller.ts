import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UserRoles } from '@global/enums/user-roles.constants';
import { Roles } from '@global/decorators/roles.decorator';
import { RoleGuard } from 'src/auth/guards/role.guard';

@Controller('skills')
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Roles([UserRoles.SUPER_ADMIN, UserRoles.ADMIN])
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Post('')
  @ApiOperation({ summary: `Create skill` })
  @ApiBody({ type: CreateSkillDto })
  @ApiBearerAuth()
  createSkill(@Body() payload: CreateSkillDto) {
    return this.skillsService.createSkill(payload);
  }
}
