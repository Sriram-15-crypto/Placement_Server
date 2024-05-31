const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth.js');
const { userRole } = require('../middlewares/userRole.js');
const { AccessUser, UserSignIn, addUserVerify, getUserAccess, getUserAccessById, UserForgotPassword, UserVerifyResetPasswordLink, UserForgotPasswordResetPassword, updateUserAccess, deleteUserAccess } = require('../controllers/addUser.js');

router.post('/create/userAccess',AccessUser);
router.post('/user/signin',UserSignIn);
router.get('/user/Verify', userAuth, addUserVerify) // for testing only

router.put('/update/userAccess/:userId',updateUserAccess);
router.delete('/delete/userAccess/:userId',deleteUserAccess);



router.get('/getAll/userAccess', getUserAccess);

router.get('/getById/userAccess/:id', getUserAccessById);


router.post('/user/ForgotPassword', UserForgotPassword)
router.get('/users/ResetPassword/:id/:token', UserVerifyResetPasswordLink)
router.post('/users/ResetPassword/:id/:token', UserForgotPasswordResetPassword)

// router.delete('/delete/hiring/:id',deleteHiring);

// router.put('/update/hiring/:id', updateHiringById);

module.exports = router;    
