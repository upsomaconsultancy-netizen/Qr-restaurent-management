require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    let superAdmin = await User.findOne({
      email: "kishan817835@gmail.com",
    });

    if (superAdmin) {
      console.log("❌ Super Admin already exists");
      return;
    }

    superAdmin = new User({
      name: "Upsoma Restro",
      email: "kishan817835@gmail.com",
      role: "SUPER_ADMIN",
    });

    await superAdmin.setPassword("Kishan@8178");
    await superAdmin.save();

    console.log("✅ Super Admin Created Successfully");
    console.log("Email: kishan817835@gmail.com");
    console.log("Password: Kishan@8178");
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();