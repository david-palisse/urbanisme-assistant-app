import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('documents')
@Controller('projects/:id/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get required documents checklist for a project' })
  @ApiResponse({ status: 200, description: 'Documents checklist' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectDocuments(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.documentsService.getProjectDocuments(req.user.id, projectId);
  }
}
