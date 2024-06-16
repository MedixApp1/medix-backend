import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { Model } from 'mongoose';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}
  async createAppointment(payload: any): Promise<Appointment> {
    return await this.appointmentModel.create(payload);
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    return await this.appointmentModel.findById(id);
  }
}
