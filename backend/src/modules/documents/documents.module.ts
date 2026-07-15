import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [HttpModule, BillingModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
