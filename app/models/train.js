const mongoose = require('mongoose')

const trainSchema = new mongoose.Schema({
  line: {
    type: String,
    required: true
  },
  station: {
    type: String,
    required: true
  },
  direction: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Train', trainSchema)
