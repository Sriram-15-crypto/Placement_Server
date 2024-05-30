const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  module: { type: String, required: true },
  submodule: [{ type: String, required: true }],

  description: { type: String, required: true },

  icon: {type: String,required:true,max: 5 * 1024 * 1024},

//   lastModifiedBy: { type: String, required: true },
//   lastModifiedOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Module', moduleSchema);
