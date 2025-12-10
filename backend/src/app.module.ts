import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { UrbanismeModule } from './modules/urbanisme/urbanisme.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PrismaModule } from './prisma/prisma.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    QuestionnaireModule,
    GeocodingModule,
    UrbanismeModule,
    AnalysisModule,
    DocumentsModule,
  ],
})
export class AppModule {}
