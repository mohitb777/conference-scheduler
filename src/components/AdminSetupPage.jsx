import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { sessionVenueMapping } from '../constants/scheduleConstants';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const AdminSetupPage = () => {
  const navigate = useNavigate();
  const sessionTimeSlotMapping = {
    'Session 1': '2:40 PM - 4:30 PM',
    'Session 2': '2:40 PM - 4:30 PM', 
    'Session 3': '2:40 PM - 4:30 PM',
    'Session 4': '2:40 PM - 4:30 PM',
    'Session 5': '2:40 PM - 4:30 PM',
    'Session 6': '11:30 AM - 1:00 PM',
    'Session 7': '11:30 AM - 1:00 PM',
    'Session 8': '11:30 AM - 1:00 PM',
    'Session 9': '11:30 AM - 1:00 PM',
    'Session 10': '11:30 AM - 1:00 PM'
  };

  const getTimeSlotForSession = (session) => {
    return sessionTimeSlotMapping[session] || '';
  };

  const sessionTrackMapping = {
    'Session 1': 'Artificial Intelligence, Intelligent Systems and Automation',
    'Session 2': 'Artificial Intelligence, Intelligent Systems and Automation',
    'Session 3': 'Artificial Intelligence, Intelligent Systems and Automation',
    'Session 4': '5G, IOT and Futuristic Technologies',
    'Session 5': 'Augmented Reality, Virtual Reality and Robotics, Multimedia Services and Technologies, Blockchain and Cyberphysical Systems',
    'Session 6': 'Artificial Intelligence, Intelligent Systems and Automation',
    'Session 7': 'Artificial Intelligence, Intelligent Systems and Automation',
    'Session 8': 'Green Computing and Sustainability, Renewable Energy and Global Sustainability, Smart City, Smart Systems and VLSI based Technologies',
    'Session 9': 'Ubiquitous Computing, Networking and Cyber Security',
    'Session 10': 'Big Data, Data Science and Engineering, Natural Language Processing'
  };

  const normalizeTrackName = (track) => {
    return track.trim().toLowerCase();
  };

  const [papers, setPapers] = useState([]);
  const [selectedRows, setSelectedRows] = useState([{
    paperId: '',
    email: '',
    contact: '',
    title: '',
    mode: '',
    tracks: '',
    date: '',
    timeSlots: '',
    sessions: ''
  }]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);

  const dates = ['2025-02-07', '2025-02-08'];
  const sessions = [
    'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5',
    'Session 6', 'Session 7', 'Session 8', 'Session 9', 'Session 10'
  ];
  const tracks = [
    'Big Data, Data Science and Engineering, Natural Language Processing',
    'Ubiquitous Computing, Networking and Cyber Security',
    'Green Computing and Sustainability, Renewable Energy and Global Sustainability, Smart City, Smart Systems and VLSI based Technologies',
    'Artificial Intelligence, Intelligent Systems and Automation',
    'Augmented Reality, Virtual Reality and Robotics, Multimedia Services and Technologies, Blockchain and Cyberphysical Systems',
    '5G, IOT and Futuristic Technologies'
  ];

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/papers`);
        if (!response.ok) {
          throw new Error(`Failed to fetch papers: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.length === 0) {
          const seedResponse = await fetch(`${API_BASE_URL}/papers/seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!seedResponse.ok) {
            throw new Error(`Failed to seed papers: ${seedResponse.status} ${seedResponse.statusText}`);
          }
          const seedData = await seedResponse.json();
          setPapers(seedData);
        } else {
          setPapers(data);
        }
      } catch (error) {
        console.error('Error fetching papers:', error);
        toast.error(error.message);
      }
    };
    fetchPapers();
  }, []);

  const handlePaperSelect = async (index, paperId) => {
    try {
      if (!paperId) return;

      const scheduleResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SCHEDULE.CHECK(paperId)}`);
      const scheduleData = await scheduleResponse.json();     
      if (scheduleData.isScheduled) {
        toast.error(`Paper ${paperId} is already scheduled`);
        return;
      }

      const paper = papers.find(p => p.paperId.toString() === paperId.toString());
      if (!paper) {
        toast.error('Paper not found');
        return;
      }

      // Get the manually selected session if it exists
      const manuallySelectedSession = selectedRows[0]?.sessions;

      let selectedSession;
      if (manuallySelectedSession) {
        // Verify if manual selection matches paper track
        const expectedTrack = sessionTrackMapping[manuallySelectedSession];
        if (normalizeTrackName(expectedTrack) === normalizeTrackName(paper.tracks)) {
          selectedSession = manuallySelectedSession;
        } else {
          toast.error('Selected session does not match paper track');
          return;
        }
      } else {
        // Only fall back to automatic selection if no manual selection exists
        const availableSessions = Object.entries(sessionTrackMapping)
          .filter(([_, trackName]) => normalizeTrackName(trackName) === normalizeTrackName(paper.tracks))
          .map(([session]) => session);

        if (availableSessions.length === 0) {
          toast.error('No available sessions for this paper\'s track');
          return;
        }
        selectedSession = availableSessions[0];
      }

      const sessionNumber = parseInt(selectedSession.split(' ')[1]);
      const date = sessionNumber <= 5 ? '2025-02-07' : '2025-02-08';
      
      // Update the current row with paper details and session info
      const updatedRows = [...selectedRows];
      updatedRows[index] = {
        ...paper,
        sessions: selectedSession,
        timeSlots: sessionTimeSlotMapping[selectedSession],
        date: date,
        venue: sessionVenueMapping[selectedSession]
      };
      setSelectedRows(updatedRows);
      
    } catch (error) {
      console.error('Error selecting paper:', error);
      toast.error('Failed to select paper');
    }
  };

  const handleSessionSelect = (session) => {
    const updatedRows = [...selectedRows];
    updatedRows[0] = {
      ...updatedRows[0],
      sessions: session,
      timeSlots: sessionTimeSlotMapping[session],
      venue: sessionVenueMapping[session]
    };
    setSelectedRows(updatedRows);
    setSelectedSessions(prev => [...new Set([...prev, session])]);
  };

  const handleTrackChange = (index, track) => {
    const updatedRows = [...selectedRows];
    updatedRows[index] = {
      ...updatedRows[index],
      tracks: track,
      paperId: '',
      email: '',
      contact: '',
      title: '',
      mode: ''
    };
    setSelectedRows(updatedRows);
  };

  const handleAddRow = () => {
    setSelectedRows([...selectedRows, {
      paperId: '',
      email: '',
      contact: '',
      title: '',
      mode: '',
      tracks: '',
      date: selectedRows[0]?.date || '',
      timeSlots: selectedRows[0]?.timeSlots || '',
      sessions: selectedRows[0]?.sessions || '',
      venue: selectedRows[0]?.venue || ''
    }]);
  };

  const handleRemoveRow = (index) => {
    if (selectedRows.length === 1) {
      // If it's the last row, just clear the data but keep date/slots/sessions
      setSelectedRows([{
        paperId: '',
        email: '',
        contact: '',
        title: '',
        mode: '',
        tracks: '',
        date: selectedRows[0].date,
        timeSlots: selectedRows[0].timeSlots,
        sessions: selectedRows[0].sessions
      }]);
    } else {
      // Remove the row from the array
      const updatedRows = selectedRows.filter((_, i) => i !== index);
      setSelectedRows(updatedRows);
    }
  };

  const handleSubmit = async () => {
    try {
      const selectedPapers = selectedRows.filter(row => row.paperId);
      console.log('Selected papers before validation:', selectedPapers.map(paper => ({
        paperId: paper.paperId,
        sessions: paper.sessions,
        timeSlots: paper.timeSlots,
        date: paper.date,
        venue: paper.venue
      })));
      
      if (selectedPapers.length === 0) {
        toast.error('Please select at least one paper');
        return;
      }

      // Keep this validation to ensure all required fields are present
      for (const paper of selectedPapers) {
        console.log('Checking paper:', paper);
        if (!paper.sessions || !paper.timeSlots || !paper.date || !paper.venue) {
          console.log('Missing fields:', {
            sessions: !paper.sessions,
            timeSlots: !paper.timeSlots,
            date: !paper.date,
            venue: !paper.venue
          });
          toast.error(`Please select sessions for paper ${paper.paperId}`);
          return;
        }
      }

      // Include all required fields in scheduleData
      const scheduleData = selectedPapers.map(paper => ({
        paperId: paper.paperId,
        tracks: paper.tracks,
        sessions: paper.sessions,
        timeSlots: paper.timeSlots,
        date: paper.date,
        venue: paper.venue,
        mode: paper.mode,
        title: paper.title,
        email: paper.email
      }));

      console.log('Schedule Data to be sent:', scheduleData);

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SCHEDULE.SAVE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(scheduleData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save schedule');
      }

      toast.success('Schedule saved successfully');
      // Clear selection after successful save
      setSelectedRows([{
        paperId: '',
        email: '',
        contact: '',
        title: '',
        mode: '',
        tracks: '',
        date: '',
        timeSlots: '',
        sessions: '',
        venue: ''
      }]);
      setSelectedSessions([]);
    } catch (error) {
      console.error('Schedule save error:', error);
      toast.error(error.message || 'Failed to save schedule');
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedRows(rows => 
      rows.map(row => ({...row, date: newDate}))
    );
    if (newDate) {
      fetchAvailableSlots(newDate);
    }
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/available-slots?date=${date}`, {
        headers: {
          'Accept': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to fetch available slots');
      return [];
    }
  };

  const handleSendEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to send confirmation emails');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/schedule/send-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });

      const data = await response.json();

      if (response.ok) {
        const successCount = data.results.filter(r => r.status === 'success').length;
        const failCount = data.results.filter(r => r.status === 'failed').length;
        
        if (failCount === 0) {
          toast.success(`Successfully sent ${successCount} confirmation emails`);
        } else {
          toast.error(`Sent ${successCount} emails, ${failCount} failed`);
        }
      } else {
        if (response.status === 401) {
          toast.error('Authentication required. Please login again.');
          // Optionally redirect to login page
        } else {
          toast.error(data.message || 'Error sending confirmation emails');
        }
      }
    } catch (error) {
      toast.error('Error sending confirmation emails');
    }
  };

  const getAvailableSessions = (selectedDate) => {
    if (!selectedDate) return [];
    
    if (selectedDate === '2025-02-07') {
      return ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5'];
    } else if (selectedDate === '2025-02-08') {
      return ['Session 6', 'Session 7', 'Session 8', 'Session 9', 'Session 10'];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-6 text-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Conference Schedule Setup
          </span>
        </h2>
        
        {/* Selection Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Date Selection */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Conference Date
            </label>
            <select
              value={selectedRows[0]?.date || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="">Choose Date</option>
              {dates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>

          {/* Sessions Selection */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 md:col-span-2">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Available Sessions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {sessions
                .filter(session => getAvailableSessions(selectedRows[0]?.date).includes(session))
                .map((session) => (
                  <div key={session} 
                    className="flex flex-col p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="session-selection"
                        checked={selectedRows[0]?.sessions === session}
                        onChange={() => handleSessionSelect(session)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <span className="font-medium text-gray-800">{session}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({getTimeSlotForSession(session)})
                        </span>
                      </div>
                    </div>
                    <div className="ml-7 text-sm text-gray-600">
                      {sessionVenueMapping[session]}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Papers Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <th className="px-6 py-4 text-white">Paper ID</th>
                  <th className="px-6 py-4 text-white">Email</th>
                  <th className="px-6 py-4 text-white">Contact</th>
                  <th className="px-6 py-4 text-white">Title</th>
                  <th className="px-6 py-4 text-white">Mode</th>
                  <th className="px-6 py-4 text-white">Tracks</th>
                  <th className="px-6 py-4 text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedRows.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="border px-4 py-2">
                      <select
                        value={row.paperId || ''}
                        onChange={(e) => handlePaperSelect(index, e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">Select Paper ID</option>
                        {papers
                          .filter(p => !selectedRows.some(r => r.paperId === p.paperId && r !== row))
                          .map(paper => (
                            <option key={paper.paperId} value={paper.paperId}>
                              {paper.paperId}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        value={row.email}
                        readOnly
                        className="w-full p-2 bg-gray-100"
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        value={row.contact}
                        readOnly
                        className="w-full p-2 bg-gray-100"
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        value={row.title}
                        readOnly
                        className="w-full p-2 bg-gray-100"
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        value={row.mode}
                        readOnly
                        className="w-full p-2 bg-gray-100"
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <div className="space-y-1 max-h-32 overflow-y-auto p-2">
                        {(row.paperId ? [papers.find(p => p.paperId === row.paperId)?.tracks] : tracks).map(track => (
                          track && (
                            <label key={track} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`track-${index}`}
                                value={track}
                                checked={row.tracks === track}
                                onChange={(e) => handleTrackChange(index, e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{track}</span>
                            </label>
                          )
                        ))}
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleAddRow}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-1 transition-all duration-200 shadow-md"
          >
            Add Paper
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-200 shadow-md"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

const checkTimeSlotAvailability = async (session, slot, date) => {
  try {
    const response = await fetch(
      `https://conference-scheduler-ns0z4zt2b-mohits-projects-a2c7dc06.vercel.app.app/api/schedule/check-availability?date=${date}&timeSlot=${slot}&session=${session}`
    );
    if (!response.ok) throw new Error('Failed to check availability');
    const data = await response.json();
    return data.isAvailable;
  } catch (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }
};

const TimeSlotCheckbox = ({ slot, session, date, isChecked, onChange }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      if (date) {
        setIsLoading(true);
        try {
          const available = await checkTimeSlotAvailability(session, slot, date);
          setIsAvailable(available);
        } catch (error) {
          console.error('Error checking availability:', error);
          setIsAvailable(false);
        }
        setIsLoading(false);
      }
    };
    checkAvailability();
  }, [date, session, slot]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  // Don't render anything if the slot is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{slot}</span>
    </label>
  );
};

export default AdminSetupPage;
