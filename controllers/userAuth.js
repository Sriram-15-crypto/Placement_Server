const User = require("../models/UserModel");
const Otp = require("../models/OTPModel");
const { createSecretToken } = require("../config/secretToken");
const config = require("config");
const BASE_URL = config.get("BASE_URL");
const bcrypt = require("bcryptjs");
const emailUtil = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const JWT_TOKEN_KEY = config.get("JWT_TOKEN_KEY");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const CLIENT_URL = config.get("CLIENT_URL");
const path = require("path");
const fs = require('fs');

// For user sign up
module.exports.SignUp = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, address, password } = req.body
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res
        .status(403)
        .json({ message: [{ key: 'error', value: 'User already exists' }] })
    }

    const user = await User.create({
      email,
      firstName,
      lastName,
      phone,
      address,
      password,
    })

    // FIXME: Remove user password before sending response

    const token = createSecretToken(user._id)
    res.cookie('token', token, {
      withCredentials: true,
      httpOnly: false,
    })

    res.status(201).json({
      message: [{ key: 'success', value: 'User signed in successfully' }]
    })
  } catch (error) {
    var errors = []
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      })
    }
    res.status(400).json({ message: errors })
    console.error(error)
  }
}

// For user sign in
module.exports.SignIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: [{ key: 'error', value: 'All fields are required' }],
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: [{ key: 'error', value: 'Incorrect password or email' }],
      });
    }

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(400).json({
        message: [{ key: 'error', value: 'Incorrect password or email' }],
      });
    }

    // Check if it's the first-time login
    const isFirstTimeLogin = user.firstTimeLoginDone;

    if (isFirstTimeLogin) {
      await User.updateOne({ _id: user._id }, { firstTimeLoginDone: false });
    }
  
    const sanitizedUser = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      firstTimeLoginDone: isFirstTimeLogin
    };
    const token = createSecretToken(user._id);
   
    res.cookie('token', token, {
      withCredentials: true,
      httpOnly: false,
    });

    return res.status(201).json({
      message: [{ key: 'success', value: ` ${user.role} logged in successfully` }],
      user: sanitizedUser,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: [{ key: 'error', value: 'Internal Server Error' }],
    });
  }
};


module.exports.Logout = async (req, res) => {
  try {
    // Clear the token stored in the cookie
    res.clearCookie("token");

    return res.status(200).json({
      message: [{ key: "success", value: "Logout successful" }],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: [{ key: "error", value: "Internal Server Error" }],
    });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updates = req.body;

    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if a new profile_pic is provided in the request
    if (req.files && req.files.profile_pic) {
      const profilePicFile = req.files.profile_pic;

      if (profilePicFile.size > 3 * 1024 * 1024) {
        return res.status(400).json({
          message: "Profile picture size exceeds the 3MB limit"
        });
      }

      // Delete old profile picture if exists
      if (existingUser.profile_pic) {
        try {
          // Construct the path to the old profile picture file
          const oldProfilePicPath = path.join(__dirname, "../uploads/users", existingUser.profile_pic);
          // Delete the old profile picture file
          await fs.unlink(oldProfilePicPath);
        } catch (error) {
          console.error("Error deleting old profile picture:", error);
          // Log the error but don't interrupt the update process
        }
      }

      // Upload new profile picture
      const uniqueFileName = `${Date.now()}_${profilePicFile.name}`;
      const uploadPath = path.join(
        __dirname,
        "../uploads/users",
        uniqueFileName
      );

      try {
        await profilePicFile.mv(uploadPath);
        // Update profile_pic field in updates
        updates.profile_pic = uniqueFileName;
      } catch (err) {
        console.error("Error moving the profile picture file:", err);
        return res.status(500).json({
          message: "Internal server error"
        });
      }
    }

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    delete updatedUser.password;

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    var errors = [];
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      });
    }
    res.status(400).json({ message: errors });
    console.error(error);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const Users = await User.find();
    if (!Users || Users.length === 0) {
      console.error("No users found");
      return res.status(404).json({ message: "No users found" });
    }
    console.log("Users fetched successfully:", Users);
    res.status(200).json({
      message: [{ key: "success", value: "User section get All data" }],
      Users: Users,
    });
  } catch (error) {
    console.log("Error fetching users:", error);
    res.status(500).json({ message: [{ key: "error", value: "Internal server error" }] });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: [{ key: "error", value: "User not found" }] });
    }

    res.status(200).json({
      message: [
        { key: "success", value: "User section Id based get the data" },
      ],
      user: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal server error" }] });
  }
};

