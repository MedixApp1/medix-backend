import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ENVIRONMENT } from './common/configs/environment';
import { EventModule } from './modules/event/event.module';
import { AppointmentModule } from './modules/appointment/appointment.module';

@Module({
  imports: [
    MongooseModule.forRoot(ENVIRONMENT.DB.URL),
    AuthModule,
    UserModule,
    EventModule,
    AppointmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
