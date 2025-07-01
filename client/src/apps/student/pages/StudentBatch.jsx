import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from "../api";
import { FaVideo, FaQuestionCircle, FaFileAlt, FaUpload , FaCheckCircle } from 'react-icons/fa';

export default function StudentBatch() {
  const { batchId } = useParams();
  const [student, setStudent] = useState(null);
  const [batch, setBatch] = useState(null);
  const [notesMap, setNotesMap] = useState({});
  const [activeModule, setActiveModule] = useState(null);
  const [reports, setReports] = useState([]);
  const [quizzesMap, setQuizzesMap] = useState({});
  const navigate = useNavigate();


  
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/auth/student/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudent(res.data);
      } catch (err) {
        console.error(err);
        navigate('/');
      }
    };
    fetchStudent();
  }, [navigate]);

  useEffect(() => {
    const fetchBatchAndNotes = async () => {
      try {
        const res = await api.get(`/student/batch/by-id/${batchId}`);
        setBatch(res.data);

        const token = localStorage.getItem('token');
        const allNotes = {};
        let latestModule = null;
        let maxOverallDay = -1;

        for (const adminObj of res.data.admins) {
          const moduleName = adminObj.module;
          const noteRes = await api.get(`/notes/${batchId}/${moduleName}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const notes = Array.isArray(noteRes.data) ? noteRes.data : noteRes.data.notes || [];
          const maxDay = Math.max(...notes.map(note => note.day || 0));

          if (maxDay > maxOverallDay) {
            maxOverallDay = maxDay;
            latestModule = moduleName;
          }

          allNotes[moduleName] = {
            today: notes.filter(note => note.day === maxDay),
            others: notes.filter(note => note.day !== maxDay)
          };
        }

        const quizMap = {};
for (const module in allNotes) {
  for (const note of [...allNotes[module].today, ...allNotes[module].others]) {
    try {
      const res = await api.get(`/api/quiz/by-note/${note._id}`);
      if (res.data?._id) {
        quizMap[note._id] = res.data;
      }
    } catch {
      console.error("No quiz uploaded for this note");
    }
  }
}
setQuizzesMap(quizMap);

        setNotesMap(allNotes);


        if (latestModule) setActiveModule(latestModule);
      } catch (err) {
        console.error('Error loading batch or notes:', err);
      }
    };

    if (batchId) fetchBatchAndNotes();
  }, [batchId]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        if (!student?._id) return;
        const res = await api.get(`/api/reports/${student._id}`);
        setReports(res.data);
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    if (student) fetchReports();
  }, [student]);

  const getAssignmentMark = (module, day) => {
    const match = reports.find(r => r.module === module && r.day === day);
    return match ? match.marksObtained?.[2] ?? -2 : -2;
  };

  const getQuizMark = (module, day) => {
    const match = reports.find(r => r.module === module && r.day === day);
    return match ? match.marksObtained?.[1] ?? -2 : -2;
  };

  const renderNoteCard = (note, student, batchId, module, large = false, index = 0) => {
    const assignmentMark = getAssignmentMark(module, note.day);
    const quizMark = getQuizMark(module, note.day);

    const viewAssignment = async () => {
      try {
        const res = await axios.get(`http://localhost:5002/assignment-question/${encodeURIComponent(batch.batchName)}/${encodeURIComponent(module)}/${encodeURIComponent(note.title)}`);
        if (res.data?.url) {
          window.open(res.data.url, '_blank');
        } else {
          alert("Assignment link not found");
        }
      } catch (err) {
        console.error("Error fetching assignment link:", err);
        alert("Failed to fetch assignment link");
      }
    };

    return (
      <div
        key={note._id}
        className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex flex-col gap-4 transition hover:shadow-lg"
      >
        <h4 className="text-lg font-semibold text-gray-800">Day {note.day}: {note.title}</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.open(note.meetlink, '_blank')}
            className="flex items-center gap-2 text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            <FaVideo /> Join Meet
          </button>

          {!quizzesMap[note._id] ? (
  <button
    disabled
    className="flex items-center gap-2 text-sm px-4 py-2 rounded bg-gray-300 text-gray-700 cursor-not-allowed"
  >
    <FaQuestionCircle /> No Quiz Available
  </button>
) : quizMark >= 0 ? (
  <button
    disabled
    className="flex items-center gap-2 text-sm px-4 py-2 rounded bg-green-500 text-white cursor-not-allowed"
  >
    <FaCheckCircle /> Submitted
  </button>
) : (
  <button
    onClick={() => navigate(`/student/quiz/attempt/${note._id}`)}
    className="flex items-center gap-2 text-sm px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
  >
    <FaQuestionCircle /> Attempt Quiz
  </button>
)}


          <button
            onClick={viewAssignment}
            className="flex items-center gap-2 text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            <FaFileAlt /> View Assignment
          </button>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {assignmentMark === -2 ? (
            <>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => note.file = e.target.files[0]}
                className="border border-gray-300 px-3 py-2 rounded text-sm w-full"
              />
              <button
                title="Upload Answer"
                onClick={() => {
                  if (!note.file) return alert('Choose a PDF');
                  const fd = new FormData();
                  fd.append('file', note.file);
                  axios.post(
                    `http://localhost:5002/notes/upload/${encodeURIComponent(batch.batchName)}/${module}/${encodeURIComponent(note.title)}/${encodeURIComponent(student.user.name)}/${student._id}/${note.day}`,
                    fd
                  ).then(() => alert('Answer uploaded')).catch(console.error);
                }}
                className="bg-black text-white p-3 rounded-full hover:bg-gray-800"
              >
                <FaUpload />
              </button>
            </>
          ) : assignmentMark === -1 ? (
            <p className="text-sm text-yellow-600 font-medium">Submitted (Pending Evaluation)</p>
          ) : (
            <p className="text-sm text-green-700 font-semibold">Mark: {assignmentMark}</p>
          )}
        </div>
      </div>
    );
  };

  if (!student || !batch) {
    return <p className="text-center mt-6 text-gray-500">Loading...</p>;
  }

  const currentModuleNotes = notesMap[activeModule] || { today: [], others: [] };

  return (
    <div className="p-6 bg-[#f5f9ff] min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black">
          My Batch: <span className="text-[#4086F4]">{batch.batchName}</span>
        </h2>
      </div>

      {/* Module Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(notesMap).map(module => (
          <button
            key={module}
            onClick={() => setActiveModule(module)}
            className={`px-4 py-2 rounded-full border font-medium ${
              module === activeModule
                ? 'bg-[#4086F4] text-white border-[#4086F4]'
                : 'bg-white text-gray-800 border-gray-300 hover:bg-blue-50'
            }`}
          >
            {module}
          </button>
        ))}
      </div>

      {/* Notes Section */}
      <div className="mb-10">
        {currentModuleNotes.today.length > 0 && (
          <div className="mb-10">
            <h4 className="text-md font-semibold text-green-600 mb-3">Latest Note</h4>
            {currentModuleNotes.today.map((note, index) =>
              renderNoteCard(note, student, batchId, activeModule, true, index)
            )}
          </div>
        )}

        {currentModuleNotes.others.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {currentModuleNotes.others.map((note, index) =>
              renderNoteCard(note, student, batchId, activeModule, false, index)
            )}
          </div>
        )}

        {currentModuleNotes.today.length === 0 && currentModuleNotes.others.length === 0 && (
          <p className="text-gray-500 text-sm">No notes uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
