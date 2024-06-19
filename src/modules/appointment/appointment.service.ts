import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { Model } from 'mongoose';
import {
  CreateAppointmentDto,
  DeleteAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
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

  async createAppointmentNote(body: UpdateAppointmentDto) {
    const { appointmentId, country } = body;
    const currentAppointment =
      await this.appointmentModel.findById(appointmentId);

    if (!currentAppointment) {
      throw new BadRequestException('Invalid Appointment ID');
    }
    const { note } = await this.geminiService.generateNotesFromTranscript(
      currentAppointment.transcript.join('/n'),
    );
    const updatedAppointment = await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      {
        note,
      },
      { new: true },
    );
    return updatedAppointment;
  }

  async createAppointmentPatientInstructions(body: UpdateAppointmentDto) {
    const { appointmentId } = body;

    const currentAppointment =
      await this.appointmentModel.findById(appointmentId);

    if (!currentAppointment) {
      throw new BadRequestException('Invalid Appointment ID');
    }
    const patientInstructions =
      await this.geminiService.generatePatientInstructionsfFromTranscript(
        currentAppointment.transcript.join('/n'),
      );
    console.log(patientInstructions);
    const updatedAppointment = await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      {
        patientInstructions: patientInstructions,
      },
      { new: true },
    );
    return updatedAppointment;
  }
  async getAppointmentById(id: string): Promise<Appointment> {
    return await this.appointmentModel.findById(id);
  }

  async updateAppointment(appointmentId: DeleteAppointmentDto, body: any) {
    return this.appointmentModel.findByIdAndUpdate(appointmentId, body, {
      new: true,
    });
  }

  async deleteAppointment(payload: DeleteAppointmentDto) {
    const {appointmentId} = payload
    return this.appointmentModel.findByIdAndDelete(appointmentId);
  }
}
