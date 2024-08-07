import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  DeleteAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
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
  ) { }
  
  @Post('/audio/upload')
  @ResponseMessage(RESPONSE_CONSTANT.APPOINTMENT.UPLOAD_AUDIO_SUCCESS)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    const uploadResult = (await this.geminiService.uploadFile(
      file,
      file.mimetype,
    )) as unknown as string;
    if (!uploadResult) {
      throw new BadRequestException(
        'Error in uploading audio to cloud storage',
      );
    }
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
      body.url,
      body.mimeType,
    );

    if (!newAppointment) {
      throw new BadRequestException('Failed to create appointment');
    }
    return newAppointment;
  }

  @Post('/note')
  @ResponseMessage(
    RESPONSE_CONSTANT.APPOINTMENT.CREATE_APPOINTMENT_NOTE_SUCCESS,
  )
  async createAppointmentNote(@Body() body: UpdateAppointmentDto) {
    const newAppointment =
      await this.appointmentService.createAppointmentNote(body);

    if (!newAppointment) {
      throw new BadRequestException('Failed to create appointment');
    }
    return newAppointment;
  }

  @Post('/patient-instructions')
  @ResponseMessage(
    RESPONSE_CONSTANT.APPOINTMENT
      .CREATE_APPOINTMENT_PATIENT_INSTRUCTIONS_SUCCESS,
  )
  async createAppointmentPatientInstructions(
    @Body() body: UpdateAppointmentDto,
  ) {
    const newAppointment =
      await this.appointmentService.createAppointmentPatientInstructions(body);

    if (!newAppointment) {
      throw new BadRequestException('Failed to create appointment');
    }
    return newAppointment;
  }
  @Get('/:id')
  @ResponseMessage(RESPONSE_CONSTANT.APPOINTMENT.GET_APPOINTMENT_SUCCESS)
  async getAppointmentById(@Param() id: string) {
    return this.appointmentService.getAppointmentById(id);
  }

  @Put('/')
  async updateAppointment(@Body() body) {
    const { appointmentId, details } = body;
    return this.appointmentService.updateAppointment(appointmentId, details);
  }

  @Delete('/')
  async deleteAppointment(@Param() payload: DeleteAppointmentDto) {
    this.appointmentService.deleteAppointment(payload);
  }
}
