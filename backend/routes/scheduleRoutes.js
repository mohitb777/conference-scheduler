const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Schedule = require('../models/Schedule');
const validateSchedule = require('../middleware/validateSchedule');
const authMiddleware = require('../middleware/authMiddleware');
const { sendScheduleEmail } = require('../utils/emailService');
const { sessionTrackMapping, sessionTimeSlotMapping } = require('../constants/scheduleConstants');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { sessionVenueMapping } = require('../utils/mappings');

// Debug middleware
router.use((req, res, next) => {
  console.log('Schedule Route:', req.method, req.path);
  console.log('Request Body:', req.body);
  next();
});

// Specific routes first
router.post('/save', validateSchedule, async (req, res) => {
  try {
    const schedules = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check for existing schedules
    for (const schedule of schedules) {
      const existingSchedule = await Schedule.findOne({ paperId: schedule.paperId });
      if (existingSchedule) {
        return res.status(400).json({
          message: `Paper ${schedule.paperId} is already scheduled`
        });
      }
    }

    // Check session capacity
    for (const schedule of schedules) {
      const sessionCount = await Schedule.countDocuments({
        date: schedule.date,
        sessions: schedule.sessions,
        timeSlots: schedule.timeSlots
      });
      
      if (sessionCount >= 15) {
        return res.status(400).json({
          message: `Session ${schedule.sessions} on ${schedule.date} at ${schedule.timeSlots} is full (maximum 15 papers)`
        });
      }
    }

    const savedSchedules = await Schedule.insertMany(schedules);
    
    res.status(201).json({
      message: 'Schedules saved successfully',
      schedules: savedSchedules
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ message: error.message });
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
    const schedules = await Schedule.find({})
      .sort({ date: 1, sessions: 1, timeSlots: 1 })
      .lean();
    
    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: true });
    
    // Set response headers before any potential errors
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=RAMSITA-2025-schedule.pdf');
    
    // Handle errors in the PDF stream
    doc.on('error', (err) => {
      console.error('Error in PDF generation:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error generating PDF' });
      }
    });

    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).text('RAMSITA 2025 Conference Schedule', { align: 'center' });
    doc.moveDown(2);
    
    // Group schedules by date
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
      const colWidths = [60, 70, 70, 120, 50, 70, 80];
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

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF' });
    }
  }
});

// Download Excel endpoint
router.get('/download/excel', async (req, res) => {
  try {
    const schedules = await Schedule.find({})
      .sort({ date: 1, sessions: 1, timeSlots: 1 })
      .lean();

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RAMSITA 2025';
    workbook.lastModifiedBy = 'RAMSITA System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Group schedules by date
    const dateGroups = schedules.reduce((acc, schedule) => {
      acc[schedule.date] = acc[schedule.date] || [];
      acc[schedule.date].push(schedule);
      return acc;
    }, {});

    Object.entries(dateGroups).forEach(([date, dateSchedules]) => {
      const worksheet = workbook.addWorksheet(date);

      // Add headers with venue
      worksheet.columns = [
        { header: 'Time', key: 'time', width: 20 },
        { header: 'Session', key: 'session', width: 15 },
        { header: 'Paper ID', key: 'paperId', width: 15 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Mode', key: 'mode', width: 10 },
        { header: 'Track', key: 'track', width: 15 },
        { header: 'Venue', key: 'venue', width: 30 },
        { header: 'Email', key: 'email', width: 30 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data with venue
      dateSchedules.forEach(schedule => {
        worksheet.addRow({
          time: schedule.timeSlots,
          session: schedule.sessions,
          paperId: schedule.paperId,
          title: schedule.title,
          mode: schedule.mode,
          track: schedule.tracks,
          venue: sessionVenueMapping[schedule.sessions] || schedule.venue || 'Not Assigned',
          email: schedule.email
        });
      });

      // Style all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error) {
    console.error('Error generating Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating Excel file' });
    }
  }
});

// Move the check-conflicts route
router.get('/check-conflicts', async (req, res) => {
  try {
    const { date, timeSlot, session } = req.query;
    
    console.log('Checking conflicts for:', { date, timeSlot, session });
    
    const existing = await Schedule.findOne({
      date: date,
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