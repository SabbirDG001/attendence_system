import React, { useState, useEffect, useCallback, StrictMode } from 'react';
import './App.css';
import Papa from 'papaparse';

// --- Live API Service ---
// Make sure your .env file in the frontend root has VITE_API_BASE_URL set to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://attendence-backend-dqbz.onrender.com/api';

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
        if (response.status === 204) { // No content
            return { success: true };
        }
        return response.json();
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        throw error;
    }
};


const Spinner = () => ( <div className="spinner-container"><div className="spinner"></div></div> );
const Modal = ({ message, type, onClose }) => ( <div className="modal-overlay"><div className={`modal-content ${type}`}><p>{message}</p><button onClick={onClose}>Close</button></div></div> );

const LandingPage = ({ setRole }) => (
    <div className="landing-page">
        <h1>Attendance Management System</h1>
        <div className="role-selection">
            <a href="#" onClick={() => setRole('admin')} className="role-card"><h2>Admin</h2></a>
            <a href="#" onClick={() => setRole('teacher')} className="role-card"><h2>Teacher</h2></a>
        </div>
    </div>
);

const AdminLoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault(); setIsLoading(true); setError('');
        try {
            const data = await apiRequest('/login', 'POST', { username, password });
            if (data.token) { onLogin(data.token, 'admin'); }
        } catch (err) { setError(err.message || 'Login failed.'); } 
        finally { setIsLoading(false); }
    };
    return ( <div className="auth-page"><div className="auth-container"><div className="auth-header"><h1>Admin Login</h1><p>(Use admin/password)</p></div>{error && <div className="auth-error">{error}</div>}<form onSubmit={handleSubmit} className="auth-form"><div className="form-group"><label>Username</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required /></div><div className="form-group"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div><button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner /> : 'Login'}</button></form></div></div> );
};

