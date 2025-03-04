const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Schedule = require('../models/Schedule');
const validateSchedule = require('../middleware/validateSchedule');
const authMiddleware = require('../middleware/authMiddleware');
const { sendScheduleEmail } = require('../utils/emailService');
const { sessionTrackMapping, sessionTimeSlotMapping, sessionVenueMapping } = require('../constants/scheduleConstants');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log('Schedule Route:', req.method, req.path, req.body);
  next();
});

// Add this near the top of the file, after the imports
const allSessions = [
  'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5',
  'Session 6', 'Session 7', 'Session 8', 'Session 9', 'Session 10'
];

const getSessionsForDate = (date) => {
  if (date === '2025-02-07') {
    return allSessions.slice(0, 5); // First 5 sessions
  } else if (date === '2025-02-08') {
    return allSessions.slice(5); // Last 5 sessions
  }
  return [];
};

// Static routes first
router.get('/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const sessionsForDate = getSessionsForDate(date);
    const scheduledSlots = await Schedule.find({ date }).select('timeSlots sessions -_id');
    
    const allTimeSlots = [
      '11:30 AM - 1:00 PM',
      '2:40 PM - 4:30 PM'
    ];
    
    const usedCombos = new Set(
      scheduledSlots.map(slot => `${slot.timeSlots}-${slot.sessions}`)
    );
    
    const availableSlots = allTimeSlots.flatMap(timeSlot =>
      sessionsForDate.map(session => ({
        timeSlot,
        session,
        isAvailable: !usedCombos.has(`${timeSlot}-${session}`)
      }))
    );
    
    return res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({ message: 'Error fetching available slots' });
  }
});

router.get('/check-conflicts', async (req, res) => {
  try {
    const { date, timeSlot, session } = req.query;
    const existing = await Schedule.findOne({
      date,
      timeSlots: timeSlot,
      sessions: session
    });
    
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
    res.status(500).json({ message: error.message });
  }
});

// Save schedule route with auth middleware
router.post('/save', [authMiddleware, validateSchedule], async (req, res) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check session capacity
    for (const schedule of schedules) {
      const sessionCount = await Schedule.countDocuments({
        date: schedule.date,
        sessions: schedule.sessions
      });
      
      if (sessionCount >= 15) {
        return res.status(400).json({
          message: `Session ${schedule.sessions} on ${schedule.date} has reached maximum capacity`
        });
      }
    }

    const savedSchedules = await Schedule.insertMany(schedules);

    return res.status(201).json({
      message: 'Schedules saved successfully',
      schedules: savedSchedules
    });
  } catch (error) {
    console.error('Save schedule error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const schedule = await Schedule.findOne().sort({ _id: -1 });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ date: -1 });
    res.status(200).json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      message: 'Error fetching schedules', 
      error: error.message 
    });
  }
});

