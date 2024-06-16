import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../user/user.schema';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true, unique: true })
  transcript: [
    {
      text: string;
      speaker: string;
      start_offset_ms: number;
      end_offset_ms: number;
    },
  ];

  
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
