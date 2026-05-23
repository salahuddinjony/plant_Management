import { Model, model, Schema } from "mongoose";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import { hashPassword, isPasswordHashed } from "../auth/auth.utils";
import { STAFF_ROLE_SLUGS } from "../rbac/staff-role.constants";
import { TUser } from "./users.interface";

export interface IUserModel extends Model<TUser> {
  isUserExists(id: string): Promise<TUser | null>;
  isUserByEmailOrPhone(emailOrPhone: string): Promise<TUser | null>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedAt: Date,
    jwtIssuedAt: number
  ): boolean;
}


const UserSchema = new Schema<TUser, IUserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    emailOrPhone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profilePicture: {
      type: String,
    },
    avatarId: {
      type: Schema.Types.ObjectId,
      ref: "Avatar",
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      default: USER_ROLE.USER,
    },
    staffRole: {
      type: String,
      enum: STAFF_ROLE_SLUGS,
    },
    permissions: {
      type: [String],
      default: [],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    // isLoggedIn: {
    //   type: Boolean,
    //   default: false,
    // },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const password = this.password;
  if (password && !isPasswordHashed(password)) {
    this.password = await hashPassword(password);
  }
});

UserSchema.statics.isUserExists = async function (id: string) {
  return await this.findById(id).select("+password");
};

UserSchema.statics.isUserByEmailOrPhone = async function (emailOrPhone: string) {
  return await this.findOne({ emailOrPhone }).select("+password");
};

/// return user data without password and other sensitive information
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.accessToken;
  delete obj.refreshToken;
  delete obj.emailVerificationOtp;
  delete obj.emailVerificationOtpExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetTokenExpires;
  delete obj.isDeleted;
  return obj;
};

UserSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedAt: Date,
  jwtIssuedAt: number
) {
  const passwordChangedTime = new Date(passwordChangedAt).getTime() / 1000;
  return passwordChangedTime > jwtIssuedAt;
};

// Post hook to handle E11000 duplicate key errors
// UserSchema.post("save", function (error: any, doc: any, next: any) {
//   if (error.name === "MongoServerError" && error.code === 11000) {
//     // Extract the field name causing the error
//     const field = Object.keys(error.keyValue)[0];
//     const value = error.keyValue[field];

//     next(new Error(`A user with the ${field} "${value}" already exists.`));
//   } else {
//     next(error);
//   }
// });

// Also handle updates (findOneAndUpdate)
// UserSchema.post("findOneAndUpdate", function (error: any, doc: any, next: any) {
//   if (error.name === "MongoServerError" && error.code === 11000) {
//     const field = Object.keys(error.keyValue)[0];
//     next(new Error(`The ${field} you are trying to use is already taken.`));
//   } else {
//     next(error);
//   }
// });

export const UserModel = model<TUser, IUserModel>("User", UserSchema);
