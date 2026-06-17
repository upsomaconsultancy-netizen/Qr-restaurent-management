const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

const userSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', index: true, default: null }, // null => SUPER_ADMIN
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', index: true, default: null }, // required for WAITER/KITCHEN
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    lastLoginAt: Date,
    lastLoginIp: String
  },
  { timestamps: true }
);

userSchema.index({ email: 1, restaurantId: 1 }, { unique: true });
userSchema.index({ email: 1, isDeleted: 1 });

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 6);
};
userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
