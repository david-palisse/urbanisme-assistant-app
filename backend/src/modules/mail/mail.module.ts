import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MailService } from './mail.service';

// Global so any module (auth today, billing/notifications tomorrow) can
// inject MailService without re-importing.
@Global()
@Module({
  imports: [HttpModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
