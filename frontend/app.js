import { createClient } from '@supabase/supabase-js';

// --- Supabase API Service ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class DataService {
    static async getStats() {
        const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: totalGrades } = await supabase.from('grades').select('*', { count: 'exact', head: true });
        const { count: totalAttendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
        
        return {
            totalStudents: totalStudents || 0,
            totalGrades: totalGrades || 0,
            totalAttendance: totalAttendance || 0
        };
    }

    static async getStudents() {
        const { data, error } = await supabase.from('students').select('*').order('id', { ascending: false });
        if (error) { console.error(error); return []; }
        return data;
    }

    static async addStudent(student) {
        const enrollmentDate = new Date().toISOString().split('T')[0];
        const newStudent = { ...student, enrollmentDate };
        const { data, error } = await supabase.from('students').insert([newStudent]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }

    static async deleteStudent(id) {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { deleted: 1 };
    }

    static async getStudent(id) {
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error) { console.error(error); return null; }
        return data;
    }

    static async getGrades(studentId) {
        const { data, error } = await supabase.from('grades').select('*').eq('studentId', studentId).order('id', { ascending: false });
        if (error) { console.error(error); return []; }
        return data;
    }

    static async getAttendance(studentId) {
        const { data, error } = await supabase.from('attendance').select('*').eq('studentId', studentId).order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return data;
    }

    static async addGrade(studentId, gradeData) {
        const newGrade = { ...gradeData, studentId: parseInt(studentId) };
        const { data, error } = await supabase.from('grades').insert([newGrade]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }

    static async addAttendance(studentId, attendanceData) {
        const newAttendance = { ...attendanceData, studentId: parseInt(studentId) };
        const { data, error } = await supabase.from('attendance').insert([newAttendance]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
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

        document.getElementById('btn-export-csv').addEventListener('click', async () => {
            const students = await DataService.getStudents();
            let csvContent = "data:text/csv;charset=utf-8,ID,First Name,Last Name,Email,Course,Enrollment Date\n";
            students.forEach(s => {
                csvContent += `${s.id},${s.firstName},${s.lastName},${s.email},${s.course},${s.enrollmentDate}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "students_roster.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            UI.showToast('CSV Exported Successfully!', 'success');
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
        document.getElementById('btn-print-report').addEventListener('click', () => window.print());

        document.getElementById('btn-add-grade').addEventListener('click', () => {
            document.getElementById('grade-student-id').value = id;
            document.getElementById('add-grade-modal').classList.add('active');
        });

        document.getElementById('btn-add-attendance').addEventListener('click', () => {
            document.getElementById('attendance-student-id').value = id;
            document.getElementById('add-attendance-modal').classList.add('active');
        });

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
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
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

        document.getElementById('add-grade-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('grade-student-id').value;
            const gradeData = {
                subject: document.getElementById('subject').value,
                grade: document.getElementById('grade').value,
                semester: document.getElementById('semester').value
            };
            await DataService.addGrade(studentId, gradeData);
            document.getElementById('add-grade-form').reset();
            document.getElementById('add-grade-modal').classList.remove('active');
            UI.showToast('Grade recorded successfully!');
            UI.renderStudentDetail(parseInt(studentId));
        });

        document.getElementById('add-attendance-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('attendance-student-id').value;
            const attendanceData = {
                date: document.getElementById('date').value,
                status: document.getElementById('status').value
            };
            await DataService.addAttendance(studentId, attendanceData);
            document.getElementById('add-attendance-form').reset();
            document.getElementById('add-attendance-modal').classList.remove('active');
            UI.showToast('Attendance recorded successfully!');
            UI.renderStudentDetail(parseInt(studentId));
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
