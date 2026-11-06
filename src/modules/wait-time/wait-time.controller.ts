import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WaitTimeService } from './wait-time.service';

@Controller('wait-time')
export class WaitTimeController {
  constructor(private readonly waitTimeService: WaitTimeService) {}

  @Get('token/:tokenId')
  async getEstimatedWaitTime(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.waitTimeService.calculateWaitTime(tokenId);
  }
}