module.exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ message: [{ key: "email", value: "Email is required" }] });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: [
          { key: "error", value: "User with given email does not exist" },
        ],
      });
    }

    let token = createSecretToken(user._id);

    let resetPasswordUrl = `${BASE_URL}/ResetPassword/${user._id}/${token}`;

    let emailBody = `Greetings,
    <br/>
    <br/>
    Please click <a href="${resetPasswordUrl}"><b><i>here</i></b></a> to reset your password.
    <br/>
    <b>Note : </b> Link valid up to 3 days only.
    <br/>
    <br/>
    Regards,
    <i>Medical Tourism Team</i>`;

    let receiverEmail = user.email;
    let emailSubject = "Reset Password - Medical Tourism";

    // Send the password reset link via email using the email utility
    let isSent = await emailUtil.sendEmail(
      receiverEmail,
      emailSubject,
      emailBody
    );

    if (isSent) {
      return res.status(200).json({
        message: [
          { key: "success", value: "Password reset link sent to your email" },
        ],
      });
    } else {
      return res.status(500).json({
        message: [{ key: "error", value: "Couldn't send password reset link" }],
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: [{ key: "error", value: "Internal Server Error" }],
    });
  }
};

// For verifying reset password link for FORGOT PASSWORD SCENARIO ONLY
module.exports.VerifyResetPasswordLink = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });
    if (!user)
      return res
        .status(400)
        .json({ message: [{ key: "error", value: "Invalid link" }] });

    const token = req.params.token;

    if (!token)
      return res
        .status(400)
        .json({ message: [{ key: "error", value: "Invalid link" }] });

    jwt.verify(token, JWT_TOKEN_KEY, async (err, data) => {
      if (err) {
        return res.status(400).json({
          message: [{ key: "error", value: "Invalid link" }],
        });
      } else {
        if (data.id === req.params.id) {
          return res
            .status(200)
            .json({ message: [{ key: "success", value: "valid url" }] });
        } else {
          return res.status(400).json({
            message: [{ key: "error", value: "Invalid link" }],
          });
        }
      }
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal Server Error" }] });
  }
};

// For resetting password link FOR FORGOT PASSWORD SCENARIO ONLY
module.exports.ForgotPasswordResetPassword = async (req, res) => {
  try {
    // password and id are being received here through body only
    const password = req.body.password;
    const user = await User.findOne({ _id: req.body.id });
    if (!user) {
      return res
        .status(400)
        .send({ message: [{ key: "error", value: "Invalid link" }] });
    }


    user.password = password;
    await user.save();
    res.status(200).json({
      message: [{ key: "success", value: "Password reset successfully" }],
    });
  
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal Server Error" }] });
  }
};


const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "sricharlie31@gmail.com",
    pass: "lacwyoijqfjoauxg",
  },
});

const sendEmail = async (receiverEmail, emailSubject, emailBody) => {
  try {
    const mailOptions = {
      from: "sricharlie31@gmail.com",
      to: receiverEmail,
      subject: emailSubject,
      html: emailBody,
    };
    await transporter.sendMail(mailOptions);
    return true; // Email sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Email sending failed
  }
};

