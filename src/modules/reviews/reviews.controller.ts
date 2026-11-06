import { Controller, Post, Get, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async submitReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.reviewsService.submitReview(dto, currentUserId);
  }

  @Get('doctor/:doctorId')
  async getDoctorReviews(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.reviewsService.getDoctorReviews(doctorId);
  }
}
