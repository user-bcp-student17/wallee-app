// backend-nestjs/src/common/api-error.ts
// Cubre: 3.2, 3.3, 4.1 y 4.2
import { HttpException } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(
      {
        statusCode,
        code,
        message,
        ...(fields ? { fields } : {}),
      },
      statusCode,
    );
  }
}
```

```ts
// backend-nestjs/src/onboarding/domain/onboarding.types.ts
// Cubre: 3.1, 4.1, 4.2 y 5.1
export const ONBOARDING_STEP_KEYS = [
  'datos',
  'identidad',
  'verificacion',
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];
export type OnboardingStatus = 'EN_CURSO' | 'COMPLETADO';
export type WalletStatus = 'PENDIENTE_ONBOARDING' | 'ACTIVA';
export type StoredStepStatus = 'PENDIENTE' | 'COMPLETADO';

export interface OnboardingData {
  name?: string;
  phone?: string;
  documentNumber?: string;
}

export interface OnboardingRecord {
  id: string;
  walletId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepKey | null;
  steps: Record<OnboardingStepKey, StoredStepStatus>;
  data: OnboardingData;
  createdAt: string;
  updatedAt: string;
}

export interface WalletRecord {
  id: string;
  onboardingId: string;
  phone: string | null;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingEvent {
  id: string;
  onboardingId: string;
  type:
    | 'onboarding_started'
    | 'onboarding_step_completed'
    | 'onboarding_completed';
  step?: OnboardingStepKey;
  occurredAt: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/datos-step.dto.ts
// Cubre: 3.2
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DatosStepDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'Completa el campo nombre.' })
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El celular debe ser texto.' })
  @Matches(/^9\d{8}$/, {
    message: 'Ingresa un celular de 9 dígitos que empiece con 9.',
  })
  phone!: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/identidad-step.dto.ts
// Cubre: 2.2 y 3.2
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class IdentidadStepDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El documento debe ser texto.' })
  @Matches(/^\d{8}$/, {
    message: 'Ingresa un documento de 8 dígitos.',
  })
  @IsNotEmpty({ message: 'Completa el campo documento.' })
  documentNumber!: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/verificacion-step.dto.ts
// Cubre: 2.2 y 3.2
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerificacionStepDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El código debe ser texto.' })
  @IsNotEmpty({ message: 'Completa el campo código.' })
  code!: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/validate-step-payload.ts
// Cubre: 3.2
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiError } from '../../common/api-error';
import { OnboardingStepKey } from '../domain/onboarding.types';
import { DatosStepDto } from './datos-step.dto';
import { IdentidadStepDto } from './identidad-step.dto';
import { VerificacionStepDto } from './verificacion-step.dto';

type StepDto =
  | DatosStepDto
  | IdentidadStepDto
  | VerificacionStepDto;

const STEP_DTO: Record<
  OnboardingStepKey,
  new () => StepDto
> = {
  datos: DatosStepDto,
  identidad: IdentidadStepDto,
  verificacion: VerificacionStepDto,
};

export async function validateStepPayload(
  step: OnboardingStepKey,
  payload: unknown,
): Promise<StepDto> {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Envía los datos del paso en un objeto JSON.',
      { body: 'Envía los datos del paso en un objeto JSON.' },
    );
  }

  const dto = plainToInstance(STEP_DTO[step], payload);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });

  if (errors.length > 0) {
    const fields: Record<string, string> = {};

    for (const error of errors) {
      fields[error.property] =
        Object.values(error.constraints ?? {})[0] ??
        'Revisa este campo.';
    }

    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Revisa los campos indicados antes de continuar.',
      fields,
    );
  }

  return dto;
}
```

```ts
// backend-nestjs/src/persistence/onboarding-store.ts
// Cubre: 3.1, 4.1, 4.2 y 5.1
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ONBOARDING_STEP_KEYS,
  OnboardingData,
  OnboardingEvent,
  OnboardingRecord,
  OnboardingStepKey,
  WalletRecord,
} from '../onboarding/domain/onboarding.types';

@Injectable()
export class OnboardingStore {
  private readonly onboardings = new Map<string, OnboardingRecord>();
  private readonly wallets = new Map<string, WalletRecord>();
  private readonly events: OnboardingEvent[] = [];

