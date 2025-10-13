import React, { useState, useEffect, useCallback } from 'react';

// --- Configuration ---
// IMPORTANT: Change this URL to your backend's API endpoint.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- API Service ---

// --- API Service ---
const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'An error occurred');
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return { success: true, message: 'Operation successful' };
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        throw error;
    }
};

// --- Reusable Components ---
const Spinner = () => (
    <div className="spinner-container">
        <div className="spinner"></div>
    </div>
);

const Modal = ({ message, type, onClose }) => (
    <div className="modal-overlay">
        <div className={`modal-content ${type}`}>
            <p>{message}</p>
            <button onClick={onClose}>Close</button>
        </div>
    </div>
);


// --- Page Components ---
const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const data = await apiRequest('/login', 'POST', { username, password });
            if (data.token) {
                onLogin(data.token);
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>Welcome Back</h1>
                    <p>Enter your credentials to continue</p>
                </div>
                {error && <div className="login-error">{error}</div>}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner /> : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const DashboardPage = ({ navigate, onLogout }) => {
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const classData = await apiRequest('/classes');
            const sessionData = await apiRequest('/sessions');
            setClasses(classData);
            setSessions(sessionData);
        } catch (err) {
            setError(err.message || 'Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteClass = async (id) => {
        if (window.confirm('Are you sure you want to delete this class?')) {
            try {
                await apiRequest(`/classes/${id}`, 'DELETE');
                fetchData();
            } catch (err) { alert(err.message || 'Failed to delete class.'); }
        }
    };

    const handleDeleteSession = async (name) => {
        if (window.confirm('Are you sure you want to delete this session and all associated classes?')) {
            try {
                await apiRequest(`/sessions/${name}`, 'DELETE');
                fetchData();
            } catch (err) { alert(err.message || 'Failed to delete session.'); }
        }
    };
    
    if (isLoading) return <div className="page-padding"><Spinner /></div>;
    if (error) return <div className="page-padding" style={{color: 'red'}}>{error}</div>;

    return (
        <div className="page-padding">
            <h2 className="page-header">Dashboard</h2>
            <div className="button-group">
                <button onClick={() => navigate('addClass')} className="btn btn-primary">Add New Class</button>
                <button onClick={() => navigate('addSession')} className="btn btn-secondary">Add New Session</button>
                <button onClick={onLogout} className="btn btn-danger btn-logout">Logout</button>
            </div>

            <div className="card">
                <h3 className="card-header">All Classes</h3>
                <div className="table-container">
                    <table className="styled-table">
                        <thead>
                            <tr><th>#</th><th>Class Name</th><th>Session</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {classes.length > 0 ? classes.map((cls, i) => (
                                <tr key={cls._id}>
                                    <td>{i + 1}</td>
                                    <td>{cls.name}</td>
                                    <td>{cls.session}</td>
                                    <td>
                                        <button onClick={() => navigate('classAttendance', { classId: cls._id })} className="table-action-link blue">Attendance</button>
                                        <button onClick={() => handleDeleteClass(cls._id)} className="table-action-link red">Delete</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{textAlign: 'center'}}>No classes found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h3 className="card-header">All Sessions</h3>
                <div className="table-container">
                    <table className="styled-table">
                        <thead>
                            <tr><th>Session Name</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {sessions.length > 0 ? sessions.map(session => (
                                <tr key={session._id}>
                                    <td>{session.name}</td>
                                    <td>
                                        <button onClick={() => navigate('addSession', { sessionName: session.name })} className="table-action-link blue">Edit</button>
                                        <button onClick={() => handleDeleteSession(session.name)} className="table-action-link red">Delete</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="2" style={{textAlign: 'center'}}>No sessions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AddClassPage = ({ navigate }) => {
    const [className, setClassName] = useState('');
    const [sessionName, setSessionName] = useState('');
    const [sessions, setSessions] = useState([]);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessionData = await apiRequest('/sessions');
                setSessions(sessionData);
                if (sessionData.length > 0) {
                    setSessionName(sessionData[0].name);
                }
            } catch (err) {
                 setModalInfo(err.message || { show: true, message: 'Failed to load sessions.', type: 'error' });
            }
        };
        fetchSessions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!className || !sessionName) {
            setModalInfo({ show: true, message: 'Please fill all fields.', type: 'error' });
            return;
        }
        try {
            await apiRequest('/classes', 'POST', { name: className, session: sessionName });
            setModalInfo({ show: true, message: 'Class created successfully!', type: 'success' });
            setTimeout(() => navigate('dashboard'), 2000);
        } catch (err) {
            setModalInfo({ show: true, message: err.message, type: 'error' });
        }
    };
    
    return (
        <div className="page-padding">
            {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ show: false })} />}
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a>
            <div className="card form-container">
                <h2 className="card-header">Add New Class</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="className">Class Name</label>
                        <input type="text" id="className" value={className} onChange={e => setClassName(e.target.value)} className="form-input" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="sessionName">Select Session</label>
                        <select id="sessionName" value={sessionName} onChange={e => setSessionName(e.target.value)} className="form-select" required>
                            <option value="" disabled>Select a session</option>
                            {sessions.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn form-button">Add Class</button>
                </form>
            </div>
        </div>
    );
};

