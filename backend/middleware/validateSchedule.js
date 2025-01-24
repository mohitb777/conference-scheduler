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

    // Check if any papers are already scheduled
    for (const schedule of schedules) {
      const existingSchedule = await Schedule.findOne({ paperId: schedule.paperId });
      if (existingSchedule) {
        return res.status(400).json({
          message: `Paper ${schedule.paperId} is already scheduled`
        });
      }
    }

    for (const schedule of schedules) {
      // Validate paper exists
      const paper = await Paper.findOne({ paperId: schedule.paperId });
      if (!paper) {
        return res.status(400).json({
          message: `Paper with ID ${schedule.paperId} not found`
        });
      }

      // Validate track matches paper
      if (schedule.tracks !== paper.tracks) {
        return res.status(400).json({
          message: `Invalid track for paper ${schedule.paperId}. Expected: ${paper.tracks}`
        });
      }

      // Validate session-track association
      const expectedTrack = sessionTrackMapping[schedule.sessions];
      if (!expectedTrack || normalizeTrackName(schedule.tracks) !== normalizeTrackName(expectedTrack)) {
        return res.status(400).json({
          message: `Invalid session for track: ${schedule.tracks}`
        });
      }

      // Validate time slot
      const expectedTimeSlot = sessionTimeSlotMapping[schedule.sessions];
      if (!expectedTimeSlot || schedule.timeSlots !== expectedTimeSlot) {
        return res.status(400).json({
          message: `Invalid time slot for session ${schedule.sessions}`
        });
      }

      // Validate date based on session
      const sessionNumber = parseInt(schedule.sessions.split(' ')[1]);
      const expectedDate = sessionNumber <= 5 ? '2025-02-07' : '2025-02-08';
      if (schedule.date !== expectedDate) {
        return res.status(400).json({
          message: `Invalid date for session ${schedule.sessions}. Expected: ${expectedDate}`
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