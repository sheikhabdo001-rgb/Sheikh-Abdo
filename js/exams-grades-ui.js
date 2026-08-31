window.ExamsGradesUI = {
    escapeAttribute(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character]));
    },

    getViewingNowLabel(activeExamIdx = window.ExamsUI?.activeExamIdx, examColumns = window.ExamsUI?.examColumns || []) {
        if (activeExamIdx === 'all' || activeExamIdx === undefined || activeExamIdx === null) {
            return 'العرض الآن لـ: جميع الامتحانات والصف الكلي';
        }

        const exam = examColumns[activeExamIdx];
        const examName = typeof exam === 'string'
            ? exam
            : exam?.name || `امتحان ${Number(activeExamIdx) + 1}`;
        const termLabel = window.ExamsUI?.currentTerm === 2 ? 'الترم الثاني' : 'الترم الأول';
        const hasTermInName = /الترم|ترم/.test(examName);
        return `العرض الآن لـ: ${examName}${hasTermInName ? '' : ` - ${termLabel}`}`;
    },

    getStudentSearchHTML() {
        return `
            <div class="search-box-container exam-student-search-box">
                <label class="exam-search-label" for="studentSearchInput">
                    <i class="fas fa-search" aria-hidden="true"></i>
                    بحث في الطلاب
                </label>
                <input type="search"
                       id="studentSearchInput"
                       class="form-control-custom"
                       autocomplete="off"
                       placeholder="🔍 ابحث باسم الطالب أو كود الطالب فقط..."
                       aria-label="ابحث باسم الطالب أو كود الطالب فقط">
            </div>`;
    },

    bindStudentSearch(container) {
        const input = container.querySelector('#studentSearchInput');
        if (!input) return;

        const applySearch = () => {
            const query = input.value.trim().toLowerCase();
            if (window.ExamsUI) window.ExamsUI.studentSearchQuery = input.value;

            const rows = Array.from(container.querySelectorAll('tbody tr.exam-grade-row'));
            let visibleCount = 0;
            rows.forEach(row => {
                // Exam Student Search Listener (Strictly Name & Code)
                const studentName = row.dataset.studentName
                    || row.querySelector('.student-name-cell, .col-student-name')?.textContent
                    || '';
                const studentCode = row.dataset.studentCode
                    || row.querySelector('.student-code-cell')?.textContent
                    || '';
                const matches = studentName.toLowerCase().includes(query)
                    || studentCode.toLowerCase().includes(query);
                row.style.display = matches ? '' : 'none';
                if (matches) visibleCount += 1;
            });

            const emptyRow = container.querySelector('tbody tr.exam-empty-filter-row');
            if (emptyRow && query) {
                const cell = emptyRow.querySelector('td');
                if (cell) cell.textContent = visibleCount
                    ? 'لا توجد نتائج لهذا التصنيف'
                    : 'لا توجد نتائج مطابقة للبحث';
            }

            let searchEmptyRow = container.querySelector('tbody tr.exam-search-empty-row');
            if (rows.length && !visibleCount && query) {
                if (!searchEmptyRow) {
                    searchEmptyRow = document.createElement('tr');
                    searchEmptyRow.className = 'exam-search-empty-row';
                    searchEmptyRow.innerHTML = `<td colspan="${container.querySelectorAll('thead th').length}">لا توجد نتائج مطابقة للبحث</td>`;
                    container.querySelector('tbody')?.appendChild(searchEmptyRow);
                }
                searchEmptyRow.style.display = '';
            } else if (searchEmptyRow) {
                searchEmptyRow.remove();
            }
        };

        input.value = window.ExamsUI?.studentSearchQuery || '';
        input.addEventListener('input', applySearch);
        applySearch();
    },

    updateTermUI(term) {
        const indicator = document.getElementById('activeExamTermIndicator');
        if (indicator) {
            indicator.querySelector('strong').textContent = term === 1 ? 'الأول' : 'الثاني';
        }
    },

    getEstimate(score, total) {
        if (window.ExamsData?.isAbsentGrade(score)) {
            return { text: 'غائب (راسب)', class: 'est-absent' };
        }
        if (score === '' || score === null || score === undefined || !total || isNaN(score)) {
            return { text: '---', class: '' };
        }
        const percent = (parseFloat(score) / parseFloat(total)) * 100;
        if (percent >= 85) return { text: 'ممتاز', class: 'est-excellent' };
        if (percent >= 75) return { text: 'جيد جداً', class: 'est-verygood' };
        if (percent >= 65) return { text: 'جيد', class: 'est-good' };
        if (percent >= 50) return { text: 'مقبول', class: 'est-pass' };
        return { text: 'ضعيف', class: 'est-fail' };
    },

    getOverallEstimate(studentGrades, examColumns) {
        let earned = 0;
        let possible = 0;
        let hasAnyGrade = false;
        let hasAbsent = false;

        examColumns.forEach((exam, index) => {
            const value = studentGrades?.[index];
            const maxScore = exam.totalScore || 100;
            if (window.ExamsData?.isAbsentGrade(value)) {
                hasAnyGrade = true;
                hasAbsent = true;
                possible += maxScore;
                return;
            }

            if (value !== undefined && value !== null && value !== '') {
                const numericValue = parseFloat(value);
                if (!Number.isNaN(numericValue)) {
                    hasAnyGrade = true;
                    earned += numericValue;
                    possible += maxScore;
                }
            }
        });

        if (!hasAnyGrade || !possible) return { text: '---', class: '' };
        if (hasAbsent) return { text: 'راسب / غائب', class: 'est-absent' };
        return this.getEstimate(earned, possible);
    },

    bindAbsentOverride(container) {
        container.ondblclick = event => {
            const badge = event.target.closest('.grade-absent-badge, .grade-override-trigger');
            if (!badge || !container.contains(badge)) return;

            const studentId = parseInt(badge.dataset.studentId, 10);
            const examIdx = parseInt(badge.dataset.examId, 10);
            if (Number.isNaN(studentId) || Number.isNaN(examIdx)) return;

            const cell = badge.closest('td');
            if (!cell) return;
            const exam = window.ExamsUI?.examColumns?.[examIdx];
            const maxScore = typeof exam === 'string' ? 100 : (exam?.totalScore || 100);
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = String(maxScore);
            input.step = 'any';
            input.className = 'grade-quick-input';
            input.placeholder = 'الدرجة';
            input.setAttribute('aria-label', 'إدخال درجة بديلة');
            cell.replaceChildren(input);
            input.focus();

            let committed = false;
            const commit = () => {
                if (committed) return;
                committed = true;
                const value = input.value.trim();
                if (value === '') {
                    window.ExamsUI.renderGradesTable();
                    return;
                }
                const validatedValue = window.ExamsUI.validateScoreValue(value, maxScore);
                input.value = validatedValue;
                window.ExamsUI.updateGrade(studentId, examIdx, validatedValue);
            };
            input.addEventListener('blur', commit, { once: true });
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                } else if (event.key === 'Escape') {
                    committed = true;
                    window.ExamsUI.renderGradesTable();
                }
            });
        };
    },

    getSingleExamRecord(student, gradesData, examIdx, totalScore) {
        const rawValue = gradesData?.[student.id]?.[examIdx] !== undefined
            ? gradesData[student.id][examIdx]
            : '';
        const isAbsent = window.ExamsData?.isAbsentGrade(rawValue);
        const score = isAbsent
            ? null
            : (typeof rawValue === 'object' && rawValue !== null
                ? parseFloat(rawValue.score)
                : parseFloat(rawValue));
        const hasScore = Number.isFinite(score);
        const estimate = this.getEstimate(hasScore ? score : rawValue, totalScore);

        return {
            student,
            rawValue,
            score: hasScore ? score : null,
            hasScore,
            isAbsent,
            estimate,
            percent: hasScore ? (score / totalScore) * 100 : null
        };
    },

    getTop10Leaderboard(examIdx, students, gradesData, totalScore) {
        const rankLabels = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
        const leaderboard = students
            .map(student => this.getSingleExamRecord(student, gradesData, examIdx, totalScore))
            .filter(record => record.hasScore && !record.isAbsent)
            .sort((a, b) => b.score - a.score);
        
        const topStudents = leaderboard.slice(0, 10);
        let currentRankIdx = 0;

        topStudents.forEach((record, index) => {
            if (index > 0 && record.score < topStudents[index - 1].score) {
                // Competition ranking: 1, 1, 3 (the next rank shifts by the
                // number of students occupying the tied position).
                currentRankIdx = index;
            }

            const isTie = (index > 0 && record.score === topStudents[index - 1].score)
                || (index < leaderboard.length - 1 && record.score === leaderboard[index + 1].score);
            const baseRank = rankLabels[currentRankIdx] || String(currentRankIdx + 1);
            record.rankText = isTie ? `${baseRank} مكرر` : baseRank;
        });

        return topStudents;
    },

    getSingleExamFilterLabel(filter, pdf = false) {
        const labels = {
            all: 'عرض الكل',
            passed: pdf ? 'الطلاب الناجحين / اجتياز الاختبار' : 'قائمة الناجحين / اجتياز الاختبار',
            failed: pdf ? 'الطلاب الراسبين' : 'قائمة الراسبين',
            excellent: pdf ? 'الطلاب الحاصلين على تقدير ممتاز' : 'ممتاز',
            verygood: pdf ? 'الطلاب الحاصلين على تقدير جيد جداً' : 'جيد جداً',
            good: pdf ? 'الطلاب الحاصلين على تقدير جيد' : 'جيد',
            acceptable: pdf ? 'الطلاب الحاصلين على تقدير مقبول' : 'مقبول',
            weak: pdf ? 'الطلاب الحاصلين على تقدير ضعيف' : 'ضعيف',
            top10: pdf ? 'قائمة الأوائل (أفضل 10 طلاب)' : 'قائمة الأوائل'
        };
        return labels[filter] || labels.all;
    },

    getExamFinishButton(examIdx, compact = false) {
        const isFinished = window.ExamsUI?.isExamFinished?.(examIdx);
        const buttonClass = compact ? 'finish-exam-header-btn' : 'finish-exam-btn';
        if (isFinished) {
            return `
                <button type="button" id="finishExamBtn_${examIdx}" class="${buttonClass} completed-btn" disabled aria-disabled="true" title="الاختبار منهي">
                    <i class="fas fa-check-circle"></i>
                    ${compact ? 'الاختبار منهي' : '<span>الاختبار منهي</span>'}
                </button>
            `;
        }
        return `
            <button type="button" id="finishExamBtn_${examIdx}" class="${buttonClass}" onclick="window.ExamsUI.finishExam(${examIdx})" title="إنهاء الامتحان">
                <i class="fas fa-flag-checkered"></i>
                ${compact ? 'إنهاء الامتحان' : '<span>إنهاء الامتحان</span>'}
            </button>
        `;
    },

    getSingleExamFilterButtons(activeFilter) {
        return [
            { key: 'all', label: 'عرض الكل', icon: 'fa-list' },
            { key: 'passed', label: 'قائمة الناجحين / اجتياز الاختبار', icon: 'fa-check-circle' },
            { key: 'failed', label: 'قائمة الراسبين', icon: 'fa-times-circle' },
            { key: 'excellent', label: 'ممتاز', icon: 'fa-star' },
            { key: 'verygood', label: 'جيد جداً', icon: 'fa-award' },
            { key: 'good', label: 'جيد', icon: 'fa-thumbs-up' },
            { key: 'acceptable', label: 'مقبول', icon: 'fa-circle-check' },
            { key: 'weak', label: 'ضعيف', icon: 'fa-arrow-down' },
            { key: 'top10', label: 'قائمة الأوائل', icon: 'fa-trophy' }
        ].map(button => `
            <button type="button"
                    class="exam-filter-btn ${button.key === 'all' ? 'show-all-filter-btn' : ''} ${activeFilter === button.key ? 'active' : ''}"
                    data-filter="${button.key}"
                    onclick="window.ExamsUI.setSingleExamFilter('${button.key}')"
                    aria-pressed="${activeFilter === button.key ? 'true' : 'false'}">
                <i class="fas ${button.icon}"></i>
                <span>${button.label}</span>
            </button>
        `).join('');
    },

    matchesSingleExamFilter(record, filter) {
        if (filter === 'all') return true;
        if (filter === 'top10') return true;
        if (filter === 'failed') {
            return record.isAbsent || (record.hasScore && record.percent < 50);
        }
        if (filter === 'passed') {
            return record.hasScore && !record.isAbsent && record.percent >= 50;
        }
        if (filter === 'excellent') return record.hasScore && record.percent >= 85;
        if (filter === 'verygood') return record.hasScore && record.percent >= 75 && record.percent < 85;
        if (filter === 'good') return record.hasScore && record.percent >= 65 && record.percent < 75;
        if (filter === 'acceptable') return record.hasScore && record.percent >= 50 && record.percent < 65;
        if (filter === 'weak') return record.hasScore && record.percent < 50;
        return true;
    },

    renderTabs(examColumns, activeExamIdx) {
        const row = document.getElementById('examTabsRow');
        if (!row) return;

        // Premium Neon Color System
        const neonPalette = [
            { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)', bg: 'rgba(6, 182, 212, 0.15)' }, // Cyan
            { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', bg: 'rgba(34, 197, 94, 0.15)' }, // Green
            { color: '#d946ef', glow: 'rgba(217, 70, 239, 0.5)', bg: 'rgba(217, 70, 239, 0.15)' }, // Fuchsia
            { color: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', bg: 'rgba(249, 115, 22, 0.15)' }, // Orange
            { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.5)', bg: 'rgba(99, 102, 241, 0.15)' }, // Indigo
            { color: '#facc15', glow: 'rgba(250, 204, 21, 0.5)', bg: 'rgba(250, 204, 21, 0.15)' }  // Yellow
        ];

        let html = `
            <button id="btn_exam_all"
                    class="exam-tab-btn master-tab ${activeExamIdx === 'all' ? 'active' : ''}"
                    data-exam-idx="all"
                    aria-pressed="${activeExamIdx === 'all' ? 'true' : 'false'}"
                    onclick="window.ExamsUI.switchExam('all')">
                <i class="fas fa-layer-group"></i>
                <span>عرض الكل</span>
            </button>
        `;

        examColumns.forEach((exam, idx) => {
            const examName = typeof exam === 'string' ? exam : exam.name;
            const styleSet = neonPalette[idx % neonPalette.length];
            
            html += `
                <button id="btn_exam_${idx}"
                        class="exam-tab-btn ${activeExamIdx === idx ? 'active' : ''}"
                        data-exam-idx="${idx}"
                        aria-pressed="${activeExamIdx === idx ? 'true' : 'false'}"
                        onclick="window.ExamsUI.switchExam(${idx})"
                        style="--neon-color: ${styleSet.color}; --neon-glow: ${styleSet.glow}; --neon-bg: ${styleSet.bg}">
                    <i class="fas fa-file-invoice"></i>
                    <span>${examName}</span>
                </button>
            `;
        });

        row.innerHTML = html;
    },

    renderGradesTable(container, students, stage, grade, term, examColumns, activeExamIdx) {
        if (students.length === 0) {
            container.innerHTML = '<div class="placeholder-content"><i class="fas fa-users-slash"></i><p>لا يوجد طلاب مسجلون في هذا الصف حالياً</p></div>';
            return;
        }

        const gradesData = window.ExamsData.getGrades(stage, grade, term);

        if (activeExamIdx === 'all') {
            this.renderMatrixView(container, students, examColumns, gradesData);
        } else {
            this.renderSingleExamView(container, students, examColumns, activeExamIdx, gradesData);
        }
    },

    renderSingleExamView(container, students, examColumns, examIdx, gradesData) {
        const exam = examColumns[examIdx];
        const examName = typeof exam === 'string' ? exam : exam.name;
        const totalScore = exam.totalScore || 100;
        const activeFilter = window.ExamsUI?.singleExamFilter || 'all';
        const allRecords = students.map(student => this.getSingleExamRecord(student, gradesData, examIdx, totalScore));
        const visibleRecords = activeFilter === 'top10'
            ? this.getTop10Leaderboard(examIdx, students, gradesData, totalScore)
            : allRecords.filter(record => this.matchesSingleExamFilter(record, activeFilter));

        if (activeFilter === 'failed') {
            /*
             * Keep the failed-students list ordered from the lowest total
             * score upward. Absent students have no numeric score, so treat
             * them as zero and keep them at the beginning with zero-mark
             * students.
             */
            visibleRecords.sort((a, b) => {
                const scoreA = a.hasScore ? a.score : 0;
                const scoreB = b.hasScore ? b.score : 0;
                return Number(scoreA) - Number(scoreB);
            });
        }

        const isFinished = window.ExamsUI?.isExamFinished?.(examIdx)
            || window.ExamsUI?.lastFinishedExamIdx === examIdx;

        let html = `
            <div class="exam-view-header" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding: 1.5rem; background: rgba(147, 51, 234, 0.05); border-radius: 20px; border: 1px solid rgba(147, 51, 234, 0.15);">
                <div>
                    <h3 style="color:var(--text-primary); font-weight: 900; font-size: 1.4rem; display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-file-signature" style="color:var(--exam-color)"></i>
                        ${examName} 
                        <span class="exam-total-score-badge">درجة الامتحان: من ${totalScore}</span>
                        ${isFinished ? '<span id="examStatusBadge" class="exam-status-badge">حالة الاختبار: منهي</span>' : ''}
                    </h3>
                </div>
                <div class="exam-column-actions">
                    ${this.getExamFinishButton(examIdx)}
                    <button class="delete-exam-col-btn" onclick="window.ExamsUI.deleteColumn(${examIdx})" title="حذف الامتحان بالكامل">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="single-exam-filter-toolbar" role="toolbar" aria-label="تصفية نتائج الامتحان">
                ${this.getSingleExamFilterButtons(activeFilter)}
            </div>
            ${isFinished ? `
                <div class="exam-post-finish-notice" role="status">
                    <i class="fas fa-lightbulb" aria-hidden="true"></i>
                    <span>اضغط مرتين علي نص "غائب (راسب)" لكتابة درجة الطالب</span>
                </div>
            ` : ''}
            <div id="currentViewTitle" class="exam-current-view-banner" role="status">
                ${this.getViewingNowLabel(examIdx, examColumns)}
            </div>
            ${this.getStudentSearchHTML()}
            <div class="table-responsive">
                <table class="exam-grades-table">
                    <thead>
                        <tr>
                            <th class="col-serial" style="text-align: center;">م</th>
                            ${activeFilter === 'top10' ? '<th class="col-rank" style="text-align: center;">الترتيب</th>' : ''}
                            <th class="col-student-name">اسم الطالب</th>
                            <th style="width: 250px; text-align: center;">درجة الامتحان (من ${totalScore})</th>
                            <th style="width: 250px; text-align: center;">تقدير الطالب</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleRecords.length
                            ? visibleRecords.map((record, rowIdx) => {
                            const { student: s, rawValue: val, estimate, isAbsent } = record;
                            const inputValue = typeof val === 'object' && val !== null ? val.score ?? '' : val;
                            return `
                            <tr class="exam-grade-row"
                                data-student-id="${this.escapeAttribute(s.id)}"
                                data-student-code="${this.escapeAttribute(s.studentCode || '')}"
                                data-student-serial="${this.escapeAttribute(rowIdx + 1)}"
                                data-student-name="${this.escapeAttribute(s.name)}">
                                <td class="col-serial" style="text-align: center;">${rowIdx + 1}</td>
                                ${activeFilter === 'top10' ? `<td class="col-rank" style="text-align: center;"><span class="leaderboard-rank-badge">${record.rankText}</span></td>` : ''}
                                <td class="col-student-name">
                                    <a href="#" class="student-name-link clickable-student-name" data-student-id="${s.id}" data-from-view="examGrades" style="font-size: 1.05rem;">
                                        ${s.name}
                                    </a>
                                </td>
                                <td class="exam-grade-value-cell" style="text-align: center;">
                                    ${isAbsent
                                        ? `<span class="grade-absent-badge" title="انقر مرتين لإدخال درجة" data-student-id="${s.id}" data-exam-id="${examIdx}">غائب (راسب)</span>`
                                        : `<div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                            <input type="number" 
                                                   class="exam-grade-input" 
                                                   value="${inputValue}" 
                                                   min="0"
                                                   max="${totalScore}"
                                                   step="any"
                                                   placeholder="--"
                                                   style="width: 90px;"
                                                   onchange="window.ExamsUI.handleScoreInput(this, ${s.id}, ${examIdx}, ${totalScore})">
                                            <span style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600;">/ ${totalScore}</span>
                                        </div>`}
                                </td>
                                <td style="text-align: center;">
                                    <span id="est_${s.id}_${examIdx}" title="${isAbsent || estimate.class === 'est-fail' ? 'انقر مرتين لإدخال درجة' : ''}" class="grade-estimate-badge ${estimate.class}${isAbsent ? ' grade-absent-badge' : (estimate.class === 'est-fail' ? ' grade-override-trigger' : '')}" data-student-id="${s.id}" data-exam-id="${examIdx}">${estimate.text}</span>
                                </td>
                            </tr>
                        `}).join('')
                            : `<tr class="exam-empty-filter-row"><td colspan="${activeFilter === 'top10' ? 5 : 4}">لا توجد نتائج لهذا التصنيف</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
        this.bindAbsentOverride(container);
        this.bindStudentSearch(container);
    },

    renderMatrixView(container, students, examColumns, gradesData) {
        let html = `
            <div id="currentViewTitle" class="exam-current-view-banner" role="status">
                ${this.getViewingNowLabel('all', examColumns)}
            </div>
            ${this.getStudentSearchHTML()}
            <div class="table-responsive-wrapper">
                <table class="exam-grades-table exams-table">
                    <thead>
                        <tr>
                            <th class="col-serial" style="text-align: center;">م</th>
                            <th class="col-student-name">اسم الطالب</th>
                            ${examColumns.map((exam, examIdx) => `
                                <th class="exam-matrix-column" style="text-align: center; font-size: 0.85rem; border-left: 1px solid rgba(255,255,255,0.05);">
                                    ${typeof exam === 'string' ? exam : exam.name}
                                    <div style="font-size: 0.65rem; opacity: 0.6; font-weight: 600;">(من ${exam.totalScore || 100})</div>
                                    ${this.getExamFinishButton(examIdx, true)}
                                </th>
                            `).join('')}
                            <th style="text-align: center; background: rgba(147, 51, 234, 0.1); border-right: 2px solid var(--primary-color);">التقدير العام</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map((s, sIdx) => {
                            let examCells = examColumns.map((exam, cIdx) => {
                                const rawValue = (gradesData[s.id] && gradesData[s.id][cIdx] !== undefined) ? gradesData[s.id][cIdx] : '';
                                const isAbsent = window.ExamsData?.isAbsentGrade(rawValue);
                                const val = isAbsent ? null : parseFloat(rawValue);
                                return `
                                    <td class="exam-matrix-column" style="text-align: center; font-family: 'Cairo'; font-weight: 700; border-left: 1px solid rgba(255,255,255,0.05);">
                                        ${isAbsent
                                            ? `<span class="grade-absent-badge" title="انقر مرتين لإدخال درجة" data-student-id="${s.id}" data-exam-id="${cIdx}">غائب (راسب)</span>`
                                            : (val !== null && !Number.isNaN(val) ? val : '<span style="opacity:0.3">---</span>')}
                                    </td>
                                `;
                            }).join('');

                            const overallEst = this.getOverallEstimate(gradesData[s.id] || {}, examColumns);

                            return `
                            <tr class="exam-grade-row"
                                data-student-id="${this.escapeAttribute(s.id)}"
                                data-student-code="${this.escapeAttribute(s.studentCode || '')}"
                                data-student-serial="${this.escapeAttribute(sIdx + 1)}"
                                data-student-name="${this.escapeAttribute(s.name)}">
                                <td class="col-serial" style="text-align: center;">${sIdx + 1}</td>
                                <td class="col-student-name" style="font-weight: 700;">
                                    <a href="#" class="student-name-link" data-student-id="${s.id}" data-from-view="examGrades">${s.name}</a>
                                </td>
                                ${examCells}
                                <td style="text-align: center; background: rgba(147, 51, 234, 0.05); border-right: 2px solid var(--primary-color);">
                                    <span class="grade-estimate-badge ${overallEst.class}">${overallEst.text}</span>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
        this.bindAbsentOverride(container);
        this.bindStudentSearch(container);
    },

    renderAcademicRecordTable(container, modal, studentId, stage, grade, filter) {
        // Update toggle UI
        modal.querySelectorAll('.record-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        const getTermData = (term) => {
            const cols = window.ExamsData.loadExamColumns(stage, grade, term);
            const grades = window.ExamsData.getGrades(stage, grade, term);
            return { cols, studentGrades: grades[studentId] || {} };
        };

        let displayData = [];
        if (filter === '1' || filter === 'all') {
            const data = getTermData(1);
            if (filter === 'all') displayData.push({ type: 'header', text: 'الترم الأول' });
            data.cols.forEach((col, idx) => {
                const gradeVal = data.studentGrades[idx];
                const colName = typeof col === 'string' ? col : col.name;
                displayData.push({ name: colName, grade: gradeVal, status: (gradeVal !== undefined && gradeVal !== '') ? 'present' : 'absent' });
            });
        }
        if (filter === '2' || filter === 'all') {
            const data = getTermData(2);
            if (filter === 'all') displayData.push({ type: 'header', text: 'الترم الثاني' });
            data.cols.forEach((col, idx) => {
                const gradeVal = data.studentGrades[idx];
                const colName = typeof col === 'string' ? col : col.name;
                displayData.push({ name: colName, grade: gradeVal, status: (gradeVal !== undefined && gradeVal !== '') ? 'present' : 'absent' });
            });
        }

        let html = `
            <table class="academic-record-table">
                <thead>
                    <tr>
                        <th>الامتحان</th>
                        <th style="text-align:center">الدرجة</th>
                        <th style="text-align:center">الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayData.map(item => {
                        if (item.type === 'header') {
                            return `<tr class="term-section-header"><td colspan="3">${item.text}</td></tr>`;
                        }
                        return `
                            <tr>
                                <td>${item.name}</td>
                                <td style="text-align:center">
                                    <span class="${item.grade !== undefined && item.grade !== '' ? 'grade-val' : 'grade-empty'}">
                                        ${item.grade !== undefined && item.grade !== '' ? item.grade : '--'}
                                    </span>
                                </td>
                                <td style="text-align:center">
                                    <span class="academic-status-badge ${item.status === 'present' ? 'status-present' : 'status-absent'}">
                                        ${item.status === 'present' ? 'حضور' : 'غياب'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = html;
    }
};
