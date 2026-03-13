import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { CitiesService } from '../services/cities.service';
import { CreateCityDto } from '../dto/create-city.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.citiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.citiesService.findOne(id);
  }

  @Public()
  @Get(':id/localities')
  findLocalities(@Param('id') id: string) {
    return this.citiesService.findLocalitiesByCity(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
