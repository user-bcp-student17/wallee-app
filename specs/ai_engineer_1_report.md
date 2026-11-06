```ts
// backend-nestjs/src/onboarding/domain/onboarding.model.ts
// Cubre 3.1 y 3.3: estados, pasos y orden del onboarding.

export const ONBOARDING_STEP_KEYS = [
  "datos",
  "identidad",
  "verificacion",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];
export type OnboardingStepStatus = "PENDIENTE" | "COMPLETADO";
export type OnboardingStatus = "EN_CURSO" | "COMPLETADO";
export type WalletStatus = "PENDIENTE_ONBOARDING" | "ACTIVA";

export interface OnboardingStep {
  id: OnboardingStepKey;
  status: OnboardingStepStatus;
}

export interface OnboardingProgress {
  onboardingId: string;
  walletId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepKey | null;
  steps: OnboardingStep[];
  walletStatus: WalletStatus;
}

export interface OnboardingRecord {
  id: string;
  walletId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepKey | null;
  steps: OnboardingStep[];
  walletStatus: WalletStatus;
  data: Partial<Record<OnboardingStepKey, Record<string, string>>>;
}

export function isOnboardingStepKey(value: string): value is OnboardingStepKey {
  return ONBOARDING_STEP_KEYS.some((key) => key === value);
}
```

```ts
// backend-nestjs/src/onboarding/dto/step-payload.dto.ts
// Cubre 3.2: DTOs y reglas de validación por paso.

import { IsNotEmpty, IsString, Matches } from "class-validator";

export class DatosStepDto {
  @IsString({ message: "El nombre debe ser un texto." })
  @IsNotEmpty({ message: "El nombre es obligatorio." })
  @Matches(/\S/, { message: "El nombre es obligatorio." })
  nombre!: string;

  @IsString({ message: "El celular debe ser un texto." })
  @IsNotEmpty({ message: "El celular es obligatorio." })
  @Matches(/^9\d{8}$/, {
    message: "El celular debe tener 9 dígitos y empezar con 9.",
  })
  celular!: string;
}

export class IdentidadStepDto {
  @IsString({ message: "El documento debe ser un texto." })
  @IsNotEmpty({ message: "El documento es obligatorio." })
  @Matches(/^\d{8}$/, {
    message: "El documento debe tener 8 dígitos.",
  })
  documento!: string;
}

export class VerificacionStepDto {
  @IsString({ message: "El código debe ser un texto." })
  @IsNotEmpty({ message: "El código es obligatorio." })
  @Matches(/\S/, { message: "El código es obligatorio." })
  codigo!: string;
}
```

```ts
// backend-nestjs/src/onboarding/application/onboarding.service.ts
// Cubre 3.1 y 3.3: inicio, consulta, progreso y rechazo de pasos fuera de orden.

import { randomUUID } from "node:crypto";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  isOnboardingStepKey,
  ONBOARDING_STEP_KEYS,
  OnboardingProgress,
  OnboardingRecord,
  OnboardingStepKey,
} from "../domain/onboarding.model";

@Injectable()
export class OnboardingService {
  // Persistencia en memoria para este alcance. La persistencia duradera queda PENDIENTE
  // de confirmar la decisión de almacenamiento indicada en el diseño.
  private readonly onboardings = new Map<string, OnboardingRecord>();

  start(): OnboardingProgress {
    const onboardingId = `onb_${randomUUID()}`;
    const walletId = `wal_${randomUUID()}`;

    const record: OnboardingRecord = {
      id: onboardingId,
      walletId,
      status: "EN_CURSO",
      currentStep: ONBOARDING_STEP_KEYS[0],
      steps: ONBOARDING_STEP_KEYS.map((id) => ({ id, status: "PENDIENTE" })),
      walletStatus: "PENDIENTE_ONBOARDING",
      data: {},
    };

    this.onboardings.set(record.id, record);
    return this.toProgress(record);
  }

  getProgress(id: string): OnboardingProgress {
    const record = this.onboardings.get(id);
    if (!record) {
      throw new NotFoundException({
        statusCode: 404,
        code: "ONBOARDING_NOT_FOUND",
        message: "No se encontró el onboarding solicitado.",
      });
    }

    return this.toProgress(record);
  }

  completeStep(
    id: string,
    stepKey: string,
    payload: Record<string, string>,
  ): OnboardingProgress {
    const record = this.onboardings.get(id);
    if (!record) {
      throw new NotFoundException({
        statusCode: 404,
        code: "ONBOARDING_NOT_FOUND",
        message: "No se encontró el onboarding solicitado.",
      });
    }

    if (!isOnboardingStepKey(stepKey) || record.currentStep !== stepKey) {
      throw new ConflictException({
        statusCode: 409,
        code: "STEP_OUT_OF_ORDER",
        message: "Completa primero el paso actual del onboarding.",
      });
    }

    const step = record.steps.find((item) => item.id === stepKey);
    if (!step || step.status === "COMPLETADO") {
      throw new ConflictException({
        statusCode: 409,
        code: "STEP_OUT_OF_ORDER",
        message: "El paso solicitado no está disponible.",
      });
    }

    record.data[stepKey] = payload;
    step.status = "COMPLETADO";

    const currentIndex = ONBOARDING_STEP_KEYS.indexOf(stepKey as OnboardingStepKey);
    const nextStep = ONBOARDING_STEP_KEYS[currentIndex + 1] ?? null;

    if (nextStep) {
      record.currentStep = nextStep;
    } else {
      record.currentStep = null;
      record.status = "COMPLETADO";
      record.walletStatus = "ACTIVA";
    }

    return this.toProgress(record);
  }

  private toProgress(record: OnboardingRecord): OnboardingProgress {
    return {
      onboardingId: record.id,
      walletId: record.walletId,
      status: record.status,
      currentStep: record.currentStep,
      steps: record.steps.map((step) => ({ ...step })),
      walletStatus: record.walletStatus,
    };
  }
}
```

