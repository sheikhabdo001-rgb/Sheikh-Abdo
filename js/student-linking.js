window.StudentLinking = {
    currentStudent: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        const modal = document.getElementById('linkStudentModal');
        const searchInput = document.getElementById('linkStudentSearchInput');
        if (!modal || !searchInput) return;

        document.getElementById('closeLinkStudentModal')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        searchInput.addEventListener('input', () => this.renderResults(searchInput.value));
        this.initialized = true;
    },

    open(student) {
        this.init();
        this.currentStudent = student;
        const modal = document.getElementById('linkStudentModal');
        const searchInput = document.getElementById('linkStudentSearchInput');
        const label = document.getElementById('linkStudentCurrentLabel');
        if (!modal || !searchInput) return;

        const stageName = window.STUDENT_CONFIG?.stageData?.[student.stage]?.name || student.stage;
        label.textContent = `الطالب الحالي: ${student.name} - ${stageName}`;
        searchInput.value = '';
        this.renderResults('');
        modal.classList.add('active');
        setTimeout(() => searchInput.focus(), 50);
    },

    getCandidates(query = '') {
        const normalizedQuery = String(query || '').trim().toLowerCase();
        const currentId = String(this.currentStudent?.id || '');
        return (window.StudentStore?.getAllStudentsSystemWide?.() || [])
            .filter(student => String(student.id) !== currentId)
            .filter(student => !normalizedQuery || String(student.name || '').toLowerCase().includes(normalizedQuery))
            .sort((left, right) => String(left.name).localeCompare(String(right.name), 'ar'));
    },

    escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    },

    renderResults(query) {
        const container = document.getElementById('linkStudentResults');
        if (!container) return;
        const candidates = this.getCandidates(query);
        if (!candidates.length) {
            container.innerHTML = '<div class="placeholder-content"><i class="fas fa-search"></i><p>لا توجد نتائج مطابقة لاسم الطالب</p></div>';
            return;
        }

        container.innerHTML = `
            <table class="students-table link-students-table">
                <thead>
                    <tr>
                        <th>اسم الطالب</th>
                        <th>كود الطالب</th>
                        <th>المرحلة</th>
                        <th>الصف</th>
                        <th>الإجراء</th>
                    </tr>
                </thead>
                <tbody>
                    ${candidates.map(student => {
                        const stageName = window.STUDENT_CONFIG?.stageData?.[student.stage]?.name || student.stage;
                        const gradeNames = window.STUDENT_CONFIG?.gradeNames?.[student.stage] || [];
                        const gradeName = gradeNames[Number(student.grade) - 1] || 'عام';
                        const code = student.studentCode || student.code || '---';
                        return `
                            <tr>
                                <td>${this.escapeHtml(student.name)}</td>
                                <td>${this.escapeHtml(code)}</td>
                                <td>${this.escapeHtml(stageName)}</td>
                                <td>${this.escapeHtml(gradeName)}</td>
                                <td>
                                    <button type="button" class="link-now-btn" data-student-id="${this.escapeHtml(student.id)}">
                                        <i class="fas fa-link"></i> ربط الآن
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        container.querySelectorAll('.link-now-btn').forEach(button => {
            button.addEventListener('click', () => this.linkStudent(button.dataset.studentId));
        });
    },

    linkStudent(studentId) {
        const target = this.getCandidates('').find(student => String(student.id) === String(studentId));
        const current = this.currentStudent;
        if (!current || !target) return;
        if (String(current.id) === String(target.id)) return;

        const familyIds = [current.family_group_id, target.family_group_id].filter(Boolean);
        const familyGroupId = familyIds[0] || `fam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const oldFamilyIds = new Set(familyIds.map(id => String(id)));
        oldFamilyIds.add(String(familyGroupId));
        const contexts = new Map();

        (window.StudentStore?.getAllStudentsSystemWide?.() || []).forEach(student => {
            if (student.family_group_id && oldFamilyIds.has(String(student.family_group_id))) {
                const key = `${student.stage}_${student.grade}`;
                if (!contexts.has(key)) contexts.set(key, []);
            }
        });
        contexts.set(`${current.stage}_${current.grade}`, []);
        contexts.set(`${target.stage}_${target.grade}`, []);

        contexts.forEach((_, key) => {
            const separator = key.lastIndexOf('_');
            const stage = key.slice(0, separator);
            const grade = Number(key.slice(separator + 1));
            const students = window.StudentStore.getStudents(stage, grade);
            const updated = students.map(student => {
                const belongsToMergedFamily = student.family_group_id
                    && oldFamilyIds.has(String(student.family_group_id));
                const isCurrent = String(student.id) === String(current.id);
                const isTarget = String(student.id) === String(target.id);
                if (!belongsToMergedFamily && !isCurrent && !isTarget) return student;

                const relativeIds = new Set(Array.isArray(student.relativeStudentIds)
                    ? student.relativeStudentIds.map(id => String(id))
                    : []);
                if (isCurrent) relativeIds.add(String(target.id));
                if (isTarget) relativeIds.add(String(current.id));
                return {
                    ...student,
                    family_group_id: familyGroupId,
                    relativeStudentIds: Array.from(relativeIds)
                };
            });
            window.StudentStore.saveStudents(stage, grade, updated);
        });

        window.ModalManager.close('linkStudentModal');
        window.notify?.success?.(`تم ربط ${current.name} بالطالب ${target.name} كأقارب`);
        window.Students?.loadStudentsData?.();
    }
};
