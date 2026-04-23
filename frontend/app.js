// --- API Service (with LocalStorage fallback) ---
const API_URL = 'http://localhost:5000/api';

class DataService {
    static async getStats() {
        try {
            const res = await fetch(`${API_URL}/stats`);
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            // Fallback to local storage
            const students = JSON.parse(localStorage.getItem('students') || '[]');
            const grades = JSON.parse(localStorage.getItem('grades') || '[]');
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            return {
                totalStudents: students.length,
                totalGrades: grades.length,
                totalAttendance: attendance.length
            };
        }
    }

    static async getStudents() {
        try {
            const res = await fetch(`${API_URL}/students`);
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            return JSON.parse(localStorage.getItem('students') || '[]');
        }
    }

    static async addStudent(student) {
        try {
            const res = await fetch(`${API_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(student)
            });
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            const students = JSON.parse(localStorage.getItem('students') || '[]');
            const newStudent = { 
                ...student, 
                id: Date.now(), 
                enrollmentDate: new Date().toISOString().split('T')[0] 
            };
            students.push(newStudent);
            localStorage.setItem('students', JSON.stringify(students));
            return newStudent;
        }
    }

    static async deleteStudent(id) {
        try {
            const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            let students = JSON.parse(localStorage.getItem('students') || '[]');
            students = students.filter(s => s.id !== id);
            localStorage.setItem('students', JSON.stringify(students));
            return { deleted: 1 };
        }
    }

    static async getStudent(id) {
        try {
            const res = await fetch(`${API_URL}/students/${id}`);
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            const students = JSON.parse(localStorage.getItem('students') || '[]');
            return students.find(s => s.id === id);
        }
    }

    static async getGrades(studentId) {
        try {
            const res = await fetch(`${API_URL}/students/${studentId}/grades`);
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            const grades = JSON.parse(localStorage.getItem('grades') || '[]');
            return grades.filter(g => g.studentId === studentId);
        }
    }

    static async getAttendance(studentId) {
        try {
            const res = await fetch(`${API_URL}/students/${studentId}/attendance`);
            if (!res.ok) throw new Error('API down');
            return await res.json();
        } catch (error) {
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            return attendance.filter(a => a.studentId === studentId);
        }
    }
}

// --- UI Manager ---
const UI = {
    contentArea: document.getElementById('content-area'),
    pageTitle: document.getElementById('page-title'),
    
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    async renderDashboard() {
        this.pageTitle.textContent = 'Dashboard';
        const template = document.getElementById('view-dashboard');
        this.contentArea.innerHTML = '';
        this.contentArea.appendChild(template.content.cloneNode(true));

        // Load stats
        const stats = await DataService.getStats();
        document.getElementById('stat-students').textContent = stats.totalStudents;
        document.getElementById('stat-grades').textContent = stats.totalGrades;
        document.getElementById('stat-attendance').textContent = stats.totalAttendance;
    },

    async renderStudents() {
        this.pageTitle.textContent = 'Students';
        const template = document.getElementById('view-students');
        this.contentArea.innerHTML = '';
        this.contentArea.appendChild(template.content.cloneNode(true));

        // Event Listeners
        document.getElementById('btn-add-student').addEventListener('click', () => {
            document.getElementById('add-student-modal').classList.add('active');
        });

        await this.loadStudentsTable();
    },

    async loadStudentsTable() {
        const students = await DataService.getStudents();
        const tbody = document.getElementById('students-table-body');
        tbody.innerHTML = '';

        students.forEach(student => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${student.id}</td>
                <td>${student.firstName} ${student.lastName}</td>
                <td>${student.email}</td>
                <td>${student.course}</td>
                <td>${student.enrollmentDate}</td>
                <td>
                    <button class="action-btn view" onclick="app.viewStudent(${student.id})" title="View Details"><i class="ri-eye-line"></i></button>
                    <button class="action-btn delete" onclick="app.deleteStudent(${student.id})" title="Delete"><i class="ri-delete-bin-line"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    async renderStudentDetail(id) {
        this.pageTitle.textContent = 'Student Details';
        const template = document.getElementById('view-student-detail');
        this.contentArea.innerHTML = '';
        this.contentArea.appendChild(template.content.cloneNode(true));

        const student = await DataService.getStudent(id);
        if (!student) return this.showToast('Student not found', 'error');

        document.getElementById('detail-name').textContent = `${student.firstName} ${student.lastName}`;
        document.getElementById('detail-email').textContent = student.email;
        document.getElementById('detail-course').textContent = student.course;

        document.getElementById('btn-back').addEventListener('click', () => app.navigate('students'));

        // Load records
        const grades = await DataService.getGrades(id);
        const attendance = await DataService.getAttendance(id);

        const gradesList = document.getElementById('grades-list');
        grades.forEach(g => {
            gradesList.innerHTML += `<li class="record-item"><span class="subject">${g.subject} (${g.semester})</span><span class="value">Grade: ${g.grade}</span></li>`;
        });
        if(grades.length === 0) gradesList.innerHTML = '<p style="color:var(--text-muted); font-size:0.875rem;">No grades recorded.</p>';

        const attendanceList = document.getElementById('attendance-list');
        attendance.forEach(a => {
            attendanceList.innerHTML += `<li class="record-item"><span class="subject">${a.date}</span><span class="value">${a.status}</span></li>`;
        });
        if(attendance.length === 0) attendanceList.innerHTML = '<p style="color:var(--text-muted); font-size:0.875rem;">No attendance recorded.</p>';
    }
};

// --- App Controller ---
const app = {
    init() {
        this.bindEvents();
        this.navigate('dashboard');
        
        // Setup modal close
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('add-student-modal').classList.remove('active');
        });
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.navigate(e.currentTarget.dataset.view);
            });
        });

        // Forms
        document.getElementById('add-student-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const student = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                course: document.getElementById('course').value,
            };
            await DataService.addStudent(student);
            document.getElementById('add-student-form').reset();
            document.getElementById('add-student-modal').classList.remove('active');
            UI.showToast('Student registered successfully!');
            
            // Reload table if we are on the students view
            if(document.getElementById('students-table-body')) {
                UI.loadStudentsTable();
            }
        });
    },

    navigate(view, param = null) {
        if (view === 'dashboard') UI.renderDashboard();
        else if (view === 'students') UI.renderStudents();
        else if (view === 'student-detail') UI.renderStudentDetail(param);
    },

    async deleteStudent(id) {
        if (confirm('Are you sure you want to delete this student?')) {
            await DataService.deleteStudent(id);
            UI.showToast('Student deleted');
            UI.loadStudentsTable();
        }
    },

    viewStudent(id) {
        this.navigate('student-detail', id);
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => app.init());