module.exports.ResetPasswordSendOTP = async (req, res) => {
  try {
    // Generate OTP
    const otp = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // Create an OTP record in the database
    const expDateTime = new Date();
    expDateTime.setMinutes(expDateTime.getMinutes() + 1);

    const OTP = await Otp.create({
      userId: req.user._id,
      otp: otp,
      subject: "RESET_PASSWORD",
      expirationTime: expDateTime.getTime(),
    });

    if (OTP) {
      const emailBody = `Greetings,
        <br/>
        <br/>
        Your One Time Password is ${otp}.
        <br/>
        <b>Note : </b> Don't share this OTP with anyone else.
        <br/>
        <br/>
        Regards,
        <i>Medical Tourism Team</i>`;

      const receiverEmail = req.user.email;
      const emailSubject = "OTP - Reset Password - Medical Tourism";

      // Send the OTP via email using the email utility
      const isSent = await emailUtil.sendEmail(
        receiverEmail,
        emailSubject,
        emailBody
      );

      if (isSent) {
        return res.status(200).json({
          message: [{ key: "success", value: "OTP sent" }],
        });
      } else {
        return res.status(500).json({
          message: [{ key: "error", value: "Couldn't send OTP" }],
        });
      }
    }

    return res.status(500).json({
      message: [{ key: "error", value: "Couldn't send OTP" }],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal Server Error" }] });
  }
};

// For verifying otp for reset password
module.exports.ResetPasswordVerifyOTP = async (req, res) => {
  try {

    let userId = req.user._id
    let subject = 'RESET_PASSWORD'
    let otp = req.body.otp

    const response = await Otp.find({ userId, subject }).sort({ createdAt: -1 }).limit(1);
    const isOTPCorrect = await bcrypt.compare(otp, response[0].otp)

    //FIXME: OTP EXPIRED MSG
    if (response.length === 0 || !isOTPCorrect || new Date().getTime() > new Date(response[0].expirationTime).getTime()) {
      return res.status(400).json({ message: [{ key: 'error', value: 'Wrong OTP' }] })
    }

    await Otp.deleteOne({ userId, subject });
    return res.status(200).json({ message: [{ key: 'success', value: 'OTP verified' }] })

  } catch (error) {
    console.log(error)
    return res
      .status(500)
      .json({ message: [{ key: 'error', value: 'Wrong OTP' }] })
  }
}
// For resetting password
module.exports.ResetPassword = async (req, res) => {
  try {
    const password = req.body.password;
    const user = await User.findOne({ _id: req.user._id });
    user.password = password;
    await user.save();
    return res.status(200).json({
      message: [{ key: "success", value: "Password reset successfully" }],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal Server Error" }] });
  }
};

// To verify user signin (Token)
module.exports.userVerify = async (req, res) => {
  try {
    const sanitizedUser = {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      phone: req.user.phone,
      address: req.user.address,
      role: req.user.role,
    };
   return res.status(200).json({
      user: sanitizedUser,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: [{ key: "error", value: "Internal Server Error", detail:error }] });
  }
};


module.exports.registerAdmin = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, address, password, gender, dob } = req.body;
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      return res
        .status(403)
        .json({ message: [{ key: "error", value: "Admin already exists" }] });
    }

    // Assuming you're also receiving a profile picture file in the request
    const profilePicFile = req.files.profile_pic;

    if (!profilePicFile) {
      return res.status(400).json({
        message: [{ key: "error", value: "Profile picture is required" }],
      });
    }

    if (profilePicFile.size > 3 * 1024 * 1024) {
      return res.status(400).json({
        message: [{ key: "error", value: "Profile picture size exceeds the 3MB limit" }],
      });
    }

    const uniqueFileName = `${Date.now()}_${profilePicFile.name}`;
    const uploadPath = path.join(
      __dirname,
      "../uploads/admin",
      uniqueFileName
    );

    try {
      await profilePicFile.mv(uploadPath);
    } catch (err) {
      console.error("Error moving the profile picture file:", err);
      return res.status(500).json({
        message: [{ key: "error", value: "Internal server error" }],
      });
    }

    const admin = await User.create({
      email,
      firstName,
      lastName,
      phone,
      address,
      password,
      gender,
      dob,
      role: "admin",
      profile_pic: uniqueFileName
    });

    // Generate a token for the new admin
    const token = createSecretToken(admin._id);

    // Send email to the admin with registration details
    const emailSubject = "Your New Admin Password";
    const emailBody = `
    <p><strong>Welcome to the MEDTOUR</strong></p>
    <p>You have been added as an admin:</p>
    <p><strong>Admin Email:</strong> ${email}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>For login, visit <a href="${CLIENT_URL}/signin">here</a></p>
    `;

    const emailSent = await emailUtil.sendEmail(email, emailSubject, emailBody);

    if (emailSent) {
      res.status(201).json({
        message: [{ key: "success", value: "Admin registered successfully" }],
        token: token // Include the token in the response
      });
    } else {
      res.status(500).json({
        message: [{ key: "error", value: "Email sending failed" }],
      });
    }
  } catch (error) {
    var errors = [];
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      });
    }
    res.status(400).json({ message: errors });
    console.error(error);
  }
};

