import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import StatusIndicator from './StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { sessionTrackMapping, sessionVenueMapping } from '../constants/scheduleConstants';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const ScheduleViewer = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    session: '',
    track: '',
    mode: '',
    timeSlot: '',
    venue: '',
    status: ''
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dates = ['2025-02-07', '2025-02-08'];
  const sessions = [
    'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5',
    'Session 6', 'Session 7', 'Session 8', 'Session 9', 'Session 10'
  ];
  const modes = ['Online', 'Offline'];
  const timeSlots = [
    '11:30 AM - 1:00 PM',
    '2:40 PM - 4:30 PM'
  ];
  const tracks = [
    'Big Data, Data Science and Engineering, Natural Language Processing',
    'Ubiquitous Computing, Networking and Cyber Security',
    'Green Computing and Sustainability, Renewable Energy and Global Sustainability, Smart City, Smart Systems and VLSI based Technologies',
    'Artificial Intelligence, Intelligent Systems and Automation',
    'Augmented Reality, Virtual Reality and Robotics, Multimedia Services and Technologies, Blockchain and Cyberphysical Systems',
    '5G, IOT and Futuristic Technologies'
  ];

  const venues = Array.from(new Set(Object.values(sessionVenueMapping)));
  const STATUS = {
    PENDING: 0,
    CONFIRMED: 1,
    CANCELLED: 2
  };

  const statusMapping = {
    0: 'Pending',
    1: 'Confirmed',
    2: 'Cancelled'
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://conference-scheduler-bay.vercel.app/api/schedule/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const intervalId = setInterval(fetchSchedules, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  const normalizeMode = (mode) => {
    if (!mode) return '';
    return mode.toLowerCase().trim();
  };

  const filteredSchedules = schedules.filter(schedule => {
    return (
      (!filters.date || schedule.date === filters.date) &&
      (!filters.timeSlot || schedule.timeSlots === filters.timeSlot) &&
      (!filters.session || schedule.sessions === filters.session) &&
      (!filters.track || schedule.tracks === filters.track) &&
      (!filters.mode || normalizeMode(schedule.mode) === normalizeMode(filters.mode)) &&
      (!filters.venue || sessionVenueMapping[schedule.sessions] === filters.venue) &&
      (filters.status === '' || Number(schedule.status) === Number(filters.status))
    );
  });

  const downloadPDF = async () => {
    try {
      const response = await fetch('https://conference-scheduler-bay.vercel.app/api/schedule/download/pdf', {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RAMSITA-2025-schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const downloadExcel = async () => {
    try {
      const response = await fetch('https://conference-scheduler-bay.vercel.app/api/schedule/download/excel', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RAMSITA-2025-schedule-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    }
  };

  const handleSendEmails = async () => {
    try {
      if (!token) {
        toast.error('Please login to send confirmation emails');
        return;
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SCHEDULE.SEND_EMAILS}`, {
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
          toast.error(`Sent ${successCount} emails, ${failCount} failed`); // Changed from warning to error
        }
      } else {
        toast.error(data.message || 'Error sending confirmation emails');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error sending confirmation emails');
    }
    await fetchSchedules();
  };

  const handleSendConfirmationEmail = async (paperId) => {
    try {
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SCHEDULE.SEND_CONFIRMATION(paperId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.details || 'Failed to send confirmation email');
      }

      toast.success('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      toast.error(error.message || 'Failed to send confirmation email');
    }
  };

  const handleDelete = async (paperId) => {
    try {
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/schedule/${paperId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete schedule');
      }

      toast.success('Schedule deleted successfully');
      await fetchSchedules(); // Refresh the schedules list
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Presentation Schedule</h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {isAuthenticated && isAdmin && (
              <button
                onClick={handleSendEmails}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-200"
              >
                Send Confirmation Emails
              </button>
            )}
            <button
              onClick={downloadPDF}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Download PDF
            </button>
            <button
              onClick={downloadExcel}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Download Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <select
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Dates</option>
            {dates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>

          <select
            value={filters.timeSlot}
            onChange={(e) => setFilters({...filters, timeSlot: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Time Slots</option>
            {timeSlots.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>

          <select
            value={filters.session}
            onChange={(e) => setFilters({...filters, session: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Sessions</option>
            {sessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>

          <select
            value={filters.track}
            onChange={(e) => setFilters({...filters, track: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Tracks</option>
            {tracks.map(track => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>

          <select
            value={filters.mode}
            onChange={(e) => setFilters({...filters, mode: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Modes</option>
            {modes.map(mode => (
              <option key={mode} value={mode.toLowerCase()}>{mode}</option>
            ))}
          </select>

          <select
            value={filters.venue || ''}
            onChange={(e) => setFilters({...filters, venue: e.target.value})}
            className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">All Venues</option>
            {venues.map((venue, index) => (
              <option key={index} value={venue}>
                {venue}
              </option>
            ))}
          </select>

          {isAdmin && (
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value === '' ? '' : Number(e.target.value)})}
              className="p-2 border rounded hover:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusMapping).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-lg bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-purple-600">
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Paper ID</th>
                {isAuthenticated && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider w-40">Email</th>
                )}
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Track</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Time Slot</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Session</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Venue</th>
                {isAuthenticated && (
                  <>
                    <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Email Status</th>
                  </>
                )}
                {isAdmin && <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchedules.map((schedule, index) => (
                <tr key={schedule.paperId} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150 ease-in-out`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{schedule.paperId}</td>
                  {isAuthenticated && (
                    <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[160px]">{schedule.email}</td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900">{schedule.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{schedule.mode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{schedule.tracks}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{schedule.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{schedule.timeSlots}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{schedule.sessions}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sessionVenueMapping[schedule.sessions]}</td>
                  {isAuthenticated && (
                    <>
                      <td className="px-4 py-2 border">
                        <button
                          onClick={() => handleDelete(schedule.paperId)}
                          className="bg-gradient-to-r from-red-400 to-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:from-red-500 hover:to-red-600 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          Delete
                        </button>
                      </td>
                      <td className="px-4 py-2 border">
                        <button
                          onClick={() => handleSendConfirmationEmail(schedule.paperId)}
                          className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:from-blue-500 hover:to-blue-600 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          Send Email
                        </button>
                      </td>
                    </>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        schedule.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                        schedule.status === 1 ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {statusMapping[schedule.status]}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScheduleViewer; 