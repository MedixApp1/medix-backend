import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../user/user.schema';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  transcript: [string];

  @Prop(
    raw({
      title: String,
      sections: [
        raw({ key: String, title: String, text: String, content: String }),
      ],
    }),
  )
  note: Record<string, any>;
  @Prop(
    raw({
      action: String,
      details: String,
    }),
  )
  patientInstructions: Record<string, any>;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
