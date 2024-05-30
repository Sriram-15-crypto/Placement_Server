const express = require('express')
const router = express.Router()

const {
  SignUp,
  SignIn,
  ForgotPassword,
  VerifyResetPasswordLink,
  ForgotPasswordResetPassword,
  ResetPasswordSendOTP,
  ResetPasswordVerifyOTP,
  ResetPassword,
  userVerify,
  registerAdmin,
  updateUser,
  createSuperAdmin,
  deleteAdminById,
  deleteSuperAdmin,
  Logout,
  getUsers,
  getUserById,
  updateAdmin,
  updateSuperAdmin,
  createTrainee,
  updateTrainee,

} = require('../controllers/userAuth.js')

const { userAuth } = require('../middlewares/userAuth.js')
const { userRole } = require('../middlewares/userRole.js')

// User

router.post('/SignUp', SignUp)
router.post('/SignIn', SignIn)
router.post('/Logout',userAuth, Logout)
router.get('/getUser',userAuth,userRole(['admin', 'super_admin']), getUsers)
router.get('/getUserById/:id',userAuth, getUserById)

router.put('/updateUser/:userId', updateUser);

router.post('/', userAuth) // for testing only
router.post('/ForgotPassword', ForgotPassword)
router.get('/ResetPassword/:id/:token', VerifyResetPasswordLink)
router.post('/ResetPassword/:id/:token', ForgotPasswordResetPassword)
router.get('/ResetPasswordSendOTP', userAuth, ResetPasswordSendOTP)
router.post('/ResetPasswordVerifyOTP', userAuth, ResetPasswordVerifyOTP)
router.post('/ResetPassword', userAuth, ResetPassword)
router.get('/userVerify', userAuth, userVerify) // for testing only

// Admin

router.post('/create/admin',registerAdmin);
router.put('/update/admin/:adminId',userAuth,userRole('super_admin'),updateAdmin);
router.delete('/delete/admin/:id',userAuth,userRole('super_admin'),deleteAdminById);

// Super Admin

router.post('/create/superAdmin',userAuth,userRole('super_admin'),createSuperAdmin);
router.delete('/delete/superAdmin/:id',userAuth,userRole('super_admin'), deleteSuperAdmin);
router.put('/update/superAdmin/:superAdminId',userAuth,userRole('super_admin'), updateSuperAdmin);

module.exports = router
