const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return (await candidatePassword) === this.password;
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};
module.exports = mongoose.model("User", userSchema);
