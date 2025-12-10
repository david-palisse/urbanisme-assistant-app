import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    });
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

    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    // First verify ownership
    await this.findOne(userId, id);

    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: {
        address: true,
        questionnaireResponse: true,
        analysisResult: true,
      },
    });
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

    return this.prisma.project.update({
      where: { id },
      data: { status },
      include: {
        address: true,
        questionnaireResponse: true,
        analysisResult: true,
      },
    });
  }
}
