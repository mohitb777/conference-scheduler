import React, { useEffect, useState } from 'react';

const DebugView = () => {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const fetchAllSchedules = async () => {
      try {
        const response = await fetch('http://conference-scheduler-bay.vercel.app/api/schedule/all');
        if (response.ok) {
          const data = await response.json();
          setSchedules(data);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    };

    fetchAllSchedules();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Stored Schedules</h2>
      {schedules.map((schedule, index) => (
        <div key={schedule._id} className="mb-8 p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Schedule {index + 1}</h3>
          <p><strong>Date:</strong> {new Date(schedule.date).toLocaleDateString()}</p>
          
          <div className="mt-4">
            <h4 className="font-semibold">Time Slots:</h4>
            <ul>
              {schedule.timeSlots.map((slot, i) => (
                <li key={i}>{slot.startTime} - {slot.endTime}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Teams:</h4>
            <ul>
              {schedule.teams.map((team, i) => (
                <li key={i}>
                  {team.teamName} ({team.registrationNumber}) - {team.mode}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Panel Options:</h4>
            <pre>{JSON.stringify(schedule.panelOptions, null, 2)}</pre>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Track Options:</h4>
            <pre>{JSON.stringify(schedule.trackOptions, null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DebugView; 