const PasswordStrengthMeter = ({ password }) => {
    const getStrength = () => {
        let score = 0;
        if (!password) return '';
        if (password.length > 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (score > 3) return 'very-strong';
        if (score > 2) return 'strong';
        if (score > 1) return 'medium';
        return 'weak';
    };
    return <div className={`password-strength-meter ${getStrength()}`}><div></div><div></div><div></div><div></div></div>;
};

const TeacherAuthPage = ({ onLogin }) => {
    const [mode, setMode] = useState('login');
    const [registerStep, setRegisterStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    const handleLogin = async (e) => {
        e.preventDefault(); setIsLoading(true); setError('');
        try {
            const data = await apiRequest('/teacher/login', 'POST', { email, password });
            if (data.token) { onLogin(data.token, 'teacher'); }
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    
    const handleSendOtp = async (endpoint) => {
        setIsLoading(true); setError('');
        try {
            await apiRequest(endpoint, 'POST', { email });
            setModalInfo({ show: true, message: `OTP sent to ${email}`, type: 'success' });
            setRegisterStep(2);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    
    const handleVerifyOtp = async (endpoint) => {
        setIsLoading(true); setError('');
        try {
            await apiRequest(endpoint, 'POST', { email, otp });
            setRegisterStep(3);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    
    const handleRegistration = async (e) => {
        e.preventDefault(); if (password !== confirmPassword) { setError("Passwords don't match"); return; }
        setIsLoading(true); setError('');
        try {
            const res = await apiRequest('/teacher/register/complete', 'POST', { name, email, password });
            setModalInfo({ show: true, message: res.message, type: 'success' });
            setMode('login'); setRegisterStep(1);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    
     const handleResetPassword = async (e) => {
        e.preventDefault(); if (password !== confirmPassword) { setError("Passwords don't match"); return; }
        setIsLoading(true); setError('');
        try {
            const res = await apiRequest('/teacher/reset-password', 'POST', { email, password });
            setModalInfo({ show: true, message: res.message, type: 'success' });
            setMode('login'); setRegisterStep(1);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };

    const renderContent = () => {
        if(mode === 'login') return (
            <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                <div className="auth-options"><label><input type="checkbox"/> Remember Me</label><a href="#" onClick={() => setMode('forgot')}>Forgot Password?</a></div>
                <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Login'}</button>
            </form>
        );
        if(mode === 'register') {
            if(registerStep === 1) return(
                <form onSubmit={(e) => { e.preventDefault(); handleSendOtp('/teacher/register/send-otp'); }} className="auth-form">
                    <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required /></div>
                    <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Send OTP'}</button>
                </form>
            );
             if(registerStep === 2) return(
                <form onSubmit={(e) => {e.preventDefault(); handleVerifyOtp('/teacher/register/verify-otp')}} className="auth-form">
                    <div className="form-group"><label>OTP</label><input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" required /></div>
                    <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Verify OTP'}</button>
                </form>
            );
            if(registerStep === 3) return(
                 <form onSubmit={handleRegistration} className="auth-form">
                     <div className="form-group"><label>Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required /></div>
                     <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required /><PasswordStrengthMeter password={password}/></div>
                     <div className="form-group"><label>Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required /></div>
                     <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Register'}</button>
                 </form>
            );
        }
        if(mode === 'forgot') {
             if(registerStep === 1) return(
                <form onSubmit={(e) => {e.preventDefault(); handleSendOtp('/teacher/forgot-password/send-otp')}} className="auth-form">
                    <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required /></div>
                    <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Send OTP'}</button>
                </form>
            );
             if(registerStep === 2) return(
                <form onSubmit={(e) => {e.preventDefault(); handleVerifyOtp('/teacher/forgot-password/verify-otp')}} className="auth-form">
                    <div className="form-group"><label>OTP</label><input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" required /></div>
                    <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Verify OTP'}</button>
                </form>
            );
            if(registerStep === 3) return(
                 <form onSubmit={handleResetPassword} className="auth-form">
                     <div className="form-group"><label>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create new password" required /><PasswordStrengthMeter password={password}/></div>
                     <div className="form-group"><label>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required /></div>
                     <button className="button-18" type="submit" disabled={isLoading}>{isLoading ? <Spinner/> : 'Reset Password'}</button>
                 </form>
            );
        }
    };
    
    return(
        <div className="auth-page">
            <div className="auth-container">
                 {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({show: false})} />}
                <div className="tabs-nav">
                    <button onClick={() => {setMode('login'); setRegisterStep(1);}} className={`tab-btn ${mode === 'login' ? 'active' : ''}`}>Login</button>
                    <button onClick={() => {setMode('register'); setRegisterStep(1);}} className={`tab-btn ${mode === 'register' ? 'active' : ''}`}>Register</button>
                </div>
                {error && <div className="auth-error">{error}</div>}
                {renderContent()}
            </div>
        </div>
    );
};

const AdminDashboardPage = ({ navigate, onLogout }) => {
    const [sessions, setSessions] = useState([]);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sessionData, pendingData, allData] = await Promise.all([
                apiRequest('/sessions'),
                apiRequest('/admin/teachers/pending'),
                apiRequest('/admin/teachers')
            ]);
            setSessions(sessionData);
            setPendingTeachers(pendingData);
            setAllTeachers(allData);
        } catch (err) { setModalInfo({show: true, message: err.message || 'Failed to load dashboard data.', type: 'error'});
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApprove = async (id) => { try { await apiRequest(`/admin/teachers/approve/${id}`, 'POST'); fetchData(); } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); } };
    const handleReject = async (id) => { if (window.confirm('Are you sure?')) { try { await apiRequest(`/admin/teachers/${id}`, 'DELETE'); fetchData(); } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); } } };
    const handleDeleteTeacher = async (id) => { if (window.confirm('Are you sure?')) { try { await apiRequest(`/admin/teachers/${id}`, 'DELETE'); fetchData(); } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); } } };
    const handleDeleteSession = async (name) => { if (window.confirm('Are you sure?')) { try { await apiRequest(`/sessions/${name}`, 'DELETE'); fetchData(); } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); } } };

    if (isLoading) return <div className="page-padding"><Spinner /></div>;

    return (
        <div className="page-padding">
             {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({show: false})} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h2 className="page-header">Admin Dashboard</h2>
                 <button onClick={onLogout} className="button-18" style={{backgroundColor: '#ef4444'}}>Logout</button>
            </div>

            <div className="card">
                <h3 className="card-header">Pending Teacher Approvals</h3>
                <div className="table-container">
                    <table className="styled-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                        <tbody>
                            {pendingTeachers.length > 0 ? pendingTeachers.map(t => (
                                <tr key={t._id}><td>{t.name}</td><td>{t.email}</td><td><button onClick={() => handleApprove(t._id)} className="button-small green">Approve</button><button onClick={() => handleReject(t._id)} className="button-small red">Reject</button></td></tr>
                            )) : (<tr><td colSpan="3" style={{textAlign: 'center'}}>No pending approvals.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h3 className="card-header">Manage Sessions</h3>
                <button onClick={() => navigate('manageSessions')} className="button-18" style={{marginBottom: '1rem'}}>Add New Session</button>
                <div className="table-container">
                     <table className="styled-table">
                        <thead><tr><th>Session Name</th><th>Actions</th></tr></thead>
                        <tbody>
                            {sessions.length > 0 ? sessions.map(session => (
                                <tr key={session._id}><td>{session.name}</td><td><button onClick={() => navigate('manageSessions', { sessionName: session.name })} className="button-small blue">Update</button><button onClick={() => handleDeleteSession(session.name)} className="button-small red">Delete</button></td></tr>
                            )) : (<tr><td colSpan="2" style={{textAlign: 'center'}}>No sessions found.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h3 className="card-header">Manage All Teachers</h3>
                <div className="table-container">
                    <table className="styled-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {allTeachers.length > 0 ? allTeachers.map(t => (
                                <tr key={t._id}><td>{t.name}</td><td>{t.email}</td><td>{t.status}</td><td><button onClick={() => handleDeleteTeacher(t._id)} className="button-small red">Remove</button></td></tr>
                            )) : (<tr><td colSpan="4" style={{textAlign: 'center'}}>No teachers found.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TeacherDashboardPage = ({ navigate, onLogout }) => {
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const classData = await apiRequest('/classes'); setClasses(classData);
        } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteClass = async (id) => {
        if(window.confirm('Are you sure you want to delete this class?')) {
             try {
                await apiRequest(`/classes/${id}`, 'DELETE');
                fetchData();
            } catch (err) { setModalInfo({show: true, message: err.message, type: 'error'}); }
        }
    };

    return ( <div className="page-padding"> {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({show: false})} />}<h2 className="page-header">Teacher Dashboard</h2><div className="button-group"><button onClick={() => navigate('addClass')} className="button-18">Add New Class</button><button onClick={onLogout} className="button-18" style={{backgroundColor: '#ef4444'}}>Logout</button></div><div className="card"><h3 className="card-header">My Classes</h3><div className="table-container"><table className="styled-table"><thead><tr><th>Class Name</th><th>Session</th><th>Actions</th></tr></thead><tbody>{classes.length > 0 ? classes.map((cls) => (<tr key={cls._id}><td>{cls.name}</td><td>{cls.session}</td><td><button onClick={() => navigate('classAttendance', { classId: cls._id })} className="button-small blue">Attendance</button><button onClick={() => navigate('attendanceReport', { classId: cls._id })} className="button-small green">View Report</button><button onClick={() => navigate('bulkUpload', { classId: cls._id, uploadType: 'CT' })} className="button-small orange">Upload CT</button><button onClick={() => navigate('bulkUpload', { classId: cls._id, uploadType: 'Attendance' })} className="button-small purple">Upload Attendance</button><button onClick={() => navigate('bulkUpload', { classId: cls._id, uploadType: 'Lab Quiz' })} className="button-small orange">Upload Lab</button><button onClick={() => handleDeleteClass(cls._id)} className="button-small red">Remove</button></td></tr>)) : (<tr><td colSpan="3" style={{ textAlign: 'center' }}>No classes found.</td></tr>)}</tbody></table></div></div></div> );
};

const AddClassPage = ({ navigate }) => {
    const [className, setClassName] = useState('');
    const [sessionName, setSessionName] = useState('');
    const [sessions, setSessions] = useState([]);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });
    
    useEffect(() => {
        apiRequest('/sessions').then(data => {
            setSessions(data);
            if(data.length > 0) setSessionName(data[0].name);
        }).catch(err => setModalInfo({ show: true, message: err.message, type: 'error'}));
    }, []);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/classes', 'POST', { name: className, session: sessionName });
            setModalInfo({ show: true, message: 'Class created!', type: 'success'});
            setTimeout(() => navigate('dashboard'), 1500);
        } catch(err) { setModalInfo({ show: true, message: err.message, type: 'error'}); }
    };

    return ( 
        <div className="page-padding">{modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({show:false})} />}
            <a href="#" onClick={(e)=>{e.preventDefault(); navigate('dashboard')}} className="back-link">← Back to Dashboard</a>
            <div className="card form-container">
                <h2 className="card-header">Add New Class</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Class Name</label>
                        <div className="input-group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a.5.5 0 0 1 .5-.5h8.793a.5.5 0 0 1 .353.146l2.854 2.854a.5.5 0 0 1 .146.353V14a.5.5 0 0 1-.5.5H2.5A.5.5 0 0 1 2 14V2zm10.5 1.5L10 1H2.5v13h10V3.5zM7 9a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1zm0 3a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1zM4 5.5a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1zm0 3a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1zm0 3a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1z"/></svg>
                            <input className="form-input" type="text" value={className} onChange={e=>setClassName(e.target.value)} required/>
                        </div>
                    </div>
                    <div className="form-group"><label>Session</label><select value={sessionName} onChange={e=>setSessionName(e.target.value)} className="form-select" required>{sessions.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}</select></div>
                    <button type="submit" className="button-18">Create Class</button>
                </form>
            </div>
        </div> 
    );
};

