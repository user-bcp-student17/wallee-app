import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';

const DEFAULT_WALLET_ID = 'wallet-demo';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('wallets/:id')
  wallet(@Param('id') id: string) {
    return this.payments.getWallet(id);
  }

  @Get('payments')
  list(@Query('walletId') walletId?: string) {
    return this.payments.listPayments(walletId || DEFAULT_WALLET_ID);
  }

  @Post('payments')
  async create(@Body() body: unknown, @Headers('idempotency-key') key: string | undefined, @Res({ passthrough: true }) res: Response) {
    const { replay, payment } = await this.payments.createPayment(body, key);
    res.status(replay ? 200 : 202);
    return payment;
  }

  @Get('payments/:id')
  payment(@Param('id') id: string) {
    return this.payments.getPayment(id);
  }

  @Get('payments/:id/receipt')
  receipt(@Param('id') id: string) {
    return this.payments.getReceipt(id);
  }

  @Post('payments/:id/resolve')
  @HttpCode(200)
  async resolve(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { escalated, payment } = await this.payments.resolvePayment(id);
    if (!escalated) return payment;
    res.status(202);
    return { status: 'PENDING', escalated: true };
  }

  @Post('control/provider/:id/complete')
  @HttpCode(200)
  complete(@Param('id') id: string, @Body() body: unknown) {
    return this.payments.completeProvider(id, body);
  }
}
