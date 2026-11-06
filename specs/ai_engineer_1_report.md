```ts
// backend-nestjs/src/onboarding/onboarding.types.ts
// Cubre: W1-AC1-T1/T2 (estructura de pasos y progreso).
export const ONBOARDING_STEPS = ['datos', 'identidad', 'verificacion'] as const;

export type StepKey = (typeof ONBOARDING_STEPS)[number];
export type StepStatus = 'PENDIENTE' | 'COMPLETADO';

export interface OnboardingStep {
  id: StepKey;
  status: StepStatus;
}

export interface OnboardingResponse {
  onboardingId: string;
  walletId: string;
  status: 'EN_CURSO' | 'COMPLETADO';
  currentStep: StepKey | null;
  steps: OnboardingStep[];
  walletStatus: 'PENDIENTE_ONBOARDING' | 'ACTIVA';
}

export interface DatosStepPayload {
  nombre: string;
  celular: string;
}

export interface IdentidadStepPayload {
  documento: string;
}

export interface VerificacionStepPayload {
  codigo: string;
}

export type StepPayload =
  | DatosStepPayload
  | IdentidadStepPayload
  | VerificacionStepPayload;
```

```ts
// backend-nestjs/src/onboarding/dto/update-datos.dto.ts
// Cubre: W1-AC2-T1/T2 (nombre obligatorio y celular válido).
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateDatosDto {
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'Completa el campo nombre.' })
  nombre!: string;

  @IsString({ message: 'El celular debe ser texto.' })
  @Matches(/^9\d{8}$/, {
    message: 'El celular debe tener 9 dígitos y empezar con 9.',
  })
  celular!: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/update-identidad.dto.ts
// Cubre: W1-AC2-T1/T2 (documento obligatorio de 8 dígitos).
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateIdentidadDto {
  @IsString({ message: 'El documento debe ser texto.' })
  @Matches(/^\d{8}$/, {
    message: 'El documento debe tener exactamente 8 dígitos.',
  })
  @IsNotEmpty({ message: 'Completa el campo documento.' })
  documento!: string;
}
```

```ts
// backend-nestjs/src/onboarding/dto/update-verificacion.dto.ts
// Cubre: W1-AC2-T1/T2 (código de verificación obligatorio).
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateVerificacionDto {
  @IsString({ message: 'El código debe ser texto.' })
  @IsNotEmpty({ message: 'Completa el campo codigo.' })
  codigo!: string;
}
```

```ts
// backend-nestjs/src/onboarding/onboarding-validation.ts
// Cubre: W1-AC2-T2 (400 VALIDATION_ERROR con el campo a corregir).
import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function validationException(
  errors: ValidationError[],
): BadRequestException {
  const fields: Record<string, string[]> = {};

  const collect = (items: ValidationError[], parent = ''): void => {
    for (const error of items) {
      const field = parent ? `${parent}.${error.property}` : error.property;
      const messages = Object.values(error.constraints ?? {});
      if (messages.length > 0) fields[field] = messages;
      if (error.children?.length) collect(error.children, field);
    }
  };

  collect(errors);

  if (Object.keys(fields).length === 0) {
    fields.body = ['Revisa los datos enviados.'];
  }

  const field = Object.keys(fields)[0];
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: `Revisa el campo ${field}.`,
    field,
    fields,
  });
}
```

