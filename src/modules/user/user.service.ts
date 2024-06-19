import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(payload: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ email: payload.email });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    return await this.userModel.create(payload);
  }

  async getUser(userId: string): Promise<User> {
    return await this.userModel.findById(userId).select('-password');
  }

  async getAllAppointmentsByUser(userId: string) {
    return await this.userModel
      .findById(userId)
      .populate('appointments')
      .select('-password');
  }

  async getUserByEmailIncludePassword(email: string) {
    return await this.userModel.findOne({ email }).select('+password');
  }

  async updateUser(userId: string, payload: CreateUserDto): Promise<User> {
    return await this.userModel
      .findByIdAndUpdate(userId, payload, { new: true })
      .select('-password');
  }

  async addAppointmentToUser(
    userId: string,
    appointmentId: string,
  ): Promise<User> {
    return await this.userModel.findByIdAndUpdate(
      userId,
      { $push: { appointments: appointmentId } },
      { new: true },
    );
  }

  async deleteUser(userId: string): Promise<User> {
    return await this.userModel.findByIdAndDelete(userId);
  }
}
