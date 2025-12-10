import {
  Controller,
  Post,
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
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('analysis')
@Controller('projects/:id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Trigger LLM analysis for a project' })
  @ApiResponse({ status: 200, description: 'Analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Questionnaire not completed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async analyzeProject(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.analysisService.analyzeProject(req.user.id, projectId);
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get analysis results for a project' })
  @ApiResponse({ status: 200, description: 'Analysis results' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getAnalysisResult(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.analysisService.getAnalysisResult(req.user.id, projectId);
  }
}