const AddSessionPage = ({ navigate, sessionName: sessionToEdit }) => {
    const [sessionName, setSessionName] = useState(sessionToEdit || '');
    const [students, setStudents] = useState([{ studentId: '', name: ''}]);
    const [existingStudents, setExistingStudents] = useState([]);
    const [bulkStudents, setBulkStudents] = useState('');
    const [activeTab, setActiveTab] = useState('basicInfo');
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });
    const isEditing = !!sessionToEdit;
    const loadExistingStudents = useCallback(async (name) => {
        try {
            const data = await apiRequest(`/sessions/${name}`);
            setExistingStudents(data.students || []);
        } catch (error) { setModalInfo({ show: true, message: error.message, type: 'error' }); }
    }, []);
    useEffect(() => { if (isEditing) { setActiveTab('addStudents'); loadExistingStudents(sessionToEdit); } }, [isEditing, sessionToEdit, loadExistingStudents]);
    const handleCreateSession = async (e) => { e.preventDefault(); try { await apiRequest('/sessions', 'POST', { name: sessionName, students: [] }); setModalInfo({ show: true, message: `Session '${sessionName}' created!`, type: 'success' }); setActiveTab('addStudents'); } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); } };
    const handleStudentChange = (index, field, value) => { const newStudents = [...students]; newStudents[index][field] = value; setStudents(newStudents); };
    const addStudentRow = () => setStudents([...students, { studentId: '', name: '' }]);
    const removeStudentRow = (index) => setStudents(students.filter((_, i) => i !== index));
    const saveStudentsData = async (studentsToSave) => {
        if (studentsToSave.length === 0) return;
        try {
            await apiRequest(`/sessions/${sessionName || sessionToEdit}/students`, 'POST', { students: studentsToSave });
            setModalInfo({ show: true, message: 'Students saved successfully!', type: 'success' });
            loadExistingStudents(sessionName || sessionToEdit);
            setStudents([{ studentId: '', name: ''}]);
            setBulkStudents('');
        } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); }
    };
    const handleSaveStudents = () => saveStudentsData(students.filter(s => s.studentId && s.name));
    const handleProcessBulk = () => { const parsedStudents = bulkStudents.split('\n').map(line => line.split(',')).filter(parts => parts.length >= 2 && parts[0].trim() && parts[1].trim()).map(parts => ({ studentId: parts[0].trim(), name: parts[1].trim() })); saveStudentsData(parsedStudents); };
    const removeExistingStudent = async (studentId) => { if (window.confirm(`Are you sure?`)) { try { await apiRequest(`/sessions/${sessionToEdit}/students/${studentId}`, 'DELETE'); setModalInfo({ show: true, message: 'Student removed!', type: 'success' }); loadExistingStudents(sessionToEdit); } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); } } };
    const currentSession = sessionName || sessionToEdit;
    return ( <div className="page-padding" style={{ maxWidth: '56rem', margin: '0 auto' }}>{modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ show: false })} />}<a href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a><h2 className="page-header">{isEditing ? `Editing Session: ${sessionToEdit}` : 'Add New Session'}</h2><nav className="tabs-nav"><button onClick={() => setActiveTab('basicInfo')} className={`tab-btn ${activeTab === 'basicInfo' ? 'active' : ''}`}>Basic Info</button><button onClick={() => setActiveTab('addStudents')} disabled={!currentSession} className={`tab-btn ${activeTab === 'addStudents' ? 'active' : ''}`}>Add Students</button><button onClick={() => setActiveTab('bulkUpload')} disabled={!currentSession} className={`tab-btn ${activeTab === 'bulkUpload' ? 'active' : ''}`}>Bulk Upload</button></nav><div className="card">{activeTab === 'basicInfo' && (<form onSubmit={handleCreateSession}><h3 className="card-header">Session Info</h3><div className="form-group"><label htmlFor="sessionName">Session Name</label><input type="text" id="sessionName" value={sessionName} onChange={e => setSessionName(e.target.value)} className="form-input" placeholder="e.g., 2026-2027" readOnly={isEditing} required /></div>{!isEditing && <button type="submit" className="button-18">Create Session</button>}</form>)}{activeTab === 'addStudents' && (<div><h3 className="card-header">Add Students to Session: <span style={{ color: 'var(--primary-blue)' }}>{currentSession}</span></h3>{students.map((student, index) => (<div key={index} className="student-row"><input type="text" placeholder="Student ID" value={student.studentId} onChange={e => handleStudentChange(index, 'studentId', e.target.value)} className="form-input" /><input type="text" placeholder="Student Name" value={student.name} onChange={e => handleStudentChange(index, 'name', e.target.value)} className="form-input" /><button onClick={() => removeStudentRow(index)} className="remove-btn">✕</button></div>))}<button onClick={addStudentRow} className="button-18" style={{backgroundColor: '#e0e7ff', color: '#4338ca', marginTop: '1rem'}}>+ Add Student</button><button onClick={handleSaveStudents} className="button-18" style={{ marginTop: '1rem' }}>Save Students</button></div>)}{activeTab === 'bulkUpload' && (<div><h3 className="card-header">Bulk Upload for: <span style={{ color: 'var(--primary-blue)' }}>{currentSession}</span></h3><p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Paste CSV data (StudentID,StudentName):</p><textarea value={bulkStudents} onChange={e => setBulkStudents(e.target.value)} rows="5" className="form-textarea"></textarea><button onClick={handleProcessBulk} className="button-18" style={{ marginTop: '1rem' }}>Process Bulk Upload</button></div>)}</div>{isEditing && (<div className="card"><h3 className="card-header">Current Students</h3><table className="styled-table"><thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead><tbody>{existingStudents.length > 0 ? existingStudents.map(s => (<tr key={s.studentId}><td>{s.studentId}</td><td>{s.name}</td><td><button onClick={() => removeExistingStudent(s.studentId)} className="button-small red">Remove</button></td></tr>)) : (<tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>No students in this session.</td></tr>)}</tbody></table></div>)}</div> );
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
                setModalInfo({ show: true, message: err.message || 'Failed to load class data.', type: 'error' });
            } finally { setIsLoading(false); }
        };
        fetchData();
    }, [classId]);

    const handleSelectAll = () => { const areAllSelected = Object.values(attendance).every(Boolean); setAttendance(students.reduce((acc, s) => ({ ...acc, [s.studentId]: !areAllSelected }), {})); };
    const handleReset = () => { setAttendance(students.reduce((acc, s) => ({ ...acc, [s.studentId]: false }), {})); };
    const handleRowClick = (studentId) => { setAttendance(prev => ({...prev, [studentId]: !prev[studentId]})); };

    const handleSubmit = async () => {
        const attendancePayload = { date, attdnc: attendanceCount, className: classData.name, session: classData.session, students: students.map(s => ({ studentId: s.studentId, name: s.name, status: attendance[s.studentId] ? Number(attendanceCount) : 0 })) };
        try {
            await apiRequest('/attendance', 'POST', attendancePayload);
            setModalInfo({ show: true, message: 'Attendance submitted successfully!', type: 'success' });
        } catch (err) { setModalInfo({ show: true, message: err.message, type: 'error' }); }
    };

    if (isLoading) return <div className="page-padding"><Spinner /></div>;
    if (!classData) return <div className="page-padding" style={{ textAlign: 'center', color: 'red' }}>Could not load class information.</div>;
    
    const areAllSelected = Object.values(attendance).every(Boolean);
    
    return ( <div className="page-padding">{modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ show: false })} />}<a href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a><h2 className="page-header">Attendance for {classData.name}</h2><p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '1.5rem' }}>Session: {classData.session}</p><div className="card attendance-controls"><div><label className="form-label">Date:</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" /></div><div><label className="form-label">Attendance Count:</label><input type="number" min="1" value={attendanceCount} onChange={e => setAttendanceCount(e.target.value)} className="form-input" /></div><div><button onClick={handleSelectAll} className="button-18"> { areAllSelected ? 'Deselect All' : 'Select All' } </button></div><div><button onClick={handleReset} className="button-18" style={{backgroundColor: '#6b7280'}}>Reset</button></div></div><div className="card"><table className="styled-table"><thead><tr><th>#</th><th>Name</th><th>ID</th><th style={{ textAlign: 'center' }}>Present</th></tr></thead><tbody>{students.map((s, i) => (<tr key={s.studentId} className="clickable" onClick={() => handleRowClick(s.studentId)}><td>{i + 1}</td><td>{s.name}</td><td>{s.studentId}</td><td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!attendance[s.studentId]} readOnly className="attendance-checkbox"/></td></tr>))}</tbody></table></div><button onClick={handleSubmit} className="button-18" style={{ marginTop: '1.5rem' }}>Submit Attendance</button></div> );
};

