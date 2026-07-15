import {
  Controller,
  Post,
  Get,
  Param,
  Body,
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
import { AnalysisChatService } from './chat/analysis-chat.service';
import { SendChatMessageDto } from './chat/dto/send-chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('analysis')
@Controller('projects/:id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly analysisChatService: AnalysisChatService,
  ) {}

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

  @Get('analysis/progress')
  @ApiOperation({ summary: 'Get the current step of an in-flight analysis' })
  @ApiResponse({
    status: 200,
    description: 'Current progress, or null when no analysis is running',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getAnalysisProgress(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.analysisService.getAnalysisProgress(req.user.id, projectId);
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

  @Get('chat')
  @ApiOperation({ summary: 'Get the chat history about an analyzed project' })
  @ApiResponse({ status: 200, description: 'Chat messages ordered by date' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getChatHistory(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.analysisChatService.getChatHistory(req.user.id, projectId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Ask the assistant a question about the analyzed project' })
  @ApiResponse({ status: 201, description: 'User question and assistant answer' })
  @ApiResponse({ status: 400, description: 'Project not analyzed yet' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async sendChatMessage(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.analysisChatService.sendMessage(req.user.id, projectId, dto.message);
  }
}
