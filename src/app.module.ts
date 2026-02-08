import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import midtransConfig from './config/midtrans.config';

// Global Modules
import { DatabaseModule } from './database/prisma.module';
import { MailModule } from './providers/mail/mail.module';
import { StorageModule } from './providers/storage/storage.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { CommunityModule } from './modules/community/community.module';
import { EventsModule } from './modules/events/events.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, midtransConfig],
    }),

    // Global Infrastructure Modules
    DatabaseModule,
    MailModule,
    StorageModule,

    // Feature Modules (Domain-Driven)
    AuthModule,
    CommunityModule,
    EventsModule,
    FinanceModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