```ts
// backend-nestjs/src/onboarding/onboarding-step-validation.ts
// Cubre: W1-AC2-T1/T2 (validación de DTO según el paso solicitado).
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDatosDto } from './dto/update-datos.dto';
import { UpdateIdentidadDto } from './dto/update-identidad.dto';
import { UpdateVerificacionDto } from './dto/update-verificacion.dto';
import { validationException } from './onboarding-validation';
import { StepKey, StepPayload } from './onboarding.types';

const DTO_BY_STEP = {
  datos: UpdateDatosDto,
  identidad: UpdateIdentidadDto,
  verificacion: UpdateVerificacionDto,
} as const;

export async function validateStepPayload(
  stepKey: string,
  body: unknown,
): Promise<{ stepKey: StepKey; payload: StepPayload }> {
  if (!(stepKey in DTO_BY_STEP)) {
    throw new BadRequestException({
      code: 'INVALID_STEP',
      message: 'El paso solicitado no es válido.',
    });
  }

  const key = stepKey as StepKey;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Envía un objeto con los datos del paso.',
      field: 'body',
      fields: { body: ['Envía un objeto con los datos del paso.'] },
    });
  }

  const DtoClass = DTO_BY_STEP[key];
  const dto = plainToInstance(DtoClass, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) throw validationException(errors);

  return { stepKey: key, payload: dto as StepPayload };
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.service.ts
// Cubre: W1-AC1-T1/T2 y W1-AC2-T1/T2; W1-AC3/W1-AC4 quedan fuera de esta tarea.
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DatosStepPayload,
  IdentidadStepPayload,
  ONBOARDING_STEPS,
  OnboardingResponse,
  StepKey,
  StepPayload,
  StepStatus,
  VerificacionStepPayload,
} from './onboarding.types';

interface OnboardingRecord {
  id: string;
  walletId: string;
  status: 'EN_CURSO' | 'COMPLETADO';
  completedSteps: Set<StepKey>;
  datos?: DatosStepPayload;
  identidad?: IdentidadStepPayload;
  verificacion?: VerificacionStepPayload;
}

@Injectable()
export class OnboardingService {
  /**
   * Almacenamiento temporal para el alcance de las tareas 3.1–3.3.
   * No es persistencia durable: la decisión de persistencia sigue PENDIENTE
   * de confirmación del Product Owner (SQLite/TypeORM está propuesto).
   */
  private readonly records = new Map<string, OnboardingRecord>();

  create(): OnboardingResponse {
    const record: OnboardingRecord = {
      id: `onb_${randomUUID()}`,
      walletId: `wal_${randomUUID()}`,
      status: 'EN_CURSO',
      completedSteps: new Set<StepKey>(),
    };

    this.records.set(record.id, record);
    return this.toResponse(record);
  }

  getById(id: string): OnboardingResponse {
    const record = this.findRecord(id);
    return this.toResponse(record);
  }

  completeStep(
    id: string,
    stepKey: StepKey,
    payload: StepPayload,
  ): OnboardingResponse {
    const record = this.findRecord(id);
    const currentStep = this.getCurrentStep(record);

    if (currentStep !== stepKey) {
      throw new ConflictException({
        code: 'STEP_OUT_OF_ORDER',
        message: 'Completa los pasos en el orden indicado.',
        currentStep,
        requestedStep: stepKey,
      });
    }

    switch (stepKey) {
      case 'datos':
        record.datos = payload as DatosStepPayload;
        break;
      case 'identidad':
        record.identidad = payload as IdentidadStepPayload;
        break;
      case 'verificacion':
        record.verificacion = payload as VerificacionStepPayload;
        break;
    }

    record.completedSteps.add(stepKey);

    if (record.completedSteps.size === ONBOARDING_STEPS.length) {
      record.status = 'COMPLETADO';
    }

    return this.toResponse(record);
  }

  private findRecord(id: string): OnboardingRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException({
        code: 'ONBOARDING_NOT_FOUND',
        message: 'No se encontró el onboarding solicitado.',
      });
    }
    return record;
  }

  private getCurrentStep(record: OnboardingRecord): StepKey | null {
    return (
      ONBOARDING_STEPS.find((step) => !record.completedSteps.has(step)) ?? null
    );
  }

  private toResponse(record: OnboardingRecord): OnboardingResponse {
    const steps = ONBOARDING_STEPS.map((id) => ({
      id,
      status: (
        record.completedSteps.has(id) ? 'COMPLETADO' : 'PENDIENTE'
      ) as StepStatus,
    }));

    return {
      onboardingId: record.id,
      walletId: record.walletId,
      status: record.status,
      currentStep: this.getCurrentStep(record),
      steps,
      walletStatus:
        record.status === 'COMPLETADO'
          ? 'ACTIVA'
          : 'PENDIENTE_ONBOARDING',
    };
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.controller.ts
// Cubre: W1-AC1-T1/T2, W1-AC2-T1/T2 y W1-AC2-T3 (orden estricto).
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { validateStepPayload } from './onboarding-step-validation';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  create() {
    return this.onboardingService.create();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.onboardingService.getById(id);
  }

  @Put(':id/steps/:stepKey')
  async completeStep(
    @Param('id') id: string,
    @Param('stepKey') stepKey: string,
    @Body() body: unknown,
  ) {
    const validated = await validateStepPayload(stepKey, body);
    return this.onboardingService.completeStep(
      id,
      validated.stepKey,
      validated.payload,
    );
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.module.ts
// Cubre: W1-AC1-T1/T2 y W1-AC2-T1/T2 (composición del feature).
import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
```