  createOnboarding(): OnboardingRecord {
    const now = new Date().toISOString();
    const onboardingId = randomUUID();
    const walletId = randomUUID();

    const onboarding: OnboardingRecord = {
      id: onboardingId,
      walletId,
      status: 'EN_CURSO',
      currentStep: 'datos',
      steps: {
        datos: 'PENDIENTE',
        identidad: 'PENDIENTE',
        verificacion: 'PENDIENTE',
      },
      data: {},
      createdAt: now,
      updatedAt: now,
    };

    const wallet: WalletRecord = {
      id: walletId,
      onboardingId,
      phone: null,
      status: 'PENDIENTE_ONBOARDING',
      createdAt: now,
      updatedAt: now,
    };

    this.onboardings.set(onboardingId, onboarding);
    this.wallets.set(walletId, wallet);
    this.events.push({
      id: randomUUID(),
      onboardingId,
      type: 'onboarding_started',
      occurredAt: now,
    });

    return this.copyOnboarding(onboarding);
  }

  getOnboarding(id: string): OnboardingRecord | undefined {
    const record = this.onboardings.get(id);
    return record ? this.copyOnboarding(record) : undefined;
  }

  getWallet(id: string): WalletRecord | undefined {
    const wallet = this.wallets.get(id);
    return wallet ? { ...wallet } : undefined;
  }

  getEventsFor(onboardingId: string): OnboardingEvent[] {
    return this.events
      .filter((event) => event.onboardingId === onboardingId)
      .map((event) => ({ ...event }));
  }

  /**
   * Actualización síncrona del onboarding, wallet y eventos en una sola
   * operación del adaptador en memoria. La transacción durable queda
   * PENDIENTE hasta que se confirme el diseño de persistencia.
   */
  completeStep(
    onboardingId: string,
    step: OnboardingStepKey,
    stepData: OnboardingData,
  ): OnboardingRecord {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding) {
      throw new Error('Onboarding inexistente en el store.');
    }

    const wallet = this.wallets.get(onboarding.walletId);
    if (!wallet) {
      throw new Error('Wallet inexistente en el store.');
    }

    const now = new Date().toISOString();

    onboarding.data = { ...onboarding.data, ...stepData };
    onboarding.steps[step] = 'COMPLETADO';
    onboarding.updatedAt = now;

    if (step === 'datos' && stepData.phone) {
      wallet.phone = stepData.phone;
      wallet.updatedAt = now;
    }

    this.events.push({
      id: randomUUID(),
      onboardingId,
      type: 'onboarding_step_completed',
      step,
      occurredAt: now,
    });

    const currentIndex = ONBOARDING_STEP_KEYS.indexOf(step);
    const nextStep = ONBOARDING_STEP_KEYS[currentIndex + 1];

    if (nextStep) {
      onboarding.currentStep = nextStep;
    } else {
      onboarding.currentStep = null;
      onboarding.status = 'COMPLETADO';
      onboarding.updatedAt = now;
      wallet.status = 'ACTIVA';
      wallet.updatedAt = now;

      this.events.push({
        id: randomUUID(),
        onboardingId,
        type: 'onboarding_completed',
        occurredAt: now,
      });
    }

    return this.copyOnboarding(onboarding);
  }

  private copyOnboarding(record: OnboardingRecord): OnboardingRecord {
    return {
      ...record,
      steps: { ...record.steps },
      data: { ...record.data },
    };
  }
}
```

```ts
// backend-nestjs/src/persistence/persistence.module.ts
// Cubre: 3.1, 4.1, 4.2 y 5.1
import { Module } from '@nestjs/common';
import { OnboardingStore } from './onboarding-store';

@Module({
  providers: [OnboardingStore],
  exports: [OnboardingStore],
})
export class PersistenceModule {}
```

```ts
// backend-nestjs/src/onboarding/identity-mock.service.ts
// Cubre: 2.2
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';

const MOCK_OTP = '123456';

@Injectable()
export class IdentityMockService {
  verifyDocument(documentNumber: string): boolean {
    // Mock local: valida únicamente el formato, sin llamar a terceros.
    return /^\d{8}$/.test(documentNumber);
  }

