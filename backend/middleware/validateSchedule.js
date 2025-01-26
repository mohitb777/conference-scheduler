const { sessionTrackMapping, sessionTimeSlotMapping } = require('../constants/scheduleConstants');
const Paper = require('../models/Paper');
const Schedule = require('../models/Schedule');

const normalizeTrackName = (track) => {
  return track?.trim().toLowerCase();
};

const validateSchedule = async (req, res, next) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    console.log('Validating schedules:', schedules);
    
    for (const schedule of schedules) {
      const paper = await Paper.findOne({ paperId: schedule.paperId });
      if (!paper) {
        return res.status(404).json({
          message: `Paper ${schedule.paperId} not found`
        });
      }

      // Basic validation for required fields
      if (!schedule.sessions || !schedule.timeSlots || !schedule.date || !schedule.venue) {
        console.log('Missing fields:', {
          sessions: !schedule.sessions,
          timeSlots: !schedule.timeSlots,
          date: !schedule.date,
          venue: !schedule.venue
        });
        return res.status(400).json({
          message: `Please select all required fields for paper ${schedule.paperId}`
        });
      }

      // Validate session exists and matches track
      const expectedTrack = sessionTrackMapping[schedule.sessions];
      if (!expectedTrack || normalizeTrackName(paper.tracks) !== normalizeTrackName(expectedTrack)) {
        return res.status(400).json({
          message: `Session ${schedule.sessions} can only be assigned to papers from track: ${expectedTrack}`
        });
      }

      // Check session capacity
      const sessionCount = await Schedule.countDocuments({
        date: schedule.date,
        sessions: schedule.sessions,
        paperId: { $ne: schedule.paperId } // Exclude current paper from count
      });

      if (sessionCount >= 15) {
        return res.status(400).json({ 
          message: `Session ${schedule.sessions} on ${schedule.date} has reached maximum capacity`
        });
      }
    }
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
};

module.exports = validateSchedule;