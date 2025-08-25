import { Injectable } from '@nestjs/common';
import { In, DataSource } from 'typeorm';
import { Opportunity } from './entity/opportunity.entity';
import { Client } from 'src/client/entity/client.entity';
import { Skill } from 'src/skills/entity/skill.entity';
import { Faq } from 'src/faq/entity/faq.entity';
import { CreateOpportunityDto } from './dtos/create-opportunity.dto';
import { successResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class OpportunityService {
  constructor(private readonly dataSource: DataSource) {}

  async createOpportunity(dto: CreateOpportunityDto) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const opportunityRepo = entityManager.getRepository(Opportunity);
          const clientRepo = entityManager.getRepository(Client);
          const skillRepo = entityManager.getRepository(Skill);
          const faqRepo = entityManager.getRepository(Faq);
          const opportunity = opportunityRepo.create({
            title: dto.title,
            description: dto.description,
          });

          if (dto.client) {
            const client = clientRepo.create(dto.client);
            opportunity.client = client;
          }

          // Handle Skills
          if (dto.skills && dto.skills.length > 0) {
            const skills = await skillRepo.find({
              where: { id: In(dto.skills) },
            });
            opportunity.skills = skills;
          }

          if (dto.faqs && dto.faqs.length > 0) {
            const faqs = dto.faqs.map((faq) => faqRepo.create(faq));
            opportunity.faqs = faqs;
          }

          opportunityRepo.save(opportunity);
          return successResponse('Successfully created opportunity');
        },
      );
    } catch (error) {
      throw error;
    }
  }
}