```ts
// backend-nestjs/src/onboarding/infrastructure/onboarding.controller.ts
// Cubre 3.1, 3.2 y 3.3: endpoints REST, validación DTO y errores con códigos estables.

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OnboardingService } from "../application/onboarding.service";
import { isOnboardingStepKey } from "../domain/onboarding.model";
import {
  DatosStepDto,
  IdentidadStepDto,
  VerificacionStepDto,
} from "../dto/step-payload.dto";

const DTO_BY_STEP = {
  datos: DatosStepDto,
  identidad: IdentidadStepDto,
  verificacion: VerificacionStepDto,
} as const;

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  start() {
    return this.onboardingService.start();
  }

  @Get(":id")
  getProgress(@Param("id") id: string) {
    return this.onboardingService.getProgress(id);
  }

  @Put(":id/steps/:stepKey")
  async completeStep(
    @Param("id") id: string,
    @Param("stepKey") stepKey: string,
    @Body() body: unknown,
  ) {
    if (!isOnboardingStepKey(stepKey)) {
      throw new BadRequestException({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "El paso indicado no es válido.",
        errors: [{ field: "stepKey", message: "Usa datos, identidad o verificacion." }],
      });
    }

    const DtoClass = DTO_BY_STEP[stepKey];
    const dto = plainToInstance(DtoClass, body as object);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (validationErrors.length > 0) {
      const errors = validationErrors.flatMap((error) => {
        const messages = Object.values(error.constraints ?? {});
        return messages.length > 0
          ? messages.map((message) => ({ field: error.property, message }))
          : [{ field: error.property, message: "El campo no es válido." }];
      });

      throw new BadRequestException({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Revisa los campos indicados.",
        errors,
      });
    }

    return this.onboardingService.completeStep(
      id,
      stepKey,
      dto as unknown as Record<string, string>,
    );
  }
}
```

```ts
// backend-nestjs/src/onboarding/onboarding.module.ts
// Cubre 3.1, 3.2 y 3.3: composición del módulo de onboarding.

import { Module } from "@nestjs/common";
import { OnboardingService } from "./application/onboarding.service";
import { OnboardingController } from "./infrastructure/onboarding.controller";

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
```

```ts
// backend-nestjs/src/app.module.ts
// Cubre 3.1, 3.2 y 3.3: registro del módulo del feature en la aplicación NestJS.

import { Module } from "@nestjs/common";
import { OnboardingModule } from "./onboarding/onboarding.module";

@Module({
  imports: [OnboardingModule],
})
export class AppModule {}
```

PENDIENTE: la persistencia duradera depende de confirmar la decisión de almacenamiento del diseño. El mock de identidad/OTP corresponde a la tarea 2.2 y no se implementa aquí. PA-10 continúa pendiente de validación.