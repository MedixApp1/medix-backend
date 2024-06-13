import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { BaseHelper } from 'src/common/utils/helper';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: () => {
          const userSchema = UserSchema;
          userSchema.pre('save', async function (next) {
            if (!this.isModified('password')) {
              return next();
            }

            try {
              const hashedPassword = await BaseHelper.hashData(this.password);
              this.password = hashedPassword;
              next();
            } catch (error: any) {
              next(error);
            }
          });
          userSchema.pre(/^update/, async function (next) {
            // 'this' refers to the query being executed (e.g., findOneAndUpdate)
            if (this['password']) {
              try {
                const hashedPassword = await BaseHelper.hashData(
                  this['password'],
                );
                this['password'] = hashedPassword;
                next();
              } catch (error: any) {
                next(error);
              }
            } else {
              // If password is not being updated, proceed to the next middleware
              next();
            }
          });
          return userSchema;
        },
      },
    ]),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
