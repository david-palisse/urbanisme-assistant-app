import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeocodingController } from './geocoding.controller';
import { GeocodingService } from './geocoding.service';
import { UrbanismeModule } from '../urbanisme/urbanisme.module';

@Module({
  imports: [HttpModule, forwardRef(() => UrbanismeModule)],
  controllers: [GeocodingController],
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
