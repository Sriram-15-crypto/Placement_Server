const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth.js');
const { userRole } = require('../middlewares/userRole.js');
const { createModules, getAllModule, getModuleById, updateModule, deleteModules } = require('../controllers/module.js');

router.post('/create/module',createModules);

router.get('/getAll/module', getAllModule);

router.get('/getById/module/:id', getModuleById);

router.delete('/delete/module/:id', deleteModules);

router.put('/update/module/:id', updateModule);

module.exports = router;
