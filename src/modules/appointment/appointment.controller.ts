import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/appointment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Gemini } from 'src/common/utils/gemini';
import { ResponseMessage } from 'src/common/decorators/response.decorator';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constant';
import { LoggedInUserDecorator } from 'src/common/decorators/logged_in_user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('appointment')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly geminiService: Gemini,
  ) {}
  @Post('/audio/upload')
  @ResponseMessage(RESPONSE_CONSTANT.APPOINTMENT.UPLOAD_AUDIO_SUCCESS)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    const uploadResult = await this.geminiService.uploadFile(
      file,
      file.mimetype,
    );
    return uploadResult;
  }

  @Post('/')
  @ResponseMessage(RESPONSE_CONSTANT.APPOINTMENT.CREATE_APPOINTMENT_SUCCESS)
  async createAppointment(
    @Body() body: CreateAppointmentDto,
    @LoggedInUserDecorator() user: { id: string },
  ) {
    const newAppointment = await this.appointmentService.createAppointment(
      user.id,
      body,
    );

    if (!newAppointment) {
      throw new BadRequestException('Failed to create appointment');
    }
    return newAppointment;
  }
}
