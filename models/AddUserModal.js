const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require('validator');

const AddressSchema = mongoose.Schema({
    city: String,
    state: String,
    country: String,
});
const accessSchema = new mongoose.Schema({
    module: { type: String, required: true },
    submodules: [{ type: String, required: true }],

    
  });
const userAccessSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Your email address is required"],
        unique: true,
        lowercase: true,
        validate: (value) => {
            return validator.isEmail(value);
        }
    },
    firstName: {
        type: String,
    },
    userName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    phone: {
        type: String,
    },
    address: {
        type: AddressSchema,
    },
    password: {
        type: String,
        required: [true, "Your password is required"],
    },
    role: {
        type: String,
        enum: ["admin", "student", "super admin","placement director"],
        default: "student", 
    },
    access: {
        type: [accessSchema],
        required: true
      }, 
    createdAt: {
        type: Date,
        default: new Date(),
    },
    createdBy: { 
        type: String, 
        default: 'self', 
        required: [true, "createdBy is required"] 
    },
    firstTimeLoginDone: {
        type: Boolean,
        default: true,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    dob: {
        type: Date,
    },
    image: {
        type: String,
        required:true
    }

});

userAccessSchema.pre("save", async function () {
    this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User_Access", userAccessSchema);
