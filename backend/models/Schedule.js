const mongoose = require('mongoose');
const { sessionTrackMapping, sessionTimeSlotMapping } = require('../constants/scheduleConstants');

const scheduleSchema = new mongoose.Schema({
  paperId: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: false
  },
  title: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['Online', 'Offline'],
    required: true
  },
  tracks: {
    type: String,
    required: true,
    validate: {
      validator: function(track) {
        const normalizeString = str => str?.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalizeString(track) === normalizeString(sessionTrackMapping[this.sessions]);
      },
      message: props => `Track ${props.value} is not valid for session ${this.sessions}`
    }
  },
  date: {
    type: String,
    required: true,
    validate: {
      validator: function(date) {
        const sessionNumber = parseInt(this.sessions.split(' ')[1]);
        return date === (sessionNumber <= 5 ? '2025-02-07' : '2025-02-08');
      },
      message: props => `Date ${props.value} is not valid for session ${this.sessions}`
    }
  },
  timeSlots: {
    type: String,
    required: true,
    validate: {
      validator: function(timeSlot) {
        return timeSlot === sessionTimeSlotMapping[this.sessions];
      },
      message: props => `Time slot ${props.value} is not valid for session ${this.sessions}`
    }
  },
  sessions: {
    type: String,
    required: true,
    validate: {
      validator: function(session) {
        const normalizeString = str => str?.trim().toLowerCase().replace(/\s+/g, ' ');
        const expectedTrack = sessionTrackMapping[session];
        if (!expectedTrack) return false;
        return normalizeString(expectedTrack) === normalizeString(this.tracks);
      },
      message: props => `Session ${props.value} is not valid for track ${this.tracks}`
    }
  },
  status: {
    type: Number,
    default: 0
  },
  confirmationToken: String,
  confirmationExpires: Date,
  venue: {
    type: String,
    required: true
  }
});

scheduleSchema.index({ paperId: 1 }, { unique: true });


module.exports = mongoose.model('Schedule', scheduleSchema); 