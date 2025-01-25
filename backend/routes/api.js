const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Schedule = require('../models/Schedule');
const mongoose = require('mongoose');
const validateSchedule = require('../middleware/validateSchedule');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendScheduleEmail } = require('../utils/emailService');
const { sessionTrackMapping, sessionTimeSlotMapping } = require('../constants/scheduleConstants');

router.post('/schedule/save', [authMiddleware, validateSchedule], async (req, res) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const schedule of schedules) {
      // Validate session-track association
      const expectedTrack = sessionTrackMapping[schedule.sessions];
      const paper = await Paper.findOne({ paperId: schedule.paperId });
      
      if (!paper) {
        return res.status(404).json({ message: `Paper ${schedule.paperId} not found` });
      }

      // Check session capacity
      const sessionCount = await Schedule.countDocuments({
        date: schedule.date,
        sessions: schedule.sessions,
        paperId: { $ne: schedule.paperId }
      });
      
      if (sessionCount >= 15) {
        return res.status(400).json({
          message: `Session ${schedule.sessions} on ${schedule.date} has reached maximum capacity`
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

    const savedSchedules = await Schedule.insertMany(schedules);
    
    // Send confirmation emails
    for (const schedule of savedSchedules) {
      try {
        const paper = await Paper.findOne({ paperId: schedule.paperId });
        if (paper) {
          const token = await sendScheduleEmail({
            ...schedule.toObject(),
            email: paper.email,
            title: paper.title,
            authors: paper.authors,
            paperId: paper.paperId
          });
          
          await Schedule.findByIdAndUpdate(schedule._id, {
            confirmationToken: token,
            confirmationExpires: new Date(Date.now() + 48 * 60 * 60 * 1000)
          });
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }

    return res.status(201).json({
      message: 'Schedules saved successfully',
      schedules: savedSchedules
    });
  } catch (error) {
    console.error('Save schedule error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// Get all papers
router.get('/papers', async (req, res) => {
  try {
    const papers = await Paper.find();
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all schedules
router.get('/schedule/all', async (req, res) => {
  try {
    const schedules = await Schedule.find();
    console.log('Fetched schedules:', schedules);
    console.log('Current schedules state:', schedules);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add this route for paper creation
router.post('/papers', async (req, res) => {
  try {
    const paper = new Paper(req.body);
    await paper.save();
    res.status(201).json(paper);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/schedule/check-conflicts', async (req, res) => {
  try {
    const { date, timeSlot, session } = req.query;
    
    console.log('Checking conflicts for:', { date, timeSlot, session });
    
    const existing = await Schedule.findOne({
      date: date,
      timeSlots: timeSlot,
      sessions: session
    });
    
    console.log('Found existing schedule:', existing);
    
    res.json({ 
      hasConflict: !!existing,
      conflictDetails: existing ? {
        paperId: existing.paperId,
        timeSlot: existing.timeSlots,
        session: existing.sessions,
        date: existing.date
      } : null
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add this route to check if paper is already scheduled
router.get('/schedule/check-paper/:paperId', async (req, res) => {
  try {
    const existingSchedule = await Schedule.findOne({ paperId: req.params.paperId });
    res.json({ isScheduled: !!existingSchedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/schedule/check-availability', async (req, res) => {
  try {
    const { date, timeSlot, session } = req.query;
    
    const existing = await Schedule.findOne({
      date,
      timeSlots: timeSlot,
      sessions: session
    });
    
    res.json({ 
      isAvailable: !existing,
      existingPaper: existing ? existing.paperId : null 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available time slots for a date
router.get('/schedule/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    const sessionsForDate = getSessionsForDate(date);
    
    // Get all scheduled slots for this date
    const scheduledSlots = await Schedule.find({ date }).select('timeSlots sessions -_id');
    
    const allTimeSlots = [
      '11:30 AM - 1:00 PM',
      '2:40 PM - 4:30 PM'
    ];
    
    // Create map of used combinations
    const usedCombos = new Set(
      scheduledSlots.map(slot => `${slot.timeSlots}-${slot.sessions}`)
    );
    
    // Filter out used combinations
    const availableSlots = allTimeSlots.flatMap(timeSlot =>
      sessionsForDate.map(session => ({
        timeSlot,
        session,
        isAvailable: !usedCombos.has(`${timeSlot}-${session}`)
      }))
    );
    
    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available papers (not yet scheduled)
router.get('/papers/available', async (req, res) => {
  try {
    // Get all scheduled paper IDs
    const scheduledPapers = await Schedule.find().select('paperId -_id');
    const scheduledIds = new Set(scheduledPapers.map(p => p.paperId));
    
    // Get all papers that aren't scheduled
    const availablePapers = await Paper.find({
      paperId: { $nin: Array.from(scheduledIds) }
    });
    
    res.json(availablePapers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a schedule by paperId
router.delete('/schedule/:paperId', async (req, res) => {
  try {
    console.log('Deleting schedule for paperId:', req.params.paperId);
    const result = await Schedule.findOneAndDelete({ paperId: req.params.paperId });
    
    if (!result) {
      console.log('No schedule found for deletion');
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    console.log('Schedule deleted successfully');
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/schedule/session-capacity', async (req, res) => {
  try {
    const { date, session } = req.query;
    
    const count = await Schedule.countDocuments({
      date,
      sessions: session
    });
    
    res.json({ 
      count,
      isAvailable: count < 10 // Assuming max 10 papers per session
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get paper by ID
router.get('/papers/:paperId', async (req, res) => {
  try {
    const paper = await Paper.findOne({ paperId: req.params.paperId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }
    res.json(paper);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get papers by track
router.get('/papers/track/:track', async (req, res) => {
  try {
    const papers = await Paper.find({ 
      tracks: { 
        $regex: new RegExp(`^${req.params.track}$`, 'i') 
      } 
    });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Protected routes
router.use('/admin/*', authMiddleware);  // Protect all admin routes
router.post('/schedule/create', authMiddleware, async (req, res) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check session capacity for all schedules
    const sessionCounts = {};
    
    // First, get current counts for all sessions
    for (const schedule of schedules) {
      const key = `${schedule.date}-${schedule.sessions}`;
      if (!sessionCounts[key]) {
        const count = await Schedule.countDocuments({
          date: schedule.date,
          sessions: schedule.sessions
        });
        sessionCounts[key] = count;
      }
    }

    // Then check if any session would exceed capacity
    for (const schedule of schedules) {
      const key = `${schedule.date}-${schedule.sessions}`;
      sessionCounts[key]++;
      
      if (sessionCounts[key] > 10) {
        return res.status(400).json({
          message: `Session capacity exceeded for ${schedule.sessions} on ${schedule.date}. Maximum is 10 papers per session.`
        });
      }
    }

    // Save all schedules at once since validation passed
    const savedSchedules = await Schedule.insertMany(schedules);
    
    res.status(201).json({
      message: `Successfully scheduled ${savedSchedules.length} papers`,
      schedules: savedSchedules
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      message: error.message || 'Error saving schedules'
    });
  }
});

router.put('/schedule/update', authMiddleware, async (req, res) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check session capacity for all schedules
    const sessionCounts = {};
    
    // First, get current counts for all sessions
    for (const schedule of schedules) {
      const key = `${schedule.date}-${schedule.sessions}`;
      if (!sessionCounts[key]) {
        const count = await Schedule.countDocuments({
          date: schedule.date,
          sessions: schedule.sessions
        });
        sessionCounts[key] = count;
      }
    }

    // Then check if any session would exceed capacity
    for (const schedule of schedules) {
      const key = `${schedule.date}-${schedule.sessions}`;
      sessionCounts[key]++;
      
      if (sessionCounts[key] > 10) {
        return res.status(400).json({
          message: `Session capacity exceeded for ${schedule.sessions} on ${schedule.date}. Maximum is 10 papers per session.`
        });
      }
    }

    // Save all schedules at once since validation passed
    const savedSchedules = await Schedule.insertMany(schedules);
    
    res.status(201).json({
      message: `Successfully scheduled ${savedSchedules.length} papers`,
      schedules: savedSchedules
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      message: error.message || 'Error saving schedules'
    });
  }
});

router.delete('/schedule/delete', authMiddleware, async (req, res) => {
  try {
    console.log('Deleting schedule for paperId:', req.params.paperId);
    const result = await Schedule.findOneAndDelete({ paperId: req.params.paperId });
    
    if (!result) {
      console.log('No schedule found for deletion');
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    console.log('Schedule deleted successfully');
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/schedule/reschedule/:paperId', authMiddleware, async (req, res) => {
  try {
    const { paperId } = req.params;
    const { newDate, newTimeSlot, newSession } = req.body;

    // Find current schedule
    const schedule = await Schedule.findOne({ paperId });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check session capacity for new session
    const sessionCount = await Schedule.countDocuments({
      date: newDate,
      sessions: newSession
    });

    if (sessionCount >= 15) {
      return res.status(400).json({ 
        message: `Session ${newSession} on ${newDate} has reached maximum capacity`
      });
    }

    // Validate session-track association
    const expectedTrack = sessionTrackMapping[newSession];
    if (!expectedTrack || normalizeTrackName(schedule.tracks) !== normalizeTrackName(expectedTrack)) {
      return res.status(400).json({
        message: `Invalid session for track: ${schedule.tracks}`
      });
    }

    // Validate time slot
    const expectedTimeSlot = sessionTimeSlotMapping[newSession];
    if (!expectedTimeSlot || newTimeSlot !== expectedTimeSlot) {
      return res.status(400).json({
        message: `Invalid time slot for session ${newSession}`
      });
    }

    // Check if slot is already taken
    const existingSlot = await Schedule.findOne({
      date: newDate,
      timeSlots: newTimeSlot,
      sessions: newSession,
      paperId: { $ne: paperId }
    });

    if (existingSlot) {
      return res.status(400).json({
        message: `Time slot ${newTimeSlot} is already taken in session ${newSession}`
      });
    }

    // Update schedule details
    schedule.date = newDate;
    schedule.timeSlots = newTimeSlot;
    schedule.sessions = newSession;
    schedule.confirmationToken = undefined;
    schedule.confirmationExpires = undefined;
    schedule.status = 0;
    
    await schedule.save();

    // Get paper details for email
    const paper = await Paper.findOne({ paperId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Send new confirmation email
    try {
      const token = await sendScheduleEmail({
        ...schedule.toObject(),
        email: paper.email,
        title: paper.title,
        authors: paper.authors,
        paperId: paper.paperId
      });
      
      schedule.confirmationToken = token;
      schedule.confirmationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await schedule.save();
      
      res.json({ 
        message: 'Schedule updated and confirmation email sent',
        schedule: schedule
      });
    } catch (emailError) {
      console.error('Failed to send reschedule email:', emailError);
      res.status(200).json({ 
        message: 'Schedule updated but email sending failed',
        schedule: schedule
      });
    }
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating schedule',
      error: error.toString()
    });
  }
});

router.post('/auth/logout', authMiddleware, async (req, res) => {
  try {
    // Add token validation in authMiddleware
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // You can add additional cleanup here if needed
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.json({
      token,
      _id: user._id,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/schedule/send-emails', authMiddleware, async (req, res) => {
  try {
    // Get all schedules that haven't been sent emails yet (no confirmationToken)
    const schedules = await Schedule.find({
      confirmationToken: { $exists: false }
    });
    
    if (schedules.length === 0) {
      return res.json({ 
        message: 'No pending schedules to send emails',
        results: [] 
      });
    }

    // Get all paper IDs from schedules
    const paperIds = schedules.map(schedule => schedule.paperId);

    // Fetch corresponding papers from the papers collection
    const papers = await Paper.find({ paperId: { $in: paperIds } });

    const results = [];
    
    for (const schedule of schedules) {
      try {
        // Find corresponding paper
        const paper = papers.find(p => p.paperId === schedule.paperId);
        
        if (!paper || !paper.email) {
          throw new Error(`Paper details or email not found for paperId: ${schedule.paperId}`);
        }

        console.log('Sending email for paper:', {
          paperId: paper.paperId,
          email: paper.email,
          title: paper.title
        });

        const emailData = {
          ...schedule.toObject(),
          email: paper.email,
          title: paper.title,
          authors: paper.authors,
          paperId: paper.paperId
        };

        const token = await sendScheduleEmail(emailData);
        
        schedule.confirmationToken = token;
        schedule.confirmationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await schedule.save();
        
        results.push({ 
          email: paper.email,
          status: 'success',
          paperId: paper.paperId 
        });
      } catch (error) {
        console.error('Email error:', error);
        results.push({ 
          paperId: schedule.paperId,
          status: 'failed', 
          error: error.message
        });
      }
    }
    
    res.json({ 
      message: 'Email sending process completed',
      results 
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error sending schedule emails' });
  }
});

router.get('/schedule/confirm/:token', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      confirmationToken: req.params.token
    }).lean();

    if (!schedule) {
      return res.status(400).json({ message: 'Invalid confirmation link' });
    }

    // Return both status and message for all cases
    if (schedule.status !== 0) {
      return res.status(400).json({ 
        message: `Your previous choice was: ${
          schedule.status === 1 ? 'Confirmed' : 
          schedule.status === 2 ? 'Denied' : 
          'Reschedule Requested'
        }`,
        status: schedule.status,
        showConfirmation: false
      });
    }

    // If status is 0, allow confirmation and include showConfirmation flag
    const updatedSchedule = await Schedule.findOneAndUpdate(
      { confirmationToken: req.params.token },
      {
        $set: {
          status: 1,
          confirmationToken: undefined,
          confirmationExpires: undefined
        }
      },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(400).json({ message: 'Failed to update schedule' });
    }

    res.json({ 
      message: 'Attendance confirmed successfully',
      showConfirmation: true,
      status: 0
    });
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({ message: 'Error confirming attendance' });
  }
});

router.get('/schedule/deny/:token', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      confirmationToken: req.params.token,
      confirmationExpires: { $gt: Date.now() }
    });

    if (!schedule) {
      return res.status(400).json({ message: 'Invalid denial link' });
    }

    if (schedule.status !== 0) {
      return res.status(400).json({ 
        message: `Your previous choice was: ${
          schedule.status === 1 ? 'Confirmed' : 
          schedule.status === 2 ? 'Denied' : 
          'Reschedule Requested'
        }`,
        status: schedule.status,
        showConfirmation: false
      });
    }

    schedule.status = 2;
    await schedule.save();

    res.json({ 
      message: 'Denial processed successfully',
      showConfirmation: true,
      status: 0
    });
  } catch (error) {
    console.error('Denial error:', error);
    res.status(500).json({ message: 'Error processing denial' });
  }
});

router.get('/schedule/reschedule-request/:token', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      confirmationToken: req.params.token,
      confirmationExpires: { $gt: Date.now() }
    });

    if (!schedule) {
      return res.status(400).json({ message: 'Invalid reschedule request link' });
    }

    if (schedule.status !== 0) {
      return res.status(400).json({ 
        message: `Your previous choice was: ${
          schedule.status === 1 ? 'Confirmed' : 
          schedule.status === 2 ? 'Denied' : 
          'Reschedule Requested'
        }`,
        status: schedule.status,
        showConfirmation: false
      });
    }

    schedule.status = 3;
    await schedule.save();

    res.json({ 
      message: 'Reschedule request processed successfully',
      showConfirmation: true,
      status: 0
    });
  } catch (error) {
    console.error('Reschedule request error:', error);
    res.status(500).json({ message: 'Error processing reschedule request' });
  }
});

router.get('/schedule/check/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const existingSchedule = await Schedule.findOne({ paperId });
    
    res.json({
      isScheduled: !!existingSchedule,
      schedule: existingSchedule
    });
  } catch (error) {
    console.error('Check schedule error:', error);
    res.status(500).json({ message: error.message });
  }
});

const allSessions = [
  'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5',
  'Session 6', 'Session 7', 'Session 8', 'Session 9', 'Session 10'
];

// Filter sessions based on date
const getSessionsForDate = (date) => {
  if (date === '2025-02-07') {
    return allSessions.slice(0, 5); // First 5 sessions
  } else if (date === '2025-02-08') {
    return allSessions.slice(5); // Last 5 sessions
  }
  return [];
};

router.post('/schedule/send-confirmation/:paperId', authMiddleware, async (req, res) => {
  try {
    const { paperId } = req.params;
    console.log('Attempting to send confirmation email for paperId:', paperId);
    
    // Get schedule and paper details
    const schedule = await Schedule.findOne({ paperId });
    if (!schedule) {
      console.log('Schedule not found for paperId:', paperId);
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const paper = await Paper.findOne({ paperId });
    if (!paper) {
      console.log('Paper not found for paperId:', paperId);
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Send confirmation email first
    const emailData = {
      ...schedule.toObject(),
      email: paper.email,
      title: paper.title,
      authors: paper.authors,
      paperId: paper.paperId
    };

    const token = await sendScheduleEmail(emailData);
    
    // Update schedule with new confirmation token in a separate operation
    try {
      await Schedule.findOneAndUpdate(
        { paperId },
        {
          $set: {
            confirmationToken: token,
            confirmationExpires: new Date(Date.now() + 48 * 60 * 60 * 1000)
          }
        },
        { runValidators: false }
      );
    } catch (updateError) {
      console.error('Failed to update schedule, but email was sent:', updateError);
      return res.status(200).json({ 
        message: 'Email sent but failed to update schedule status',
        details: updateError.message 
      });
    }

    console.log('Email sent and schedule updated successfully');
    res.json({ message: 'Confirmation email sent successfully' });
  } catch (error) {
    console.error('Error sending confirmation email:', {
      error: error.message,
      stack: error.stack,
      paperId: req.params.paperId
    });
    res.status(500).json({ 
      message: 'Failed to send confirmation email',
      details: error.message 
    });
  }
});

router.get('/', (req, res) => {
  res.json({ message: 'Conference Scheduler API is running' });
});

module.exports = router;
