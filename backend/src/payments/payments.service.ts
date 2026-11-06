import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { CURRENCY } from '../database/database.constants';
import { isSeedEnabled } from '../database/database.config';
import { DEMO_OPENING_BALANCE } from '../database/database.seed';
import { Customer, LedgerEntry, Payment, PaymentEvent, ProviderPayment, SupportCase, Wallet } from '../database/entities';
import { CompleteProviderDto, CreatePaymentDto, parseBody } from './payments.dto';

const SCENARIO_RESULT: Record<string, string> = { APPROVED: 'SUCCEEDED', REJECTED: 'REJECTED', PENDING: 'PENDING' };

const notFound = (code: string, message: string) => new NotFoundException({ code, message });
const conflict = (code: string, message: string) => new ConflictException({ code, message });

@Injectable()
export class PaymentsService {
  // better-sqlite3 usa una sola conexión: las escrituras se encolan para que las transacciones no se mezclen.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataSource: DataSource) {}

  async getWallet(id: string) {
    const wallet = await this.dataSource.manager.findOneBy(Wallet, { id });
    if (!wallet) throw notFound('WALLET_NOT_FOUND', 'No se encontró la wallet.');
    return this.presentWallet(wallet);
  }

  async listPayments(walletId: string) {
    const payments = await this.dataSource.manager.find(Payment, { where: { walletId }, order: { createdAt: 'DESC' } });
    return payments.map((payment) => this.presentPayment(payment));
  }

  async getPayment(id: string) {
    return this.presentPayment(await this.findPayment(this.dataSource.manager, id));
  }