module.exports.updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const updates = req.body;

    const existingAdmin = await User.findById(adminId);

    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if profile picture is being updated
    if (req.files && req.files.profile_pic) {
      const profilePicFile = req.files.profile_pic;

      if (profilePicFile.size > 3 * 1024 * 1024) {
        return res.status(400).json({
          message: [{ key: "error", value: "Profile picture size exceeds the 3MB limit" }],
        });
      }

      // Remove existing profile picture
      if (existingAdmin.profile_pic) {
        try {
          fs.unlinkSync(path.join(__dirname, "../uploads/admin", existingAdmin.profile_pic));
        } catch (err) {
          console.error("Error removing existing profile picture file:", err);
        }
      }

      // Upload new profile picture
      const uniqueFileName = `${Date.now()}_${profilePicFile.name}`;
      const uploadPath = path.join(
        __dirname,
        "../uploads/admin",
        uniqueFileName
      );

      try {
        await profilePicFile.mv(uploadPath);
        updates.profile_pic = uniqueFileName;
      } catch (err) {
        console.error("Error moving the profile picture file:", err);
        return res.status(500).json({
          message: [{ key: "error", value: "Internal server error" }],
        });
      }
    }

    // Update admin details
    const updatedAdmin = await User.findByIdAndUpdate(adminId, updates, {
      new: true, 
      runValidators: true, 
    });

    // Remove sensitive data from the updated admin object
    delete updatedAdmin.password;

    res.status(200).json({
      message: "Admin updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    var errors = [];
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      });
    }
    res.status(400).json({ message: errors });
    console.error(error);
  }
};

module.exports.deleteAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (deletedUser) {
      res.status(200).json({
        message: [{ key: "success", value: "Admin deleted successfully" }],
      });
    } else {
      res.status(404).json({
        message: [{ key: "error", value: "Admin not found" }],
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: [{ key: "error", value: "Internal server error" }],
    });
  }
};


