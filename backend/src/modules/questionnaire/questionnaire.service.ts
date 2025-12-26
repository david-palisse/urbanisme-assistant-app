import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveQuestionnaireDto } from './dto/save-questionnaire.dto';
import { getQuestionsForProjectType, QuestionGroup } from './questions/question-tree';
import { ProjectType, ProjectStatus } from '@prisma/client';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  getQuestions(projectType: string): QuestionGroup[] {
    // Validate project type
    if (!Object.values(ProjectType).includes(projectType as ProjectType)) {
      throw new BadRequestException(`Invalid project type: ${projectType}`);
    }

    return getQuestionsForProjectType(projectType as ProjectType);
  }

  async saveResponses(
    userId: string,
    projectId: string,
    dto: SaveQuestionnaireDto,
  ) {
    console.log('Saving responses for project:', projectId);
    console.log('Responses:', JSON.stringify(dto.responses, null, 2));

    // Verify project exists and belongs to user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { questionnaireResponse: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    // Validate responses against question tree
    const questions = getQuestionsForProjectType(project.projectType);
    try {
      this.validateResponses(dto.responses, questions);
    } catch (error) {
      console.error('Validation failed:', error.message);
      throw error;
    }

    // Create or update questionnaire response
    const questionnaireData = {
      responses: dto.responses,
      completedAt: dto.completed ? new Date() : null,
    };

    let questionnaireResponse;

    if (project.questionnaireResponse) {
      // Update existing
      questionnaireResponse = await this.prisma.questionnaireResponse.update({
        where: { id: project.questionnaireResponse.id },
        data: questionnaireData,
      });
    } else {
      // Create new
      questionnaireResponse = await this.prisma.questionnaireResponse.create({
        data: {
          projectId,
          ...questionnaireData,
        },
      });
    }

    // Update project status if questionnaire is completed
    if (dto.completed) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.QUESTIONNAIRE },
      });
    }

    return questionnaireResponse;
  }

  async getResponses(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { questionnaireResponse: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    return project.questionnaireResponse;
  }

  private validateResponses(
    responses: Record<string, unknown>,
    questionGroups: QuestionGroup[],
  ): void {
    // Flatten all questions
    const allQuestions = questionGroups.flatMap((group) => group.questions);

    for (const question of allQuestions) {
      const value = responses[question.id];
      const isProvided = value !== undefined && value !== null && value !== '';

      // Check if question should be visible based on dependencies
      let shouldBeVisible = true;
      if (question.dependsOn) {
        const parentResponse = responses[question.dependsOn.questionId];
        shouldBeVisible = parentResponse === question.dependsOn.value;
      }

      // Validate required questions
      if (shouldBeVisible && question.required) {
        if (!isProvided) {
          throw new BadRequestException(
            `Le champ "${question.text}" est obligatoire.`,
          );
        }
      }

      // Skip further validation if not provided
      if (!isProvided) continue;

      // Validate number constraints
      if (question.type === 'number' && question.validation) {
        const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);

        if (isNaN(numValue)) {
          throw new BadRequestException(
            `${question.id}: la valeur doit être un nombre`,
          );
        }

        if (question.validation.min !== undefined && numValue < question.validation.min) {
          throw new BadRequestException(
            `${question.id}: la valeur doit être au moins ${question.validation.min}`,
          );
        }
        if (question.validation.max !== undefined && numValue > question.validation.max) {
          throw new BadRequestException(
            `${question.id}: la valeur doit être au plus ${question.validation.max}`,
          );
        }
      }

      // Validate select options
      if (question.type === 'select' && question.options) {
        const validOptions = question.options.map((o) => o.value);
        if (!validOptions.includes(value as string)) {
          throw new BadRequestException(
            `${question.id}: option invalide "${value}"`,
          );
        }
      }
    }
  }
}
