import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UrbanismeController } from './urbanisme.controller';
import { UrbanismeService } from './urbanisme.service';
import { TerritoryService } from './services/territory.service';
import { PluZoneService } from './services/plu-zone.service';
import { GeorisquesService } from './services/georisques.service';
import { AbfService } from './services/abf.service';
import { NoiseExposureService } from './services/noise-exposure.service';
import { PluRulesService } from './services/plu-rules.service';
import { ParcelGeometryService } from './services/parcel-geometry.service';

@Module({
  imports: [HttpModule],
  controllers: [UrbanismeController],
  providers: [
    UrbanismeService,
    TerritoryService,
    PluZoneService,
    GeorisquesService,
    AbfService,
    NoiseExposureService,
    PluRulesService,
    ParcelGeometryService,
  ],
  exports: [UrbanismeService],
})
export class UrbanismeModule {}