```ts
// backend-nestjs/src/integrations/bcp-wallet-mock/bcp-wallet-mock.service.ts
// Cubre: solicitud del feedback humano de conectar el backend al mock BCP.
// El contrato funcional de esta respuesta y su relación con W1 están PENDIENTES.
import {
  GatewayTimeoutException,
  Injectable,
  BadGatewayException,
} from '@nestjs/common';

const BCP_WALLET_MOCK_URL =
  'https://bcp-wallet-mock.yefri.workers.dev/groups/7?latency=0';

@Injectable()
export class BcpWalletMockService {
  async getGroup(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(BCP_WALLET_MOCK_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException({
          code: 'UPSTREAM_API_ERROR',
          message: 'El mock BCP no respondió correctamente.',
        });
      }

      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > 1_000_000) {
        throw new BadGatewayException({
          code: 'UPSTREAM_RESPONSE_TOO_LARGE',
          message: 'La respuesta del mock BCP excede el tamaño permitido.',
        });
      }

      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new BadGatewayException({
          code: 'UPSTREAM_INVALID_RESPONSE',
          message: 'El mock BCP no devolvió JSON válido.',
        });
      }
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (controller.signal.aborted) {
        throw new GatewayTimeoutException({
          code: 'UPSTREAM_TIMEOUT',
          message: 'El mock BCP tardó demasiado en responder.',
        });
      }

      throw new BadGatewayException({
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'No se pudo consultar el mock BCP.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

```ts
// backend-nestjs/src/integrations/bcp-wallet-mock/bcp-wallet-mock.controller.ts
// Cubre: feedback humano de conexión al mock BCP; ruta de proxy propuesta.
// La ruta y el uso de los datos deben confirmarse con Product Owner.
import { Controller, Get } from '@nestjs/common';
import { BcpWalletMockService } from './bcp-wallet-mock.service';

@Controller('integrations/bcp-wallet-mock')
export class BcpWalletMockController {
  constructor(private readonly bcpWalletMock: BcpWalletMockService) {}

  @Get('group')
  getGroup(): Promise<unknown> {
    return this.bcpWalletMock.getGroup();
  }
}
```

```ts
// backend-nestjs/src/integrations/bcp-wallet-mock/bcp-wallet-mock.module.ts
// Cubre: feedback humano de conexión al mock BCP.
import { Module } from '@nestjs/common';
import { BcpWalletMockController } from './bcp-wallet-mock.controller';
import { BcpWalletMockService } from './bcp-wallet-mock.service';

@Module({
  controllers: [BcpWalletMockController],
  providers: [BcpWalletMockService],
})
export class BcpWalletMockModule {}
```

```ts
// backend-nestjs/src/app.module.ts
// Cubre: registro de los módulos del feature W1 y del adaptador mock solicitado.
import { Module } from '@nestjs/common';
import { BcpWalletMockModule } from './integrations/bcp-wallet-mock/bcp-wallet-mock.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule, BcpWalletMockModule],
})
export class AppModule {}
```

```ts
// backend-nestjs/src/main.ts
// Cubre: validación HTTP global y formato 400 VALIDATION_ERROR para DTOs Nest.
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { validationException } from './onboarding/onboarding-validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        validationException(errors) ??
        new BadRequestException({ code: 'VALIDATION_ERROR' }),
    }),
  );

  await app.listen(Number(process.env.PORT) || 3000);
}

void bootstrap();
``` 

**PENDIENTE:** confirmar con Product Owner si el mock BCP debe intervenir en algún paso de W1 y qué campos/efectos se esperan de su respuesta. La ruta de proxy incluida solo permite consultar el endpoint indicado; no modifica el flujo de onboarding ni se presenta como integración real. La persistencia durable también sigue pendiente de aprobación.