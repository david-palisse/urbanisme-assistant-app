import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { EntitlementService } from './entitlement.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ConfirmCheckoutDto } from './dto/confirm-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a pack' })
  @ApiResponse({ status: 201, description: 'Checkout session URL' })
  @ApiResponse({ status: 400, description: 'Pack unavailable or already unlocked' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createCheckout(
    @Request() req: RequestWithUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(
      req.user.id,
      dto.projectId,
      dto.pack,
    );
  }

  @Post('checkout/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm a checkout session after returning from Stripe',
  })
  @ApiResponse({ status: 201, description: 'Updated project entitlement' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async confirmCheckout(
    @Request() req: RequestWithUser,
    @Body() dto: ConfirmCheckoutDto,
  ) {
    return this.billingService.confirmCheckoutSession(
      req.user.id,
      dto.sessionId,
    );
  }

  @Get('purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Purchase history of the logged-in user" })
  @ApiResponse({ status: 200, description: 'List of paid/refunded purchases' })
  async listPurchases(@Request() req: RequestWithUser) {
    return this.billingService.listUserPurchases(req.user.id);
  }

  @Get('projects/:projectId/entitlement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get what the user has unlocked on a project' })
  @ApiResponse({ status: 200, description: 'Project entitlement' })
  async getEntitlement(
    @Request() req: RequestWithUser,
    @Param('projectId') projectId: string,
  ) {
    return this.entitlementService.getProjectEntitlementForUser(
      req.user.id,
      projectId,
    );
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint (signature-verified)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    return this.billingService.handleWebhookEvent(req.rawBody, signature);
  }
}
