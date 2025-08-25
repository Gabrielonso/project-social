import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Skill } from './entity/skill.entity';
import { Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { successResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private skillRepo: Repository<Skill>,
  ) {}
  async createSkill(payload: CreateSkillDto) {
    try {
      const existingSkill = await this.skillRepo.findOne({
        where: { name: payload.name },
      });

      if (existingSkill) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'This skill already exist',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const skill = this.skillRepo.create(payload);
      await this.skillRepo.save(skill);
      return successResponse('Successfully created skill');
    } catch (error) {
      throw error;
    }
  }
}
