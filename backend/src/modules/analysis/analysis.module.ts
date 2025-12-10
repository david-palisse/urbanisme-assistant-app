import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { UrbanismeModule } from '../urbanisme/urbanisme.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [UrbanismeModule, ProjectsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