  async getReceipt(id: string) {
    const payment = await this.findPayment(this.dataSource.manager, id);
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'REVERSED') {
      throw conflict('RECEIPT_NOT_READY', 'El comprobante estará disponible cuando el pago se complete.');
    }
    return {
      receiptId: `rcp_${payment.id}`,
      paymentId: payment.id,
      amountCents: payment.amount,
      currency: payment.currency,
      recipient: payment.recipientId,
      status: payment.status,
    };
  }

  // Registra en la BD la wallet ACTIVA que deja el onboarding (W1) para poder pagar con ella. Es idempotente por id.
  // Con la semilla habilitada recibe el saldo de apertura de la demo; sin ella queda en cero.
  provisionWallet(input: { walletId: string; fullName: string; phone: string; document: string }) {
    return this.serial(() =>
      this.dataSource.transaction(async (manager) => {
        if (await manager.existsBy(Wallet, { id: input.walletId })) return;
        let customer = await manager.findOneBy(Customer, { documentType: 'DNI', documentNumber: input.document });
        if (!customer) {
          customer = await manager.save(
            manager.create(Customer, { id: `cus_${randomUUID()}`, documentType: 'DNI', documentNumber: input.document, fullName: input.fullName, phone: input.phone }),
          );
        }
        const balance = isSeedEnabled() ? DEMO_OPENING_BALANCE : 0;
        await manager.insert(Wallet, { id: input.walletId, customerId: customer.id, status: 'ACTIVE', balance, reserved: 0, currency: CURRENCY });
        if (balance) {
          const operation = `opening_${input.walletId}`;
          await manager.insert(LedgerEntry, [
            { operation, kind: 'FUNDING', account: 'funding', amount: -balance },
            { operation, kind: 'FUNDING', account: input.walletId, amount: balance },
          ]);
        }
      }),
    );
  }

  async createPayment(rawBody: unknown, idempotencyKey: unknown) {
    const dto = parseBody(CreatePaymentDto, rawBody);
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 || idempotencyKey.length > 200) {
      throw new BadRequestException({ code: 'INVALID_IDEMPOTENCY_KEY', message: 'Envía un Idempotency-Key de 1 a 200 caracteres.' });
    }
    const currency = dto.currency ?? CURRENCY;
    const scenario = dto.scenario ?? 'APPROVED';
    const fingerprint = JSON.stringify([dto.recipient, dto.amountCents, currency, scenario]);
    return this.serial(() =>
      this.dataSource.transaction(async (manager) => {
        const wallet = await manager.findOneBy(Wallet, { id: dto.walletId });
        if (!wallet) throw notFound('WALLET_NOT_FOUND', 'No se encontró la wallet.');
        const existing = await manager.findOneBy(Payment, { walletId: wallet.id, idempotencyKey });
        if (existing) {
          if (existing.fingerprint !== fingerprint) {
            throw conflict('IDEMPOTENCY_CONFLICT', 'Esta clave ya se usó con otros datos.');
          }
          return { replay: true, payment: this.presentPayment(existing) };
        }
        if (wallet.status !== 'ACTIVE') throw conflict('WALLET_NOT_ACTIVE', 'La wallet aún no está activa.');
        if (wallet.balance - wallet.reserved < dto.amountCents) throw conflict('INSUFFICIENT_FUNDS', 'Saldo insuficiente.');

        const payment = await manager.save(
          manager.create(Payment, {
            id: `pay_${randomUUID()}`,
            walletId: wallet.id,
            recipientId: dto.recipient,
            qrId: null,
            amount: dto.amountCents,
            currency,
            status: 'PENDING',
            scenario,
            idempotencyKey,
            fingerprint,
            createdAt: new Date(),
          }),
        );
        await manager.update(Wallet, wallet.id, { reserved: wallet.reserved + dto.amountCents });
        const providerStatus = SCENARIO_RESULT[scenario];
        await manager.insert(ProviderPayment, { id: payment.id, amount: payment.amount, status: providerStatus });
        if (providerStatus !== 'PENDING') await this.queueEvent(manager, payment.id, providerStatus);
        return { replay: false, payment: this.presentPayment(payment) };
      }),
    );
  }

  // Consulta al proveedor simulado y aplica su resultado, o escala el caso si sigue pendiente.
  resolvePayment(id: string) {
    return this.serial(() =>
      this.dataSource.transaction(async (manager) => {
        const payment = await this.findPayment(manager, id);
        const provider = await manager.findOneBy(ProviderPayment, { id });
        if (provider?.status === 'PENDING' && payment.status === 'PENDING') {
          const exists = await manager.existsBy(SupportCase, { resource: id, reason: 'PROVIDER_PENDING' });
          if (!exists) await manager.insert(SupportCase, { id: `case_${randomUUID()}`, resource: id, reason: 'PROVIDER_PENDING', status: 'OPEN' });
          return { escalated: true, payment: this.presentPayment(payment) };
        }
        const events = await manager.find(PaymentEvent, { where: { paymentId: id, delivered: 0 }, order: { createdAt: 'ASC' } });
        for (const event of events) await this.applyEvent(manager, payment, event);
        return { escalated: false, payment: this.presentPayment(await this.findPayment(manager, id)) };
      }),
    );
  }

  // Equivale a /control/provider/{id}/complete del mock: finaliza al proveedor y encola el evento, sin tocar la wallet.
  async completeProvider(id: string, rawBody: unknown) {
    const dto = parseBody(CompleteProviderDto, rawBody, 'INVALID_STATUS');
    const status = dto.status ?? 'SUCCEEDED';
    return this.serial(() =>
      this.dataSource.transaction(async (manager) => {
        const provider = await manager.findOneBy(ProviderPayment, { id });
        if (!provider) throw notFound('NOT_FOUND', 'No se encontró el pago del proveedor.');
        if (provider.status !== 'PENDING') throw conflict('PROVIDER_ALREADY_FINAL', 'El proveedor ya terminó este pago.');
        await manager.update(ProviderPayment, id, { status });
        return { eventId: await this.queueEvent(manager, id, status) };
      }),
    );
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async findPayment(manager: EntityManager, id: string) {
    const payment = await manager.findOneBy(Payment, { id });
    if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'No se encontró el pago.');
    return payment;
  }

  private async queueEvent(manager: EntityManager, paymentId: string, target: string) {
    const id = `evt_${randomUUID()}`;
    await manager.insert(PaymentEvent, { id, paymentId, target, delivered: 0, createdAt: new Date() });
    return id;
  }

  // Entregar un evento dos veces no repite el efecto sobre saldo ni asientos.
  private async applyEvent(manager: EntityManager, payment: Payment, event: PaymentEvent) {
    if (payment.status !== 'PENDING') {
      throw conflict('INVALID_STATE_TRANSITION', 'El pago ya no admite este resultado.');
    }
    const wallet = await manager.findOneByOrFail(Wallet, { id: payment.walletId });
    const succeeded = event.target === 'SUCCEEDED';
    await manager.update(Wallet, wallet.id, {
      reserved: wallet.reserved - payment.amount,
      balance: succeeded ? wallet.balance - payment.amount : wallet.balance,
    });
    if (succeeded) {
      await manager.insert(LedgerEntry, [
        { operation: payment.id, kind: 'PAYMENT', account: wallet.id, amount: -payment.amount },
        { operation: payment.id, kind: 'PAYMENT', account: 'clearing', amount: payment.amount },
      ]);
    }
    await manager.update(Payment, payment.id, { status: event.target });
    await manager.update(PaymentEvent, event.id, { delivered: 1, deliveredAt: new Date() });
    payment.status = event.target;
  }

  private presentWallet(wallet: Wallet) {
    return {
      id: wallet.id,
      status: wallet.status,
      balance: wallet.balance,
      reserved: wallet.reserved,
      available: wallet.balance - wallet.reserved,
      currency: wallet.currency,
    };
  }

  private presentPayment(payment: Payment) {
    return {
      id: payment.id,
      walletId: payment.walletId,
      recipient: payment.recipientId,
      amountCents: payment.amount,
      currency: payment.currency,
      status: payment.status,
      scenario: payment.scenario,
      createdAt: payment.createdAt?.toISOString(),
    };
  }
}
