import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisProgressService } from './analysis-progress.service';
import { AnalysisChatService } from './chat/analysis-chat.service';
import { LlmAnalyzerService } from './llm/llm-analyzer.service';
import { TypeSafeJudgeService } from './llm/typesafe-judge.service';
import { UrbanismeModule } from '../urbanisme/urbanisme.module';
import { ProjectsModule } from '../projects/projects.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [HttpModule, UrbanismeModule, ProjectsModule, BillingModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    AnalysisProgressService,
    AnalysisChatService,
    LlmAnalyzerService,
    TypeSafeJudgeService,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