const AddSessionPage = ({ navigate, sessionName: sessionToEdit }) => {
    const [sessionName, setSessionName] = useState(sessionToEdit || '');
    const [students, setStudents] = useState([{ studentId: '', name: '', status: 0 }]);
    const [existingStudents, setExistingStudents] = useState([]);
    const [bulkStudents, setBulkStudents] = useState('');
    const [activeTab, setActiveTab] = useState('basicInfo');
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    const isEditing = !!sessionToEdit;

    const loadExistingStudents = useCallback(async (name) => {
        try {
            const data = await apiRequest(`/sessions/${name}`);
            setExistingStudents(data.students || []);
        } catch (error) {
            setModalInfo(error.message || { show: true, message: 'Could not load student data.', type: 'error' });
        }
    }, []);

    useEffect(() => {
        if (isEditing) {
            setActiveTab('addStudents');
            loadExistingStudents(sessionToEdit);
        }
    }, [isEditing, sessionToEdit, loadExistingStudents]);

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/sessions', 'POST', { name: sessionName, students: [] });
            setModalInfo({ show: true, message: `Session '${sessionName}' created!`, type: 'success' });
            setActiveTab('addStudents');
        } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); }
    };

    const handleStudentChange = (index, field, value) => {
        const newStudents = [...students];
        newStudents[index][field] = value;
        setStudents(newStudents);
    };

    const addStudentRow = () => setStudents([...students, { studentId: '', name: '', status: 0 }]);
    const removeStudentRow = (index) => setStudents(students.filter((_, i) => i !== index));

    const saveStudentsData = async (studentsToSave) => {
        if (studentsToSave.length === 0) return;
        try {
            await apiRequest(`/sessions/${sessionName || sessionToEdit}/students`, 'POST', { students: studentsToSave });
            setModalInfo({ show: true, message: 'Students saved successfully!', type: 'success' });
            loadExistingStudents(sessionName || sessionToEdit);
            setStudents([{ studentId: '', name: '', status: 0 }]);
            setBulkStudents('');
        } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); }
    };
    
    const handleSaveStudents = () => saveStudentsData(students.filter(s => s.studentId && s.name));
    
    const handleProcessBulk = () => {
        const parsedStudents = bulkStudents.split('\n')
            .map(line => line.split(','))
            .filter(parts => parts.length >= 2 && parts[0].trim() && parts[1].trim())
            .map(parts => ({ studentId: parts[0].trim(), name: parts[1].trim(), status: 0 }));
        saveStudentsData(parsedStudents);
    };

    const removeExistingStudent = async (studentId) => {
        if (window.confirm(`Are you sure you want to remove student ${studentId}?`)) {
            try {
                await apiRequest(`/sessions/${sessionToEdit}/students/${studentId}`, 'DELETE');
                setModalInfo({ show: true, message: 'Student removed!', type: 'success' });
                loadExistingStudents(sessionToEdit);
            } catch (err) { err.message || setModalInfo({ show: true, message: 'Failed to remove student.', type: 'error' }); }
        }
    };
    
    const currentSession = sessionName || sessionToEdit;
    return (
        <div className="page-padding" style={{maxWidth: '56rem', margin: '0 auto'}}>
             {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ show: false })} />}
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a>
            <h2 className="page-header">{isEditing ? `Editing Session: ${sessionToEdit}` : 'Add New Session'}</h2>
            
            <nav className="tabs-nav">
                <button onClick={() => setActiveTab('basicInfo')} className={`tab-btn ${activeTab === 'basicInfo' ? 'active' : ''}`}>Basic Info</button>
                <button onClick={() => setActiveTab('addStudents')} disabled={!currentSession} className={`tab-btn ${activeTab === 'addStudents' ? 'active' : ''}`}>Add Students</button>
                <button onClick={() => setActiveTab('bulkUpload')} disabled={!currentSession} className={`tab-btn ${activeTab === 'bulkUpload' ? 'active' : ''}`}>Bulk Upload</button>
            </nav>
            
            <div className="card">
                {activeTab === 'basicInfo' && (
                     <form onSubmit={handleCreateSession}>
                        <h3 className="card-header">Session Info</h3>
                        <div className="form-group">
                            <label htmlFor="sessionName">Session Name</label>
                            <input type="text" id="sessionName" value={sessionName} onChange={e => setSessionName(e.target.value)} className="form-input" placeholder="e.g., 2026-2027" readOnly={isEditing} required />
                        </div>
                        {!isEditing && <button type="submit" className="btn form-button">Create Session</button>}
                    </form>
                )}
                {activeTab === 'addStudents' && (
                    <div>
                        <h3 className="card-header">Add Students to Session: <span style={{color: 'var(--primary-blue)'}}>{currentSession}</span></h3>
                        {students.map((student, index) => (
                            <div key={index} className="student-row">
                                <input type="text" placeholder="Student ID" value={student.studentId} onChange={e => handleStudentChange(index, 'studentId', e.target.value)} className="form-input" />
                                <input type="text" placeholder="Student Name" value={student.name} onChange={e => handleStudentChange(index, 'name', e.target.value)} className="form-input" />
                                <button onClick={() => removeStudentRow(index)} className="remove-btn">✕</button>
                            </div>
                        ))}
                        <button onClick={addStudentRow} className="btn add-student-btn">+ Add Student</button>
                        <button onClick={handleSaveStudents} className="btn form-button" style={{marginTop: '1rem'}}>Save Students</button>
                    </div>
                )}
                 {activeTab === 'bulkUpload' && (
                    <div>
                        <h3 className="card-header">Bulk Upload for: <span style={{color: 'var(--primary-blue)'}}>{currentSession}</span></h3>
                        <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem'}}>Paste CSV data (StudentID,StudentName):</p>
                        <textarea value={bulkStudents} onChange={e => setBulkStudents(e.target.value)} rows="5" className="form-textarea"></textarea>
                        <button onClick={handleProcessBulk} className="btn form-button" style={{marginTop: '1rem'}}>Process Bulk Upload</button>
                    </div>
                )}
            </div>
            
            {isEditing && (
                 <div className="card">
                    <h3 className="card-header">Current Students</h3>
                    <table className="styled-table">
                        <thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
                        <tbody>
                            {existingStudents.length > 0 ? existingStudents.map(s => (
                                <tr key={s.studentId}>
                                    <td>{s.studentId}</td><td>{s.name}</td>
                                    <td><button onClick={() => removeExistingStudent(s.studentId)} className="table-action-link red">Remove</button></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3" style={{textAlign: 'center', padding: '1rem'}}>No students in this session.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            )}
        </div>
    );
};

const ClassAttendancePage = ({ navigate, classId }) => {
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [attendanceCount, setAttendanceCount] = useState(1);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const fetchedClassData = await apiRequest(`/classes/${classId}`);
                setClassData(fetchedClassData);
                const sessionData = await apiRequest(`/sessions/${fetchedClassData.session}`);
                const studentList = sessionData.students || [];
                setStudents(studentList);
                setAttendance(studentList.reduce((acc, s) => ({ ...acc, [s.studentId]: false }), {}));
            } catch (err) {
                 setModalInfo(err.message || { show: true, message: 'Failed to load class data.', type: 'error' });
            } finally { setIsLoading(false); }
        };
        fetchData();
    }, [classId]);
    
    const handleSelectAll = () => {
        const areAllSelected = Object.values(attendance).every(Boolean);
        setAttendance(students.reduce((acc, s) => ({ ...acc, [s.studentId]: !areAllSelected }), {}));
    };

    const handleSubmit = async () => {
        const attendancePayload = {
            date,
            attdnc: attendanceCount,
            className: classData.name,
            session: classData.session,
            students: students.map(s => ({
                studentId: s.studentId, name: s.name,
                status: attendance[s.studentId] ? 1 * attendanceCount : 0
            }))
        };
        try {
            await apiRequest('/attendance', 'POST', attendancePayload);
             setModalInfo({ show: true, message: 'Attendance submitted successfully!', type: 'success' });
        } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); }
    };
    
    if (isLoading) return <div className="page-padding"><Spinner /></div>;
    if (!classData) return <div className="page-padding" style={{textAlign: 'center', color: 'red'}}>Could not load class information.</div>;
    
    const areAllSelected = Object.values(attendance).every(Boolean);

    return (
        <div className="page-padding">
            {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ show: false })} />}
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a>
            <h2 className="page-header">Attendance for {classData.name}</h2>
            <p style={{fontSize: '1.125rem', color: '#4b5563', marginBottom: '1.5rem'}}>Session: {classData.session}</p>
            
            <div className="card attendance-controls">
                 <div>
                    <label className="form-label">Date:</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
                </div>
                <div>
                    <label className="form-label">Attendance Count:</label>
                    <input type="number" min="1" value={attendanceCount} onChange={e => setAttendanceCount(Number(e.target.value))} className="form-input" />
                </div>
                <div>
                    <button onClick={handleSelectAll} className="btn btn-secondary">{areAllSelected ? 'Deselect All' : 'Select All'}</button>
                </div>
            </div>

            <div className="card">
                <table className="styled-table">
                    <thead><tr><th>#</th><th>Name</th><th>ID</th><th style={{textAlign:'center'}}>Present</th></tr></thead>
                    <tbody>
                        {students.map((s, i) => (
                            <tr key={s.studentId}>
                                <td>{i+1}</td><td>{s.name}</td><td>{s.studentId}</td>
                                <td style={{textAlign:'center'}}>
                                    <input type="checkbox" checked={!!attendance[s.studentId]} onChange={e => setAttendance({...attendance, [s.studentId]: e.target.checked})} className="attendance-checkbox"/>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={handleSubmit} className="btn form-button" style={{marginTop: '1.5rem'}}>Submit Attendance</button>
        </div>
    );
};


// --- Main App Component ---
function App() {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [page, setPage] = useState('dashboard');
    const [pageProps, setPageProps] = useState({});
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const verify = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    await apiRequest('/verify-token');
                    setAuthToken(token);
                } catch (error) {
                    alert(error.message);
                    localStorage.removeItem('authToken');
                    setAuthToken(null);
                }
            }
            setIsAuthLoading(false);
        };
        verify();
    }, []);

    const handleLogin = (token) => {
        localStorage.setItem('authToken', token);
        setAuthToken(token);
        setPage('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setAuthToken(null);
    };

    const navigate = (newPage, props = {}) => {
        setPage(newPage);
        setPageProps(props);
    };
    
    const renderPage = () => {
        switch (page) {
            case 'dashboard': return <DashboardPage navigate={navigate} onLogout={handleLogout} />;
            case 'addClass': return <AddClassPage navigate={navigate} />;
            case 'addSession': return <AddSessionPage navigate={navigate} {...pageProps} />;
            case 'classAttendance': return <ClassAttendancePage navigate={navigate} {...pageProps} />;
            default: return <DashboardPage navigate={navigate} onLogout={handleLogout} />;
        }
    };
    
    if (isAuthLoading) {
        return <div className="app-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Spinner /></div>;
    }

    return (
        <>
            <style>{`
                /* Inlined CSS for App.jsx */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                :root { --primary-blue: #3b82f6; --danger-red: #ef4444; --success-green: #22c55e; --gray-100: #f3f4f6; --gray-500: #6b7280; --gray-700: #374151; --gray-800: #1f2937; --white: #ffffff; }
                .app-container { font-family: 'Inter', sans-serif; background-color: var(--gray-100); min-height: 100vh; color: var(--gray-800); }
                .spinner-container { display: flex; justify-content: center; align-items: center; height: 100%; }
                .spinner { animation: spin 1s linear infinite; border-radius: 50%; width: 2.5rem; height: 2.5rem; border-top: 2px solid var(--primary-blue); border-bottom: 2px solid var(--primary-blue); border-left: 2px solid transparent; border-right: 2px solid transparent; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .modal-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
                .modal-content { background-color: var(--white); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); max-width: 90%; width: 24rem; text-align: center; border-top-width: 4px; }
                .modal-content.success { border-color: var(--success-green); } .modal-content.error { border-color: var(--danger-red); }
                .modal-content p { margin-bottom: 1rem; font-size: 1.125rem; }
                .modal-content button { background-color: var(--primary-blue); color: var(--white); font-weight: bold; padding: 0.5rem 1rem; border-radius: 0.375rem; border: none; cursor: pointer; }
                .modal-content button:hover { background-color: #2563eb; }
                .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #60a5fa, #a78bfa); padding: 1rem; }
                .login-container { width: 100%; max-width: 24rem; background-color: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 2rem; transition: transform 0.3s ease; }
                .login-container:hover { transform: translateY(-5px); }
                .login-header { text-align: center; margin-bottom: 2rem; } .login-header h1 { font-size: 1.875rem; font-weight: bold; color: var(--gray-800); } .login-header p { color: var(--gray-500); }
                .login-error { background-color: #fee2e2; border-left: 4px solid var(--danger-red); color: #b91c1c; padding: 1rem; margin-bottom: 1.5rem; border-radius: 0.375rem; }
                .login-form .form-group { margin-bottom: 1.5rem; }
                .login-form label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--gray-700); margin-bottom: 0.5rem; }
                .login-form input { width: 100%; padding: 0.75rem 1rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; box-shadow: inset 0 1px 2px 0 rgba(0,0,0,0.05); }
                .login-form input:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--primary-blue); }
                .login-form button { width: 100%; display: flex; justify-content: center; padding: 0.75rem 1rem; border: none; border-radius: 0.5rem; color: var(--white); background: linear-gradient(to right, #3b82f6, #6366f1); cursor: pointer; }
                .login-form button:disabled { opacity: 0.5; cursor: not-allowed; }
                .page-padding { padding: 1rem; } @media (min-width: 640px) { .page-padding { padding: 1.5rem; } } @media (min-width: 768px) { .page-padding { padding: 2rem; } }
                .page-header { font-size: 1.875rem; font-weight: bold; color: var(--gray-800); margin-bottom: 1.5rem; }
                .back-link { color: var(--primary-blue); text-decoration: none; margin-bottom: 1.5rem; display: inline-block; } .back-link:hover { text-decoration: underline; }
                .card { background-color: var(--white); border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); padding: 1.5rem; margin-bottom: 2rem; }
                .card-header { font-size: 1.25rem; font-weight: 600; color: var(--gray-700); margin-bottom: 1rem; }
                .button-group { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem; }
                .btn { padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; border: none; cursor: pointer; text-decoration: none; display: inline-block; transition: background-color 0.2s; }
                .btn-primary { background-color: #eff6ff; color: #3b82f6; } .btn-primary:hover { background-color: #dbeafe; color: #2563eb; }
                .btn-secondary { background-color: #f1f5f9; color: #1e293b; } .btn-secondary:hover { background-color: #e2e8f0; }
                .btn-danger { background-color: #fef2f2; color: #ef4444; } .btn-danger:hover { background-color: #fee2e2; color: #dc2626; }
                .btn-logout { margin-left: auto; }
                .table-container { overflow-x: auto; }
                .styled-table { width: 100%; font-size: 0.875rem; text-align: left; color: var(--gray-500); border-collapse: collapse;}
                .styled-table thead { font-size: 0.75rem; color: var(--gray-700); text-transform: uppercase; background-color: #f9fafb; }
                .styled-table th, .styled-table td { padding: 0.75rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
                .styled-table tbody tr:hover { background-color: #f9fafb; }
                .table-action-link { font-weight: 500; text-decoration: none; margin-right: 0.5rem; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; font-size: inherit; }
                .table-action-link.blue { color: var(--primary-blue); } .table-action-link.red { color: var(--danger-red); } .table-action-link:hover { text-decoration: underline; }
                .form-container { max-width: 36rem; margin: 0 auto; } .form-group { margin-bottom: 1.5rem; }
                .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--gray-700); margin-bottom: 0.5rem; }
                .form-input, .form-select, .form-textarea { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; }
                .form-button { width: 100%; background-color: var(--primary-blue); color: var(--white); } .form-button:hover { background-color: #2563eb; }
                .tabs-nav { border-bottom: 1px solid #e5e7eb; margin-bottom: 1.5rem; display: flex; gap: 2rem; }
                .tab-btn { white-space: nowrap; padding: 1rem 0.25rem; border-bottom: 2px solid transparent; font-weight: 500; font-size: 0.875rem; color: var(--gray-500); cursor: pointer; background: none; border-top: none; border-left: none; border-right: none; }
                .tab-btn:hover { color: var(--gray-700); border-color: #d1d5db; } .tab-btn.active { border-color: var(--primary-blue); color: var(--primary-blue); } .tab-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .student-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .student-row .form-input { flex: 1; }
                .remove-btn { padding: 0.5rem; background-color: var(--danger-red); color: white; border-radius: 0.25rem; border: none; cursor: pointer; }
                .add-student-btn { margin-top: 0.5rem; background-color: #e0e7ff; color: #4338ca; }
                .attendance-controls { display: grid; gap: 1.5rem; margin-bottom: 1.5rem; }
                @media (min-width: 768px) { .attendance-controls { grid-template-columns: repeat(3, 1fr); } .attendance-controls > div:last-child { display: flex; align-items: flex-end; } }
                .attendance-controls .btn { width: 100%; }
                .attendance-checkbox { height: 1.25rem; width: 1.25rem; }
            `}</style>
            <div className="app-container">
                <main>{!authToken ? <LoginPage onLogin={handleLogin} /> : renderPage()}</main>
            </div>
        </>
    );
}

export default App;

