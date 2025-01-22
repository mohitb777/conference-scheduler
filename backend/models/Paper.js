const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  paperId: {
    type: Number,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    unique: true
  },
  mode: {
    type: String,
    enum: ['Online', 'Offline', 'online', 'offline'],
    required: true,
    set: function(v) {
      return v.toLowerCase();
    }
  },
  tracks: {
    type: String,
    enum: {
      values: [
        'Big Data, Data Science and Engineering, Natural Language Processing',
        'Ubiquitous Computing, Networking and Cyber Security',
        'Green Computing and Sustainability, Renewable Energy and Global Sustainability, Smart City, Smart Systems and VLSI based Technologies',
        'Artificial Intelligence, Intelligent Systems and Automation',
        'Augmented Reality, Virtual Reality and Robotics, Multimedia Services and Technologies, Blockchain and Cyberphysical Systems',
        '5G, IOT and Futuristic Technologies'
      ],
      message: '{VALUE} is not a valid track'
    },
    required: true
  }
});

// Add case-insensitive collation for tracks
paperSchema.index({ tracks: 1 }, { collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Paper', paperSchema); 