  verifyOtp(code: string): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(
        503,
        'IDENTITY_MOCK_DISABLED',
        'La verificación simulada no está habilitada en producción.',
      );
    }

    return code === MOCK_OTP;
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.service.ts
// Cubre: 2.2, 3.1, 3.2, 3.3, 4.1, 4.2 y 5.1
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { OnboardingStore } from '../persistence/onboarding-store';
import {
  ONBOARDING_STEP_KEYS,
  OnboardingRecord,
  OnboardingStepKey,
} from './domain/onboarding.types';
import { IdentityMockService } from './identity-mock.service';
import { validateStepPayload } from './dto/validate-step-payload';
import {
  DatosStepDto,
} from './dto/datos-step.dto';
import {
  IdentidadStepDto,
} from './dto/identidad-step.dto';
import {
  VerificacionStepDto,
} from './dto/verificacion-step.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly store: OnboardingStore,
    private readonly identityMock: IdentityMockService,
  ) {}

  start() {
    return this.toProgress(this.store.createOnboarding());
  }

  getProgress(id: string) {
    const onboarding = this.store.getOnboarding(id);
    if (!onboarding) {
      throw new ApiError(
        404,
        'ONBOARDING_NOT_FOUND',
        'No se encontró el onboarding solicitado.',
      );
    }

    return this.toProgress(onboarding);
  }

  async completeStep(id: string, rawStep: string, payload: unknown) {
    const onboarding = this.store.getOnboarding(id);
    if (!onboarding) {
      throw new ApiError(
        404,
        'ONBOARDING_NOT_FOUND',
        'No se encontró el onboarding solicitado.',
      );
    }

    if (
      !ONBOARDING_STEP_KEYS.includes(rawStep as OnboardingStepKey)
    ) {
      throw new ApiError(
        400,
        'INVALID_STEP_KEY',
        'El paso indicado no es válido.',
        { stepKey: 'Usa datos, identidad o verificacion.' },
      );
    }

    const step = rawStep as OnboardingStepKey;

    if (onboarding.status === 'COMPLETADO') {
      throw new ApiError(
        409,
        'ONBOARDING_COMPLETED',
        'El onboarding ya fue completado.',
      );
    }

    if (onboarding.currentStep !== step) {
      throw new ApiError(
        409,
        'STEP_OUT_OF_ORDER',
        'Completa los pasos en el orden indicado.',
      );
    }

    const dto = await validateStepPayload(step, payload);

    if (step === 'datos') {
      const datos = dto as DatosStepDto;
      return this.toProgress(
        this.store.completeStep(id, step, {
          name: datos.name,
          phone: datos.phone,
        }),
      );
    }

    if (step === 'identidad') {
      const identidad = dto as IdentidadStepDto;
      if (!this.identityMock.verifyDocument(identidad.documentNumber)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Revisa el documento ingresado.',
          { documentNumber: 'Ingresa un documento de 8 dígitos.' },
        );
      }

      return this.toProgress(
        this.store.completeStep(id, step, {
          documentNumber: identidad.documentNumber,
        }),
      );
    }

    const verificacion = dto as VerificacionStepDto;
    if (!this.identityMock.verifyOtp(verificacion.code)) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'El código de verificación es incorrecto. Puedes reintentarlo.',
        { code: 'Código incorrecto. Verifica e inténtalo nuevamente.' },
      );
    }

    return this.toProgress(
      this.store.completeStep(id, step, {}),
    );
  }

  private toProgress(onboarding: OnboardingRecord) {
    return {
      onboardingId: onboarding.id,
      walletId: onboarding.walletId,
      status: onboarding.status,
      currentStep: onboarding.currentStep,
      steps: ONBOARDING_STEP_KEYS.map((key) => ({
        key,
        status:
          onboarding.steps[key] === 'COMPLETADO'
            ? 'COMPLETADO'
            : onboarding.currentStep === key
              ? 'ACTUAL'
              : 'PENDIENTE',
      })),
    };
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.controller.ts
// Cubre: 3.1, 3.2 y 3.3
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  start() {
    return this.onboardingService.start();
  }

  @Get(':id')
  getProgress(@Param('id') id: string) {
    return this.onboardingService.getProgress(id);
  }

  @Put(':id/steps/:stepKey')
  completeStep(
    @Param('id') id: string,
    @Param('stepKey') stepKey: string,
    @Body() payload: unknown,
  ) {
    return this.onboardingService.completeStep(id, stepKey, payload);
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.module.ts
// Cubre: 2.2, 3.1, 3.2 y 3.3
import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { IdentityMockService } from './identity-mock.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PersistenceModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, IdentityMockService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
```

```ts
// backend-nestjs/src/wallet/wallet.service.ts
// Cubre: 4.1 y 4.2
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { OnboardingStore } from '../persistence/onboarding-store';

@Injectable()
export class WalletService {
  constructor(private readonly store: OnboardingStore) {}

  getWallet(id: string) {
    const wallet = this.store.getWallet(id);
    if (!wallet) {
      throw new ApiError(
        404,
        'WALLET_NOT_FOUND',
        'No se encontró la wallet solicitada.',
      );
    }

    return {
      id: wallet.id,
      onboardingId: wallet.onboardingId,
      phone: wallet.phone,
      status: wallet.status,
    };
  }
}
```

```ts
// backend-nestjs/src/wallet/wallet.controller.ts
// Cubre: 4.1 y 4.2
import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':id')
  getWallet(@Param('id') id: string) {
    return this.walletService.getWallet(id);
  }
}
```

```ts
// backend-nestjs/src/wallet/wallet.module.ts
// Cubre: 4.1 y 4.2
import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [PersistenceModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
```

```ts
// backend-nestjs/src/app.module.ts
// Cubre: 3.1 y 4.1
import { Module } from '@nestjs/common';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [OnboardingModule, WalletModule],
})
export class AppModule {}
```

```ts
// backend-nestjs/src/main.ts
// Cubre: 3.1 y 4.1
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
```

```ts
// backend-nestjs/src/onboarding/identity-mock.service.spec.ts
// Cubre: 2.2
import { IdentityMockService } from './identity-mock.service';

