import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDoctorsDto } from './dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('doctors')
  async searchDoctors(@Query() dto: SearchDoctorsDto) {
    return this.searchService.searchDoctors(dto);
  }
}
