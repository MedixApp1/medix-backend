import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { Model } from 'mongoose';
import { CreateAppointmentDto } from './dto/appointment.dto';
import { Gemini } from 'src/common/utils/gemini';
import { UserService } from '../user/user.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    private readonly userService: UserService,
    private readonly geminiService: Gemini,
  ) {}
  async createAppointment(
    userId: string,
    payload: CreateAppointmentDto,
  ): Promise<Appointment> {
    const transcript = await this.geminiService.generateTranscriptFromAudio(
      payload.url,
      payload.mimeType,
    );
    const newAppointment = await this.appointmentModel.create({
      transcript: transcript,
    });
    await this.userService.addAppointmentToUser(userId, newAppointment.id);
    return newAppointment;
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    return await this.appointmentModel.findById(id);
  }
}
