import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CURRENCY } from './database.constants';
import { isSeedEnabled } from './database.config';
import { Customer, LedgerEntry, Recipient, Wallet } from './entities';

export const DEMO_WALLET_ID = 'wallet-demo';
export const DEMO_CUSTOMER_ID = 'cus-demo';
export const DEMO_OPENING_BALANCE = 100_000;

// Semilla equivalente a /control/reset del mock: wallet-demo ACTIVE con 100000 céntimos y dos asientos de apertura.
// Es idempotente: si wallet-demo ya existe no escribe nada.
export async function seedDemoData(dataSource: DataSource) {
  await dataSource.transaction(async (manager) => {
    if (await manager.exists(Wallet, { where: { id: DEMO_WALLET_ID } })) return;
    await manager.insert(Customer, { id: DEMO_CUSTOMER_ID, documentType: 'TEST', documentNumber: 'TEST-DEMO', fullName: 'Cliente Demo', phone: null });
    await manager.insert(Wallet, { id: DEMO_WALLET_ID, customerId: DEMO_CUSTOMER_ID, status: 'ACTIVE', balance: DEMO_OPENING_BALANCE, reserved: 0, currency: CURRENCY });
    await manager.insert(Recipient, [
      { id: 'contact-demo', kind: 'CONTACT', name: 'Contacto Demo' },
      { id: 'merchant-demo', kind: 'MERCHANT', name: 'Comercio Demo' },
    ]);
    await manager.insert(LedgerEntry, [
      { operation: 'opening', kind: 'FUNDING', account: 'funding', amount: -DEMO_OPENING_BALANCE },
      { operation: 'opening', kind: 'FUNDING', account: DEMO_WALLET_ID, amount: DEMO_OPENING_BALANCE },
    ]);
  });
}

@Injectable()
export class DatabaseSeeder implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    if (isSeedEnabled()) await seedDemoData(this.dataSource);
  }
}
