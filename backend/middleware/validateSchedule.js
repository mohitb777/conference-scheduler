const { sessionTrackMapping, sessionTimeSlotMapping } = require('../constants/scheduleConstants');
const Paper = require('../models/Paper');
const Schedule = require('../models/Schedule');

const normalizeTrackName = (track) => {
  return track?.trim().toLowerCase();
};

const validateSchedule = async (req, res, next) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check for duplicate paperIds
    const paperIds = schedules.map(s => s.paperId);
    const uniquePaperIds = new Set(paperIds);
    if (paperIds.length !== uniquePaperIds.size) {
      return res.status(400).json({
        message: 'Duplicate paper IDs detected. Each paper can only be scheduled once.'
      });
    }

    for (const schedule of schedules) {
      // Basic validation for required fields
      if (!schedule.sessions || !schedule.timeSlots || !schedule.date) {
        return res.status(400).json({
          message: `Please select sessions for paper ${schedule.paperId}`
        });
      }

      // Validate paper exists
      const paper = await Paper.findOne({ paperId: schedule.paperId });
      if (!paper) {
        return res.status(400).json({
          message: `Paper with ID ${schedule.paperId} not found`
        });
      }

      // Check if paper is already scheduled
      const existingSchedule = await Schedule.findOne({ paperId: schedule.paperId });
      if (existingSchedule) {
        return res.status(400).json({
          message: `Paper ${schedule.paperId} is already scheduled`
        });
      }

      // Validate session exists and matches track
      const expectedTrack = sessionTrackMapping[schedule.sessions];
      if (!expectedTrack) {
        return res.status(400).json({
          message: `Invalid session: ${schedule.sessions}`
        });
      }

      // Validate track matching
      if (normalizeTrackName(paper.tracks) !== normalizeTrackName(expectedTrack)) {
        return res.status(400).json({
          message: `Session ${schedule.sessions} can only be assigned to papers from track: ${expectedTrack}`
        });
      }

      // Validate time slot matches session
      const expectedTimeSlot = sessionTimeSlotMapping[schedule.sessions];
      if (schedule.timeSlots !== expectedTimeSlot) {
        return res.status(400).json({
          message: `Invalid time slot for session ${schedule.sessions}`
        });
      }

      // Check if slot is already taken
      const existingSlot = await Schedule.findOne({
        date: schedule.date,
        timeSlots: schedule.timeSlots,
        sessions: schedule.sessions,
        paperId: { $ne: schedule.paperId }
      });

      if (existingSlot) {
        return res.status(400).json({
          message: `Time slot ${schedule.timeSlots} is already taken in session ${schedule.sessions}`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = validateSchedule; 