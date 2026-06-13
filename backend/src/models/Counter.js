const mongoose = require('mongoose');

/** Per-restaurant atomic counters (order numbers). */
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // `${restaurantId}:order`
  seq: { type: Number, default: 0 }
});

counterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
