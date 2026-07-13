import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementService } from './entitlement.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, EntitlementService],
  exports: [EntitlementService],
})
export class BillingModule {}