// Get all tracks - move before dynamic route
router.get('/tracks', async (req, res) => {
  try {
    const tracks = await Schedule.distinct('track');
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dynamic route last
router.get('/:id', async (req, res) => {
  if (req.params.id === 'save') {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.status(200).json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ 
      message: 'Error fetching schedule', 
      error: error.message 
    });
  }
});

// Get papers by track with pagination
router.get('/papers/:track', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const papers = await Schedule.find({ track: req.params.track })
      .skip(skip)
      .limit(limit);

    const total = await Schedule.countDocuments({ track: req.params.track });

    res.json({
      papers,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPapers: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign schedule to a paper
router.post('/assign', async (req, res) => {
  try {
    const { paperId, assignedDate, assignedTimeSlot, assignedSession } = req.body;

    // Validation
    if (!assignedDate || !assignedTimeSlot || !assignedSession) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check session capacity
    const sessionCount = await Schedule.countDocuments({
      assignedDate,
      assignedSession
    });

    if (sessionCount >= 10) {
      return res.status(400).json({ message: 'Session capacity reached' });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      paperId,
      {
        assignedDate,
        assignedTimeSlot,
        assignedSession
      },
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    res.json(schedule);
  } catch (error) {
    if (error.message.includes('Time slot already taken')) {
      res.status(409).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
});

// Download PDF endpoint
router.get('/download/pdf', async (req, res) => {
  try {
    const { status } = req.query;
    let schedules;
    
    if (status === 'all') {
      schedules = await Schedule.find({})
        .sort({ status: 1, date: 1, sessions: 1, timeSlots: 1 })
        .lean();
    } else {
      let query = {};
      if (status !== undefined) {
        query.status = Number(status);
      }
      schedules = await Schedule.find(query)
        .sort({ date: 1, sessions: 1, timeSlots: 1 })
        .lean();
    }

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: true });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=RAMSITA-2025-schedule.pdf');
    
    doc.pipe(res);
    
    doc.fontSize(20).text('RAMSITA 2025 Conference Schedule', { align: 'center' });
    doc.moveDown(2);

    if (status === 'all') {
      // Group by status first
      const statusGroups = {
        'Confirmed': schedules.filter(s => s.status === 1),
        'Pending': schedules.filter(s => s.status === 0),
        'Cancelled': schedules.filter(s => s.status === 2)
      };

      for (const [statusName, statusSchedules] of Object.entries(statusGroups)) {
        if (statusSchedules.length > 0) {
          doc.addPage();
          doc.fontSize(16).text(`${statusName} Schedules`, { align: 'center' });
          doc.moveDown();

          // Group by date within each status
          const schedulesByDate = statusSchedules.reduce((acc, schedule) => {
            const formattedDate = new Date(schedule.date).toLocaleDateString();
            acc[formattedDate] = acc[formattedDate] || [];
            acc[formattedDate].push(schedule);
            return acc;
          }, {});

          Object.entries(schedulesByDate).forEach(([date, dateSchedules]) => {
            doc.fontSize(14).text(`Date: ${date}`, { underline: true });
            doc.moveDown();

            // Define table structure
            const headers = ['Time', 'Session', 'Paper ID', 'Title', 'Mode', 'Track', 'Venue'];
            const colWidths = [60, 70, 70, 120, 50, 70, 130];
            const startX = 30;
            const startY = doc.y;
            let currentY = startY;

            // Draw table header
            doc.lineWidth(1);
            doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20).stroke();
            let currentX = startX;
            headers.forEach((header, i) => {
              doc.fontSize(10)
                 .text(header, currentX + 5, currentY + 5, { width: colWidths[i], align: 'left' });
              currentX += colWidths[i];
              if (i < headers.length - 1) {
                doc.moveTo(currentX, currentY).lineTo(currentX, currentY + 20).stroke();
              }
            });
            currentY += 20;

            // Draw rows
            dateSchedules.forEach(schedule => {
              const rowData = [
                schedule.timeSlots,
                schedule.sessions,
                schedule.paperId,
                schedule.title,
                schedule.mode,
                schedule.tracks,
                sessionVenueMapping[schedule.sessions] || schedule.venue || 'Not Assigned'
              ];

              const rowHeight = 40;
              doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).stroke();
              
              let currentX = startX;
              rowData.forEach((text, i) => {
                doc.fontSize(9)
                   .text(String(text), currentX + 5, currentY + 5, { 
                     width: colWidths[i] - 10,
                     align: 'left',
                     height: rowHeight - 10
                   });
                currentX += colWidths[i];
                if (i < rowData.length - 1) {
                  doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke();
                }
              });
              currentY += rowHeight;

              // Add new page if needed
              if (currentY > doc.page.height - 100) {
                doc.addPage();
                currentY = 50;
              }
            });

            doc.moveDown(2);
          });
        }
      }
    } else {
      // Existing code for single status
      const schedulesByDate = schedules.reduce((acc, schedule) => {
        const formattedDate = new Date(schedule.date).toLocaleDateString();
        acc[formattedDate] = acc[formattedDate] || [];
        acc[formattedDate].push(schedule);
        return acc;
      }, {});

      Object.entries(schedulesByDate).forEach(([date, dateSchedules]) => {
        doc.fontSize(14).text(`Date: ${date}`, { underline: true });
        doc.moveDown();

        // Define table structure
        const headers = ['Time', 'Session', 'Paper ID', 'Title', 'Mode', 'Track', 'Venue'];
        const colWidths = [60, 70, 70, 120, 50, 70, 130];
        const startX = 30;
        const startY = doc.y;
        let currentY = startY;

        // Draw table header
        doc.lineWidth(1);
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20).stroke();
        let currentX = startX;
        headers.forEach((header, i) => {
          doc.fontSize(10)
             .text(header, currentX + 5, currentY + 5, { width: colWidths[i], align: 'left' });
          currentX += colWidths[i];
          if (i < headers.length - 1) {
            doc.moveTo(currentX, currentY).lineTo(currentX, currentY + 20).stroke();
          }
        });
        currentY += 20;

        // Draw rows
        dateSchedules.forEach(schedule => {
          const rowData = [
            schedule.timeSlots,
            schedule.sessions,
            schedule.paperId,
            schedule.title,
            schedule.mode,
            schedule.tracks,
            sessionVenueMapping[schedule.sessions] || schedule.venue || 'Not Assigned'
          ];

          const rowHeight = 40;
          doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).stroke();
          
          let currentX = startX;
          rowData.forEach((text, i) => {
            doc.fontSize(9)
               .text(String(text), currentX + 5, currentY + 5, { 
                 width: colWidths[i] - 10,
                 align: 'left',
                 height: rowHeight - 10
               });
            currentX += colWidths[i];
            if (i < rowData.length - 1) {
              doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke();
            }
          });
          currentY += rowHeight;

          // Add new page if needed
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
          }
        });

        doc.moveDown(2);
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

// Download Excel endpoint
router.get('/download/excel', async (req, res) => {
  try {
    const { status } = req.query;
    const isAuthenticated = req.header('x-auth-token');
    let schedules;

    if (status === 'all') {
      schedules = await Schedule.find({})
        .sort({ status: 1, date: 1, sessions: 1, timeSlots: 1 })
        .lean();
    } else {
      let query = {};
      if (status !== undefined) {
        query.status = Number(status);
      }
      schedules = await Schedule.find(query)
        .sort({ date: 1, sessions: 1, timeSlots: 1 })
        .lean();
    }

    const workbook = new ExcelJS.Workbook();

    if (status === 'all') {
      // Create separate worksheets for each status
      const statusGroups = {
        'Confirmed': schedules.filter(s => s.status === 1),
        'Pending': schedules.filter(s => s.status === 0),
        'Cancelled': schedules.filter(s => s.status === 2)
      };

      for (const [statusName, statusSchedules] of Object.entries(statusGroups)) {
        if (statusSchedules.length > 0) {
          const worksheet = workbook.addWorksheet(statusName);
          
          // Use the same column definitions as before
          const columns = isAuthenticated ? [
            { header: 'Paper ID', key: 'paperId' },
            { header: 'Email', key: 'email' },
            { header: 'Title', key: 'title' },
            { header: 'Date', key: 'date' },
            { header: 'Time', key: 'timeSlots' },
            { header: 'Session', key: 'sessions' },
            { header: 'Mode', key: 'mode' },
            { header: 'Track', key: 'tracks' },
            { header: 'Venue', key: 'venue' }
          ] : [
            { header: 'Paper ID', key: 'paperId' },
            { header: 'Title', key: 'title' },
            { header: 'Date', key: 'date' },
            { header: 'Time', key: 'timeSlots' },
            { header: 'Session', key: 'sessions' },
            { header: 'Mode', key: 'mode' },
            { header: 'Track', key: 'tracks' },
            { header: 'Venue', key: 'venue' }
          ];

          worksheet.columns = columns;

          // Add rows for this status
          statusSchedules.forEach(schedule => {
            const rowData = {
              paperId: schedule.paperId,
              title: schedule.title,
              date: schedule.date,
              timeSlots: schedule.timeSlots,
              sessions: schedule.sessions,
              mode: schedule.mode,
              tracks: schedule.tracks,
              venue: sessionVenueMapping[schedule.sessions] || schedule.venue || 'Not Assigned'
            };

            if (isAuthenticated) {
              rowData.email = schedule.email;
            }

            worksheet.addRow(rowData);
          });

          // Style the header row
          worksheet.getRow(1).font = { bold: true };
          worksheet.columns.forEach(column => {
            column.width = 15;
          });
        }
      }
    } else {
      // Existing code for single status
      const worksheet = workbook.addWorksheet('Schedule');
      // Define columns based on authentication
      const columns = isAuthenticated ? [
        { header: 'Paper ID', key: 'paperId' },
        { header: 'Email', key: 'email' },
        { header: 'Title', key: 'title' },
        { header: 'Date', key: 'date' },
        { header: 'Time', key: 'timeSlots' },
        { header: 'Session', key: 'sessions' },
        { header: 'Mode', key: 'mode' },
        { header: 'Track', key: 'tracks' },
        { header: 'Venue', key: 'venue' }
      ] : [
        { header: 'Paper ID', key: 'paperId' },
        { header: 'Title', key: 'title' },
        { header: 'Date', key: 'date' },
        { header: 'Time', key: 'timeSlots' },
        { header: 'Session', key: 'sessions' },
        { header: 'Mode', key: 'mode' },
        { header: 'Track', key: 'tracks' },
        { header: 'Venue', key: 'venue' }
      ];

      worksheet.columns = columns;

      // Add rows
      schedules.forEach(schedule => {
        const rowData = {
          paperId: schedule.paperId,
          title: schedule.title,
          date: schedule.date,
          timeSlots: schedule.timeSlots,
          sessions: schedule.sessions,
          mode: schedule.mode,
          tracks: schedule.tracks,
          venue: sessionVenueMapping[schedule.sessions] || schedule.venue || 'Not Assigned'
        };

        // Add email only if authenticated
        if (isAuthenticated) {
          rowData.email = schedule.email;
        }

        worksheet.addRow(rowData);
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=RAMSITA-2025-schedule.xlsx');

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Error generating Excel file' });
  }
});

// Add this at the beginning of the file
const errorHandler = (err, req, res, next) => {
  console.error('Schedule route error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Add this at the end of the file before module.exports
router.use(errorHandler);

module.exports = router; 