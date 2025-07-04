import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import CalendarWidget from "../widgets/CalendarWidget";
import NotesWidget from '../widgets/NotesWidget';
import CourseProgressWidget from '../widgets/CourseProgressWidget';
import Quotes from '../widgets/Quotes';

function StudentHome() {
  const [student, setStudent] = useState(null);
  const [date, setDate] = useState(new Date());
  const [latestNote, setLatestNote] = useState(null);
  const [progress, setProgress] = useState({ coding: 0, quiz: 0, assignment: 0 });
  const [reports, setReports] = useState([]);
  const [quote, setQuote] = useState(null); // ✅ new state for quote

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const res = await axios.get('http://localhost:5000/auth/student/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudent(res.data);
      } catch {
        alert('Failed to load student');
        navigate('/');
      }
    };

    fetchStudentData();
  }, [navigate]);

  useEffect(() => {
    const allQuotes = Quotes();
    const randomIndex = Math.floor(Math.random() * allQuotes.length);
    setQuote(allQuotes[randomIndex]); // ✅ pick one random quote
  }, []);

  useEffect(() => {
    const fetchLatestNote = async () => {
      try {
        if (!student?.batch) return;
        const token = localStorage.getItem('token');

        const batchRes = await API.get(`/student/batch/by-id/${student.batch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const batch = batchRes.data;
        let latest = null;
        let maxDay = -1;

        for (const adminObj of batch.admins || []) {
          const moduleName = adminObj.module;

          const notesRes = await API.get(`/notes/${batch._id}/${moduleName}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const notes = Array.isArray(notesRes.data) ? notesRes.data : notesRes.data.notes || [];
          const latestModuleNote = notes.reduce((acc, note) => {
            if ((note.day || 0) > (acc?.day || 0)) return note;
            return acc;
          }, null);

          if (latestModuleNote && latestModuleNote.day > maxDay) {
            latest = latestModuleNote;
            maxDay = latestModuleNote.day;
          }
        }

        setLatestNote(latest);
      } catch (err) {
        console.error("Error fetching latest note:", err);
      }
    };

    const fetchProgress = async () => {
      try {
        if (!student?._id) return;
        const res = await API.get(`/api/progress/${student._id}`);
        setProgress(res.data);
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      }
    };

    const fetchReports = async () => {
      try {
        if (!student?._id) return;
        const res = await API.get(`/api/reports/${student._id}`);
        setReports(res.data);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      }
    };

    if (student) {
      fetchLatestNote();
      fetchProgress();
      fetchReports();
    }
  }, [student]);

  if (!student) return <p className="text-center mt-6 text-gray-500">Loading...</p>;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-3xl font-semibold text-gray-800">
          Welcome back {student.user?.name}
        </h2>
        {quote && (
  <div className="mt-2 text-gray-600 italic text-sm flex flex-col">
    <span>“{quote.text}”</span>
    <span className="text-xs text-gray-500 mt-1">— {quote.author}</span>
  </div>
)}

      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column */}
        <div className="w-full md:w-3/5">
          <CourseProgressWidget progress={Math.round((progress.assignment + progress.quiz + progress.coding) / 3)} />

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white border shadow-sm rounded-lg p-4 flex flex-col items-center text-center">
              <span className="text-xl font-bold text-blue-600">{progress.assignment}%</span>
              <p className="text-sm text-gray-600 mt-1">Assignment Completed</p>
            </div>
            <div className="bg-white border shadow-sm rounded-lg p-4 flex flex-col items-center text-center">
              <span className="text-xl font-bold text-yellow-600">{progress.quiz}%</span>
              <p className="text-sm text-gray-600 mt-1">Quiz Completed</p>
            </div>
            <div className="bg-white border shadow-sm rounded-lg p-4 flex flex-col items-center text-center">
              <span className="text-xl font-bold text-yellow-600">{progress.coding}%</span>
              <p className="text-sm text-gray-600 mt-1">Coding Completed</p>
            </div>
          </div>

          {/* Latest Note Widget */}
          {latestNote && (
            <div className="mt-6 bg-white border shadow-sm rounded-lg p-5 space-y-2">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-md font-semibold text-gray-800">
                  Latest Note - Day {latestNote.day}
                </h3>
              </div>
              <p className="text-sm text-gray-700 font-medium">{latestNote.title}</p>
              <div className="flex gap-3 mt-3">
                <a
                  href={latestNote.meetlink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1 bg-black text-white rounded hover:bg-gray-700 transition-colors duration-200"
                >
                  Join Meet
                </a>
                <a
                  href={latestNote.quizlink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1 bg-black text-white rounded hover:bg-gray-700 transition-colors duration-200"
                >
                  Attempt Quiz
                </a>
              </div>
            </div>
          )}

          {/* Marks Table */}
          {reports.length > 0 && (
  <div className="mt-6 bg-white border shadow-sm rounded-lg p-5">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Marks</h3>

    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-700 border">
        <thead className="bg-gray-100 text-gray-600 uppercase">
          <tr>
            <th className="px-4 py-2">Module</th>
            <th className="px-4 py-2">Day</th>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Quiz</th>
            <th className="px-4 py-2">Assignment</th>
          </tr>
        </thead>
      </table>

      {/* Scrollable Body */}
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-700 border-t">
          <tbody>
            {[...reports]
              .sort((a, b) => b.day - a.day)
              .map((report, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-4 py-2">{report.module}</td>
                  <td className="px-4 py-2">{report.day}</td>
                  {report.marksObtained.map((mark, i) => (
                    <td className="px-4 py-2" key={i}>
                      {mark === -2
                        ? "Not Submitted"
                        : mark === -1
                        ? "Not Evaluated"
                        : mark}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

        </div>

        {/* Right Column */}
        <div className="w-full md:w-2/5 space-y-6">
          <CalendarWidget date={date} setDate={setDate} />
          <NotesWidget studentId={student._id} />
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
