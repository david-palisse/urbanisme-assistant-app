import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QuestionnaireService } from './questionnaire.service';
import { SaveQuestionnaireDto } from './dto/save-questionnaire.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('questionnaire')
@Controller()
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get('questionnaire/questions/:projectType')
  @ApiOperation({ summary: 'Get questions for a project type' })
  @ApiParam({
    name: 'projectType',
    enum: ['POOL', 'EXTENSION', 'SHED', 'FENCE'],
    description: 'Type of construction project',
  })
  @ApiResponse({ status: 200, description: 'Questions for the project type' })
  @ApiResponse({ status: 400, description: 'Invalid project type' })
  getQuestions(@Param('projectType') projectType: string) {
    return this.questionnaireService.getQuestions(projectType);
  }

  @Post('projects/:id/questionnaire')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save questionnaire responses for a project' })
  @ApiResponse({ status: 200, description: 'Responses saved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async saveResponses(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
    @Body() dto: SaveQuestionnaireDto,
  ) {
    return this.questionnaireService.saveResponses(req.user.id, projectId, dto);
  }

  @Get('projects/:id/questionnaire')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved questionnaire responses for a project' })
  @ApiResponse({ status: 200, description: 'Saved responses' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getResponses(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.questionnaireService.getResponses(req.user.id, projectId);
  }
}
