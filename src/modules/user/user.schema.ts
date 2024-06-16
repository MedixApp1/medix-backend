import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Appointment } from '../appointment/appointment.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, enum: ['local', 'google'], default: 'local' })
  type: string;

  @Prop({ select: false })
  password: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  })
  appointments: Appointment[];
}

export const UserSchema = SchemaFactory.createForClass(User);