// Replace the existing AttendanceReportPage component with this one
const AttendanceReportPage = ({ navigate, classId }) => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setIsLoading(true);
        setError('');
        apiRequest(`/classes/${classId}/comprehensive-report`)
            .then(data => setReportData(data))
            .catch(err => setError(err.message || "Failed to generate report."))
            .finally(() => setIsLoading(false));
    }, [classId]);

    if (isLoading) return <div className="page-padding"><Spinner /></div>;
    if (error) return <div className="page-padding" style={{ color: 'red' }}>{error}</div>;
    if (!reportData) return <div className="page-padding">No report data available.</div>;

    const { classInfo, students, attendance, assessments } = reportData;
    const ctAssessments = assessments.filter(a => a.type === 'CT');
    const labAssessments = assessments.filter(a => a.type === 'Lab Quiz');

    const totalPossibleAttendance = attendance.dates.reduce((sum, day) => sum + (day.attdnc || 0), 0);

    return (
        <div className="page-padding">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a>
            <h2 className="page-header">Comprehensive Report for {classInfo.name}</h2>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '1.5rem' }}>Session: {classInfo.session}</p>
            
            {/* Attendance Section */}
            <div className="card">
                <h3 className="card-header">Attendance Report</h3>
                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>ID</th><th>Name</th>
                                {attendance.dates.map(d => <th key={d.date}>{new Date(d.date + 'T00:00:00').toLocaleDateString()} ({d.attdnc})</th>)}
                                <th>Total</th><th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
                                const attendanceRecord = attendance.records.find(r => r.studentId === student.studentId) || {};
                                const totalPresent = attendance.dates.reduce((sum, d) => sum + (attendanceRecord[d.date] || 0), 0);
                                const percentage = totalPossibleAttendance > 0 ? (totalPresent / totalPossibleAttendance * 100).toFixed(2) : 0;
                                return (
                                <tr key={student.studentId}>
                                    <td>{student.studentId}</td><td>{student.name}</td>
                                    {attendance.dates.map(d => <td key={d.date} className={attendanceRecord[d.date] > 0 ? 'present' : 'absent'}>{attendanceRecord[d.date] || 0}</td>)}
                                    <td>{totalPresent}</td><td>{percentage}%</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CT Marks Section */}
            {ctAssessments.length > 0 && (
                 <div className="card">
                    <h3 className="card-header">Class Test (CT) Marks</h3>
                    <div className="report-table-container">
                         <table className="report-table">
                            <thead><tr><th>ID</th><th>Name</th>
                                {ctAssessments.map(a => <th key={a.name}>{a.name} ({a.totalMarks})</th>)}
                            </tr></thead>
                             <tbody>
                                {students.map(student => (
                                <tr key={student.studentId}><td>{student.studentId}</td><td>{student.name}</td>
                                    {ctAssessments.map(a => {
                                        const markRecord = a.records.find(r => r.studentId === student.studentId);
                                        return <td key={a.name}>{markRecord ? markRecord.mark : 'N/A'}</td>;
                                    })}
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}
            
            {/* Lab Quiz Marks Section */}
            {labAssessments.length > 0 && (
                 <div className="card">
                    <h3 className="card-header">Lab Quiz Marks</h3>
                    <div className="report-table-container">
                         <table className="report-table">
                             <thead><tr><th>ID</th><th>Name</th>
                                {labAssessments.map(a => <th key={a.name}>{a.name} ({a.totalMarks})</th>)}
                            </tr></thead>
                             <tbody>
                                {students.map(student => (
                                <tr key={student.studentId}><td>{student.studentId}</td><td>{student.name}</td>
                                    {labAssessments.map(a => {
                                        const markRecord = a.records.find(r => r.studentId === student.studentId);
                                        return <td key={a.name}>{markRecord ? markRecord.mark : 'N/A'}</td>;
                                    })}
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}

        </div>
    );
};
 
// Replace the existing BulkUploadPage component with this one
const BulkUploadPage = ({ navigate, classId, uploadType }) => {
    const [classData, setClassData] = useState(null);
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        setIsLoading(true);
        apiRequest(`/classes/${classId}`)
            .then(data => setClassData(data))
            .catch(err => setModalInfo({show: true, message: err.message, type: 'error'}))
            .finally(() => setIsLoading(false));
    }, [classId]);

    const handleFileChange = (e) => {
        if (e.target.files.length) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleUpload = () => {
        if (!file) {
            setModalInfo({ show: true, message: 'Please select a file first.', type: 'error' });
            return;
        }

        const assessmentName = prompt(`Enter a name for this upload (e.g., CT-1, Midterm Lab):`);
        if (!assessmentName) return;

        const totalMarks = prompt(`Enter the total marks for this assessment:`);
        if (!totalMarks || isNaN(totalMarks)) {
            setModalInfo({ show: true, message: 'Invalid total marks.', type: 'error' });
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const marks = results.data.map(row => ({
                    studentId: row.studentId,
                    studentName: row.studentName,
                    mark: parseFloat(row.mark)
                })).filter(item => item.studentId && item.studentName && !isNaN(item.mark));

                const payload = {
                    assessmentType: uploadType,
                    assessmentName,
                    date: new Date().toISOString().slice(0, 10),
                    totalMarks: parseFloat(totalMarks),
                    marks
                };

                try {
                    await apiRequest(`/classes/${classId}/marks`, 'POST', payload);
                    setModalInfo({ show: true, message: `${uploadType} data uploaded successfully!`, type: 'success' });
                } catch (err) {
                    setModalInfo({ show: true, message: err.message, type: 'error' });
                }
            }
        });
    };
    
    if (isLoading) return <div className="page-padding"><Spinner/></div>;

    return(
        <div className="page-padding">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }} className="back-link">← Back to Dashboard</a>
            <div className="card form-container">
                <h2 className="card-header">Bulk Upload {uploadType}</h2>
                {classData && <p style={{marginBottom: '1rem'}}>For class: <strong>{classData.name} ({classData.session})</strong></p>}
                <div className="form-group">
                    <label>Upload .csv File</label>
                    <p style={{fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0'}}>CSV must have columns: <strong>studentId, studentName, mark</strong></p>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="form-input"/>
                </div>
                <button onClick={handleUpload} className="button-18">Upload Data</button>
            </div>
             {modalInfo.show && <Modal message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({show: false})} />}
        </div>
    );
};

function App() {
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [page, setPage] = useState(userRole ? 'dashboard' : 'landing');
    const [pageProps, setPageProps] = useState({});
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const token = localStorage.getItem('authToken');
        if (token && role) {
            apiRequest('/verify-token').then(() => {
                setUserRole(role);
                setAuthToken(token);
            }).catch(() => {
                handleLogout();
            }).finally(() => setIsAuthLoading(false));
        } else {
            setIsAuthLoading(false);
        }
    }, []);

    const handleLogin = (token, role) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', role);
        setAuthToken(token);
        setUserRole(role);
        setPage('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        setAuthToken(null);
        setUserRole(null);
        setPage('landing');
    };

    const navigate = (newPage, props = {}) => {
        setPage(newPage);
        setPageProps(props);
    };

    const renderContent = () => {
        if (isAuthLoading) {
            return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><Spinner /></div>;
        }

        if (!userRole) {
             return <LandingPage setRole={(role) => { setUserRole(role); setPage('auth'); }} />;
        }
        
        if (userRole && !authToken) {
            if (userRole === 'admin') return <AdminLoginPage onLogin={handleLogin} />;
            if (userRole === 'teacher') return <TeacherAuthPage onLogin={handleLogin} />;
        }

        if (userRole === 'admin' && authToken) {
            switch (page) {
                case 'dashboard': return <AdminDashboardPage navigate={navigate} onLogout={handleLogout} />;
                case 'manageSessions': return <AddSessionPage navigate={navigate} {...pageProps} />;
                default: return <AdminDashboardPage navigate={navigate} onLogout={handleLogout} />;
            }
        }
        
        if (userRole === 'teacher' && authToken) {
            switch (page) {
                case 'dashboard': return <TeacherDashboardPage navigate={navigate} onLogout={handleLogout} />;
                case 'addClass': return <AddClassPage navigate={navigate} />;
                case 'classAttendance': return <ClassAttendancePage navigate={navigate} {...pageProps} />;
                case 'attendanceReport': return <AttendanceReportPage navigate={navigate} {...pageProps} />;
                case 'bulkUpload': return <BulkUploadPage navigate={navigate} {...pageProps} />;
                default: return <TeacherDashboardPage navigate={navigate} onLogout={handleLogout} />;
            }
        }
        
         return <LandingPage setRole={(role) => { setUserRole(role); setPage('auth'); }} />;
    };
    
    return ( <div className="app-container"><main>{renderContent()}</main></div> );
}

export default App;