module.exports.createSuperAdmin = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, address, password, gender, dob } = req.body;
    const existingSuperAdmin = await User.findOne({ email });

    if (existingSuperAdmin) {
      return res
        .status(403)
        .json({ message: [{ key: "error", value: "Super Admin already exists" }] });
    }

    // Assuming you're also receiving a profile picture file in the request
    const profilePicFile = req.files.profile_pic;

    if (!profilePicFile) {
      return res.status(400).json({
        message: [{ key: "error", value: "Profile picture is required" }],
      });
    }

    if (profilePicFile.size > 3 * 1024 * 1024) {
      return res.status(400).json({
        message: [{ key: "error", value: "Profile picture size exceeds the 3MB limit" }],
      });
    }

    const uniqueFileName = `${Date.now()}_${profilePicFile.name}`;
    const uploadPath = path.join(
      __dirname,
      "../uploads/super_admin",
      uniqueFileName
    );

    try {
      await profilePicFile.mv(uploadPath);
    } catch (err) {
      console.error("Error moving the profile picture file:", err);
      return res.status(500).json({
        message: [{ key: "error", value: "Internal server error" }],
      });
    }

    const superAdmin = await User.create({
      email,
      firstName,
      lastName,
      phone,
      address,
      password,
      gender,
      dob,
      role: "super_admin",
      profile_pic: uniqueFileName
    });

    // Generate a token for the new admin
    const token = createSecretToken(superAdmin._id);

    // Send email to the admin with registration details
    const emailSubject = "Your New Super Admin Email and  Password";
    const emailBody = `
    <p><strong>Welcome to the MEDTOUR</strong></p>
    <p>You have been added as an admin:</p>
    <p><strong>Super Admin Email:</strong> ${email}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>For login, visit <a href="${CLIENT_URL}/signin">here</a></p>
    `;

    const emailSent = await emailUtil.sendEmail(email, emailSubject, emailBody);

    if (emailSent) {
      res.status(201).json({
        message: [{ key: "success", value: "Super Admin registered successfully" }],
        token: token // Include the token in the response
      });
    } else {
      res.status(500).json({
        message: [{ key: "error", value: "Email sending failed" }],
      });
    }
  } catch (error) {
    var errors = [];
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      });
    }
    res.status(400).json({ message: errors });
    console.error(error);
  }
};

module.exports.updateSuperAdmin = async (req, res) => {
  try {
    const superAdminId = req.params.superAdminId;
    const updates = req.body;

    const existingSuperAdmin = await User.findById(superAdminId);

    if (!existingSuperAdmin) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    // Check if profile picture is being updated
    if (req.files && req.files.profile_pic) {
      const profilePicFile = req.files.profile_pic;

      if (profilePicFile.size > 3 * 1024 * 1024) {
        return res.status(400).json({
          message: [{ key: "error", value: "Profile picture size exceeds the 3MB limit" }],
        });
      }

      // Remove existing profile picture if present
      if (existingSuperAdmin.profile_pic) {
        try {
          fs.unlinkSync(path.join(__dirname, "../uploads/super_admin", existingSuperAdmin.profile_pic));
        } catch (err) {
          console.error("Error removing existing profile picture file:", err);
        }
      }

      // Upload new profile picture
      const uniqueFileName = `${Date.now()}_${profilePicFile.name}`;
      const uploadPath = path.join(
        __dirname,
        "../uploads/super_admin",
        uniqueFileName
      );

      try {
        await profilePicFile.mv(uploadPath);
        updates.profile_pic = uniqueFileName;
      } catch (err) {
        console.error("Error moving the profile picture file:", err);
        return res.status(500).json({
          message: [{ key: "error", value: "Internal server error" }],
        });
      }
    }

    // Update admin details
    const updatedSuperAdmin = await User.findByIdAndUpdate(superAdminId, updates, {
      new: true, 
      runValidators: true, 
    });

    // Remove sensitive data from the updated admin object
    delete updatedSuperAdmin.password;

    res.status(200).json({
      message: "Super Admin updated successfully",
      admin: updatedSuperAdmin,
    });
  } catch (error) {
    var errors = [];
    for (let types in error.errors) {
      errors.push({
        key: types,
        value: error.errors[types].message,
      });
    }
    res.status(400).json({ message: errors });
    console.error(error);
  }
};


module.exports.deleteSuperAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: [{ key: "error", value: "User not found" }],
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: [{ key: "success", value: "Super Admin deleted successfully" }],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: [{ key: "error", value: "Internal server error" }],
    });
  }
};





