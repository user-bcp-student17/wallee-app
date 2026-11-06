import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database.config';
import { DatabaseSeeder } from './database.seed';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions() })],
  providers: [DatabaseSeeder],
})
export class DatabaseModule {}
