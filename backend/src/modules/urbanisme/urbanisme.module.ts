import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UrbanismeController } from './urbanisme.controller';
import { UrbanismeService } from './urbanisme.service';

@Module({
  imports: [HttpModule],
  controllers: [UrbanismeController],
  providers: [UrbanismeService],
  exports: [UrbanismeService],
})
export class UrbanismeModule {}
