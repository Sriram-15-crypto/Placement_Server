const User_Access = require("../models/AddUserModal");
const config = require("config");
const CLIENT_URL = config.get("CLIENT_URL");
const bcrypt = require("bcryptjs");
const emailUtil = require("../utils/sendEmail");
const { createSecretToken } = require("../config/secretToken");
const { createClient } = require('@supabase/supabase-js');
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const generator = require('generate-password'); 
const BASE_URL = config.get("BASE_URL");
const jwt = require("jsonwebtoken");
const JWT_TOKEN_KEY = config.get("JWT_TOKEN_KEY");

const supabase = createClient(supabaseUrl, supabaseKey);

exports.AccessUser = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, gender, dob, role } = req.body;
    const existingAccess = await User_Access.findOne({ email });

    if (existingAccess) {
      return res.status(403).json({ message: [{ key: 'error', value: 'User already exists' }] });
    }

    const imageFile = req.files?.image;
    if (!imageFile) {
      return res.status(400).json({
        message: [{ key: 'error', value: 'Image is required' }],
      });
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        message: [{ key: 'error', value: 'Image size exceeds the 5MB limit' }],
      });
    }

    const uniqueFileName = `${Date.now()}_${imageFile.name}`;

    const { data, error } = await supabase.storage
      .from('Placement/access_user/profile')
      .upload(uniqueFileName, imageFile.data);

    if (error) {
      console.error('Error uploading image to Supabase:', error);
      return res.status(500).json({
        message: [{ key: 'error', value: 'Error uploading image to Supabase' }],
      });
    }

    const address = req.body.address ? JSON.parse(req.body.address) : {};
    const access = req.body.access ? JSON.parse(req.body.access) : [];

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/Placement/access_user/profile/${uniqueFileName}`;
    const defaultPassword = generator.generate({
      length: 8,
      numbers: true,
      symbols: false,
      uppercase: true,
      excludeSimilarCharacters: true,
      strict: true,
    });

    const userAccess = await User_Access.create({
      email,
      firstName,
      lastName,
      phone,
      address,
      password: defaultPassword,
      gender,
      dob,
      role,
      access: access.map(({ module, submodules }) => ({ module, submodules })),
      image: imageUrl,
    });

    const token = createSecretToken(userAccess._id);

    const emailSubject = 'Your New User Password';
    const emailBody = `
      <p><strong>Welcome to the Placement Dashboard</strong></p>
      <p>You have been added as a User:</p>
      <p><strong>User Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${defaultPassword}</p>
      <p>For login, visit <a href="${process.env.CLIENT_URL}/signin">here</a></p>
    `;

    const emailSent = await emailUtil.sendEmail(email, emailSubject, emailBody);

    if (emailSent) {
      res.status(201).json({
        message: [{ key: 'success', value: 'User registered successfully' }],
        token: token,
      });
    } else {
      res.status(500).json({
        message: [{ key: 'error', value: 'Email sending failed' }],
      });
    }
  } catch (error) {
    const errors = Object.keys(error.errors || {}).map((key) => ({
      key,
      value: error.errors[key].message,
    }));
    res.status(400).json({ message: errors });
    console.error(error);
  }
};

module.exports.UserSignIn = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          message: [{ key: 'error', value: 'All fields are required' }],
        });
      }
  
      const user = await User_Access.findOne({ email });
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
        await User_Access.updateOne({ _id: user._id }, { firstTimeLoginDone: false });
      }
    
      const sanitizedUser = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        address: user.address,
        access:user.access,
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
  

  module.exports.addUserVerify = async (req, res) => {
    try {
        const sanitizedUser = {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          phone: req.user.phone,
          address: req.user.address,
          access:req.user.access,
          image:req.user.image,
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
    

    exports.getUserAccess = async (req, res) => {
        try {
          const Users = await User_Access.find();
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
      

      exports.getUserAccessById = async (req, res) => {
        const { id } = req.params;
      
        try {
          const user = await User_Access.findById(id);
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
      

      module.exports.UserForgotPassword = async (req, res) => {
        try {
          const { email } = req.body;
          if (!email) {
            return res
              .status(400)
              .json({ message: [{ key: "email", value: "Email is required" }] });
          }
      
          const user = await User_Access.findOne({ email });
      
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
      module.exports.UserVerifyResetPasswordLink = async (req, res) => {
        try {
          const user = await User_Access.findOne({ _id: req.params.id });
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
            console.log("error",error);
        }
      };
      
      // For resetting password link FOR FORGOT PASSWORD SCENARIO ONLY
      module.exports.UserForgotPasswordResetPassword = async (req, res) => {
        try {
          // password and id are being received here through body only
          const password = req.body.password;
          const user = await User_Access.findOne({ _id: req.body.id });
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
      
      