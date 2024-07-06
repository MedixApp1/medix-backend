import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../user/user.schema';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true , unique: false})
  transcript: [string];

  @Prop({ required: true })
  description: string;

  @Prop(
    raw({
      title: String,
      sections: [
        raw({ key: String, title: String, text: String, content: Array }),
      ],
    }),
  )
  note: Record<string, any>;
  @Prop(
    raw({
      messageFromDoctor: String,
      medication: [
        {
          action: String,
          details: String,
        },
      ],
      lifestyleChanges: [
        {
          action: String,
          details: String,
        },
      ],
      followUp: [
        {
          action: String,
          details: String,
        },
      ],
      otherInstructions: [
        {
          action: String,
          details: String,
        },
      ],
    }),
  )
  patientInstructions: Record<string, any>;
  @Prop({ required: true })
  duration: number;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