describe('IdentityMockService', () => {
  const service = new IdentityMockService();

  it('acepta un documento con formato válido sin invocar un proveedor externo', () => {
    expect(service.verifyDocument('12345678')).toBe(true);
    expect(service.verifyDocument('123')).toBe(false);
  });

  it('acepta el OTP de prueba y rechaza uno distinto fuera de producción', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
      expect(service.verifyOtp('123456')).toBe(true);
      expect(service.verifyOtp('000000')).toBe(false);
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });
});
```

```ts
// backend-nestjs/src/onboarding/onboarding.service.spec.ts
// Cubre: 3.1, 3.2, 3.3, 4.1, 4.2 y 5.1
import { ApiError } from '../common/api-error';
import { OnboardingStore } from '../persistence/onboarding-store';
import { IdentityMockService } from './identity-mock.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let store: OnboardingStore;
  let service: OnboardingService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    store = new OnboardingStore();
    service = new OnboardingService(store, new IdentityMockService());
  });

  it('inicia con los tres pasos y datos como paso actual', () => {
    const progress = service.start();

    expect(progress.currentStep).toBe('datos');
    expect(progress.steps.map((step) => step.key)).toEqual([
      'datos',
      'identidad',
      'verificacion',
    ]);
    expect(progress.steps[0].status).toBe('ACTUAL');
  });

  it('rechaza un celular inválido y no avanza el paso', async () => {
    const progress = service.start();

    await expect(
      service.completeStep(progress.onboardingId, 'datos', {
        name: 'Usuario Sintético',
        phone: '123',
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        fields: {
          phone: 'Ingresa un celular de 9 dígitos que empiece con 9.',
        },
      },
    });

    expect(
      service.getProgress(progress.onboardingId).currentStep,
    ).toBe('datos');
  });

  it('rechaza pasos fuera de orden sin modificar el progreso', async () => {
    const progress = service.start();

    await expect(
      service.completeStep(progress.onboardingId, 'verificacion', {
        code: '123456',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(
      service.getProgress(progress.onboardingId).currentStep,
    ).toBe('datos');
  });

  it('activa la wallet al finalizar y registra los eventos en orden', async () => {
    const progress = service.start();

    await service.completeStep(progress.onboardingId, 'datos', {
      name: 'Usuario Sintético',
      phone: '912345678',
    });
    await service.completeStep(progress.onboardingId, 'identidad', {
      documentNumber: '12345678',
    });
    const completed = await service.completeStep(
      progress.onboardingId,
      'verificacion',
      { code: '123456' },
    );

    expect(completed.status).toBe('COMPLETADO');
    expect(completed.currentStep).toBeNull();
    expect(store.getWallet(progress.walletId)?.status).toBe('ACTIVA');
    expect(
      store.getEventsFor(progress.onboardingId).map((event) => event.type),
    ).toEqual([
      'onboarding_started',
      'onboarding_step_completed',
      'onboarding_step_completed',
      'onboarding_step_completed',
      'onboarding_completed',
    ]);
  });

  it('mantiene la wallet pendiente mientras queden pasos', async () => {
    const progress = service.start();

    await service.completeStep(progress.onboardingId, 'datos', {
      name: 'Usuario Sintético',
      phone: '912345678',
    });

    expect(store.getWallet(progress.walletId)?.status).toBe(
      'PENDIENTE_ONBOARDING',
    );
  });

  it('rechaza el OTP incorrecto sin avanzar', async () => {
    const progress = service.start();
    await service.completeStep(progress.onboardingId, 'datos', {
      name: 'Usuario Sintético',
      phone: '912345678',
    });
    await service.completeStep(progress.onboardingId, 'identidad', {
      documentNumber: '12345678',
    });

    await expect(
      service.completeStep(progress.onboardingId, 'verificacion', {
        code: '000000',
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      },
    });

    expect(
      service.getProgress(progress.onboardingId).currentStep,
    ).toBe('verificacion');
  });
});
```

**Pendiente:** La persistencia durable está en memoria porque SQLite/TypeORM figura como propuesta por confirmar en G1; no se crean tablas ni migraciones sin ese acuerdo. W2 1.1 corresponde al Architect y W2 1.2 a AI Engineer 2; no se implementan aquí ni se inventa el saldo inicial. Se incluyen pruebas, pero no se afirma que hayan sido ejecutadas.