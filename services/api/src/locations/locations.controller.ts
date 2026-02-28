import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsObject } from 'class-validator';

class CreateLocationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  hoursJson?: Record<string, any>;
}

class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  hoursJson?: Record<string, any>;
}

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  list(@CurrentUser('orgId') orgId: string) {
    return this.locationsService.findByOrg(orgId);
  }

  @Post()
  create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(orgId, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
