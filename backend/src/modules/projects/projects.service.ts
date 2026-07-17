import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, ListProjectsDto } from './dto';
import { Prisma, ProjectStatus } from '@prisma/client';
import { EntitlementService } from '../billing/entitlement.service';
import { presentAnalysisResult } from '../billing/analysis-lock';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: EntitlementService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        projectType: dto.projectType,
        status: ProjectStatus.DRAFT,
      },
      include: {
        address: true,
        questionnaireResponse: true,
        analysisResult: true,
      },
    });

    // If address is provided, create the address record
    if (dto.address) {
      await this.prisma.address.create({
        data: {
          projectId: project.id,
          rawInput: dto.address,
          lat: 0, // Will be updated by geocoding
          lon: 0, // Will be updated by geocoding
        },
      });
    }

    return this.findOne(userId, project.id);
  }

  async findAll(userId: string, query: ListProjectsDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: Prisma.ProjectWhereInput = { userId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        {
          address: {
            is: { cityName: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      query.sort === 'oldest'
        ? { createdAt: 'asc' }
        : query.sort === 'name'
          ? { name: 'asc' }
          : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          address: true,
          questionnaireResponse: {
            select: {
              id: true,
              completedAt: true,
            },
          },
          analysisResult: {
            select: {
              id: true,
              authorizationType: true,
              feasibilityStatus: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Status counts for the dashboard tiles */
  async getStats(userId: string) {
    const groups = await this.prisma.project.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const count = (status: ProjectStatus) =>
      groups.find((g) => g.status === status)?._count._all ?? 0;

    return {
      total: groups.reduce((sum, g) => sum + g._count._all, 0),
      draft: count(ProjectStatus.DRAFT),
      inProgress:
        count(ProjectStatus.QUESTIONNAIRE) + count(ProjectStatus.ANALYZING),
      completed: count(ProjectStatus.COMPLETED),
    };
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        address: true,
        questionnaireResponse: true,
        analysisResult: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied to this project');
    }

    // The embedded analysis result follows the same paywall as GET /analysis:
    // free tier only sees the feasibility status and a summary preview
    if (project.analysisResult) {
      const unlocked = await this.entitlementService.isProjectUnlocked(id);
      return {
        ...project,
        analysisResult: presentAnalysisResult(project.analysisResult, unlocked),
      };
    }

    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    // First verify ownership
    await this.findOne(userId, id);

    await this.prisma.project.update({
      where: { id },
      data: dto,
    });

    // Re-read through findOne so the analysis paywall is applied
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    // First verify ownership
    await this.findOne(userId, id);

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async updateStatus(userId: string, id: string, status: ProjectStatus) {
    await this.findOne(userId, id);

    await this.prisma.project.update({
      where: { id },
      data: { status },
    });

    // Re-read through findOne so the analysis paywall is applied
    return this.findOne(userId, id);
  }
}
