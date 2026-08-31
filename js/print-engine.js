window.PrintEngine = {
    pendingExpelledExport: null,

    init() {
        document.addEventListener('click', (e) => {
            const exportMethodBtn = e.target.closest(
                '#studentExportMethodModal [data-export-method], #financialExportModal [data-export-method], #schedulePrintModal [data-export-method]'
            );
            if (exportMethodBtn) {
                const exportModal = exportMethodBtn.closest('#studentExportMethodModal, #financialExportModal, #schedulePrintModal');
                this.handleExportSelection(
                    exportMethodBtn.dataset.exportMethod,
                    exportModal?.dataset.targetType || (
                        exportModal?.id === 'financialExportModal'
                            ? 'financial-reports'
                            : exportModal?.id === 'schedulePrintModal'
                                ? 'schedule'
                                : 'student-list'
                    )
                );
                return;
            }

            const schedulePrintOptionBtn = e.target.closest(
                '#schedulePrintOptionsModal [data-schedule-print-mode]'
            );
            if (schedulePrintOptionBtn) {
                e.preventDefault();
                this.handleSchedulePrintMode(
                    schedulePrintOptionBtn.dataset.schedulePrintMode
                );
                return;
            }

            const schedulePrintBtn = e.target.closest('#schedulePrintBtn');
            if (schedulePrintBtn) {
                e.preventDefault();
                this.handleSchedulePrintClick();
                return;
            }

            const unpaidPrintBtn = e.target.closest('#printUnpaidListBtn');
            if (unpaidPrintBtn) {
                e.preventDefault();
                this.openExportMethodModal('unpaid-students');
                return;
            }

            const groupSessionPrintBtn = e.target.closest('#printGroupSessionAttendanceBtn');
            if (groupSessionPrintBtn) {
                e.preventDefault();
                this.openExportMethodModal('group-session-attendance');
                return;
            }

            const repeatedAbsencePrintBtn = e.target.closest('#printRepeatedAbsenceBtn');
            if (repeatedAbsencePrintBtn) {
                e.preventDefault();
                this.openExportMethodModal('repeated-absence');
                return;
            }

            const examGradesPrintBtn = e.target.closest('#exportGradesBtn');
            if (examGradesPrintBtn) {
                e.preventDefault();
                this.openExportMethodModal('exam-grades');
                return;
            }

            if (e.target.closest('.export-btn')) {
                this.exportCurrentView();
            }
        });
    },

    openExportMethodModal(targetType = 'student-list', context = null) {
        const modalId = targetType === 'financial-reports'
            ? 'financialExportModal'
            : targetType === 'schedule'
                ? 'schedulePrintModal'
                : 'studentExportMethodModal';
        const modal = document.getElementById(modalId);
        if (!modal) {
            alert('عذراً، تعذر فتح خيارات التصدير.');
            return;
        }

        modal.dataset.targetType = targetType;
        this.pendingExpelledExport = targetType === 'expelled-students'
            ? context
            : null;
        if (targetType === 'expelled-students') {
            // The expelled-students modal is injected after the global
            // export modal, so keep the export choices above it visually.
            modal.style.zIndex = '2200';
        } else {
            modal.style.removeProperty('z-index');
        }
        if (targetType === 'repeated-absence' || targetType === 'expelled-students') {
            const reportName = targetType === 'expelled-students'
                ? 'الطلاب المطرودين'
                : 'الغياب المتكرر';
            const descriptions = {
                'print-only': `فتح نافذة الطباعة لتقرير ${reportName}`,
                'download-only': `إنشاء تقرير ${reportName} بصيغة PDF وتنزيله مباشرة`,
                both: `تنزيل تقرير ${reportName} بصيغة PDF ثم فتح نافذة الطباعة`
            };
            Object.entries(descriptions).forEach(([method, description]) => {
                const option = modal.querySelector(`[data-export-method="${method}"] p`);
                if (option) option.textContent = description;
            });
        }
        window.ModalManager.open(modalId);
    },

    openExportOptionsModal(options = {}) {
        const targetType = options.targetType
            || (Array.isArray(options.data) ? 'expelled-students' : 'student-list');
        return this.openExportMethodModal(targetType, options);
    },

    openSchedulePrintModal() {
        if (window.ModalManager) {
            window.ModalManager.open('schedulePrintModal');
        }
    },

    isAllStagesScheduleFilter() {
        const activeStage = window.GlobalStageFilter?.getActiveStage?.();
        const activeGrade = window.GlobalStageFilter?.getActiveGrade?.();

        /*
         * The global filter represents "عرض الكل" with no active stage.
         * Keep the explicit ALL check as a compatibility path for callers
         * that expose a string-based grade filter.
         */
        return !activeStage || activeGrade === 'ALL';
    },

    handleSchedulePrintClick() {
        if (this.isAllStagesScheduleFilter()) {
            this.openSchedulePrintOptionsModal();
            return;
        }

        // Preserve the existing default export flow for a selected
        // stage/grade: print, PDF, or both.
        this.openSchedulePrintModal();
    },

    openSchedulePrintOptionsModal() {
        if (window.ModalManager) {
            window.ModalManager.open('schedulePrintOptionsModal');
        }
    },

    handleSchedulePrintMode(mode) {
        if (mode === 'MATRIX_ONLY') {
            return this.printMatrixOnly();
        }

        if (mode === 'GRADES_ONLY') {
            return this.printGradesOnly();
        }

        if (mode === 'PRINT_ALL') {
            return this.printAll();
        }

        return false;
    },

    printMatrixOnly() {
        window.ModalManager?.close('schedulePrintOptionsModal');
        return this.downloadSchedulePDFOnly('MATRIX_ONLY');
    },

    printGradesOnly() {
        window.ModalManager?.close('schedulePrintOptionsModal');
        return this.downloadSchedulePDFOnly('GRADES_ONLY');
    },

    printAll() {
        window.ModalManager?.close('schedulePrintOptionsModal');
        return this.downloadSchedulePDFOnly('PRINT_ALL');
    },

    async handleExportSelection(selectedMethod, targetType) {
        const modalId = targetType === 'financial-reports'
            ? 'financialExportModal'
            : targetType === 'schedule'
                ? 'schedulePrintModal'
                : 'studentExportMethodModal';
        const expelledExportContext = targetType === 'expelled-students'
            ? this.pendingExpelledExport
            : null;
        if (targetType === 'expelled-students') this.pendingExpelledExport = null;
        window.ModalManager.close(modalId);

        if (targetType === 'schedule') {
            switch (selectedMethod) {
                case 'print-only':
                    this.printScheduleOnly();
                    break;
                case 'download-only':
                    await this.downloadSchedulePDFOnly();
                    break;
                case 'both': {
                    const downloaded = await this.downloadSchedulePDFOnly();
                    if (downloaded) this.printScheduleOnly();
                    break;
                }
            }
            return;
        }

        if (targetType === 'financial-reports' && window.FinancialReportsUI) {
            switch (selectedMethod) {
                case 'print-only':
                    window.FinancialReportsUI.printFinancialReport();
                    break;
                case 'download-only':
                    await window.FinancialReportsUI.downloadFinancialReportPDF();
                    break;
                case 'both':
                    // Native print provides both destinations: the user can
                    // print or choose “Save as PDF” without rasterization.
                    await window.FinancialReportsUI.downloadFinancialReportPDF();
                    break;
            }
            return;
        }

        if (targetType === 'student-codes' && window.StudentCodes) {
            switch (selectedMethod) {
                case 'print-only':
                    window.StudentCodes.printPending();
                    break;
                case 'download-only':
                    await window.StudentCodes.downloadPendingPDF();
                    break;
                case 'both': {
                    const downloaded = await window.StudentCodes.downloadPendingPDF();
                    if (downloaded) window.StudentCodes.printPending();
                    break;
                }
            }
            return;
        }

        switch (selectedMethod) {
            case 'print-only':
                this.exportCurrentView(targetType, expelledExportContext);
                break;
            case 'download-only':
                await this.downloadCurrentView(targetType, expelledExportContext);
                break;
            case 'both': {
                const downloaded = await this.downloadCurrentView(targetType, expelledExportContext);
                if (downloaded) this.exportCurrentView(targetType, expelledExportContext);
                break;
            }
        }
    },

    getScheduleGradeContexts() {
        const selectedStages = Array.isArray(window.Auth?.getSelectedStages?.())
            ? window.Auth.getSelectedStages()
            : [];
        const selectedGrades = window.Auth?.getSelectedGrades?.() || {};
        const activeStage = window.GlobalStageFilter?.getActiveStage?.() || null;
        const activeGrade = window.GlobalStageFilter?.getActiveGrade?.() || null;
        const stagesToProcess = activeStage ? [activeStage] : selectedStages;
        const includeStageInGradeLabel = stagesToProcess.length > 1;
        const contexts = [];

        stagesToProcess.forEach(stage => {
            const stageInfo = window.STUDENT_CONFIG?.stageData?.[stage];
            if (!stageInfo) return;

            const isFlatStage = Boolean(stageInfo.isFlat || stage.startsWith('custom_'));
            const gradeIndexes = isFlatStage
                ? [1]
                : (selectedGrades[stage] || [])
                    .map(Number)
                    .filter(grade => Number.isFinite(grade))
                    .filter(grade => activeGrade ? grade === Number(activeGrade) : true)
                    .sort((a, b) => a - b);

            gradeIndexes.forEach(gradeIdx => {
                const rawGradeName = isFlatStage
                    ? stageInfo.name
                    : window.STUDENT_CONFIG?.gradeNames?.[stage]?.[gradeIdx - 1] || `الصف ${gradeIdx}`;
                const gradeName = includeStageInGradeLabel && !isFlatStage
                    ? `${stageInfo.name} - ${rawGradeName}`
                    : rawGradeName;

                contexts.push({
                    stage,
                    gradeIdx,
                    stageName: stageInfo.name,
                    rawGradeName,
                    gradeName,
                    gradeKey: `${stage}:${gradeIdx}`
                });
            });
        });

        return contexts;
    },

    getFilteredSchedules() {
        const schedules = [];
        const contexts = this.getScheduleGradeContexts();

        contexts.forEach(context => {
            const groups = window.AttendanceStore?.getGroups?.(context.stage, context.gradeIdx) || [];
            groups.forEach(group => {
                (group.schedule || []).forEach(slot => {
                    schedules.push({
                        stage: context.stage,
                        grade: context.gradeIdx,
                        gradeKey: context.gradeKey,
                        stageName: context.stageName,
                        gradeName: context.gradeName,
                        groupName: group.name || '',
                        day: slot.day || '',
                        time: slot.time || '',
                        hall: slot.hall || group.hall || 'القاعة الرئيسية',
                        notes: slot.notes || group.notes || group.name || ''
                    });
                });
            });
        });

        const dayOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        return schedules.sort((a, b) => {
            const dayDifference = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDifference !== 0) return dayDifference;
            return String(a.time).localeCompare(String(b.time), 'en');
        });
    },

    getAllGrades() {
        const contexts = this.getScheduleGradeContexts();
        const grades = [...new Set(contexts.map(context => context.gradeName).filter(Boolean))];
        return grades.length
            ? grades
            : ['الصف الأول الابتدائى', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي'];
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character]));
    },

    buildWeeklyMatrixGrid(schedules, mapTitle = null) {
        const daysOrder = [
            'السبت',
            'الأحد',
            'الاثنين',
            'الثلاثاء',
            'الأربعاء',
            'الخميس',
            'الجمعة'
        ];

        if (!schedules || !schedules.length) return '';

        // Normalize Arabic digits, non-breaking spaces, and invisible marks.
        const normalizeScheduleText = value => String(value ?? '')
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
            .trim();

        // Convert a single time line into its 24-hour equivalent. The line
        // may also contain one or more day names, so AM/PM markers must be
        // read from the time token itself (not from the whole line).
        const parseTimeTo24h = (timeStr) => {
            if (!timeStr) return null;

            const clean = normalizeScheduleText(timeStr).toLowerCase();
            const timePattern = /(\d{1,2})(?::\d{2})?\s*(صباح(?:اً|ًا)?|مساء(?:اً|ًا)?|ص|م|am|pm)?/gi;
            const candidates = [...clean.matchAll(timePattern)];
            if (!candidates.length) return null;

            const clockCandidate = candidates.find(candidate => candidate[0].includes(':'));
            const markedCandidate = candidates.find(candidate => candidate[2]);

            // Prefer the first clock-shaped number because it is the start
            // of a range such as "5:00 - 6:30 م". If a marker is written at
            // the end of that range, read it from the remaining line.
            const hourMatch = clockCandidate || markedCandidate || candidates[candidates.length - 1];

            let hourNum = parseInt(hourMatch[1], 10);
            if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) return null;

            const trailingMarker = clean
                .slice(hourMatch.index + hourMatch[0].length)
                .match(/(صباح(?:اً|ًا)?|مساء(?:اً|ًا)?|ص|م|am|pm)/i);
            const marker = (hourMatch[2] || trailingMarker?.[1] || '').toLowerCase();
            const isPM = /^(م|pm|مساء)/i.test(marker);
            const isAM = /^(ص|am|صباح)/i.test(marker);

            // 1. Direct 24h input format (e.g. 13 to 23)
            if (hourNum >= 13) return hourNum;

            // 2. Explicit AM takes absolute priority if present
            if (isAM && !isPM) {
                return hourNum === 12 ? 0 : hourNum;
            }

            // 3. Explicit PM
            if (isPM && !isAM) {
                return hourNum < 12 ? hourNum + 12 : 12;
            }

            // 4. No marker: keep the unmarked 12-hour value unchanged.
            return hourNum;
        };

        const extractDaysFromText = (text) => {
            const cleanText = normalizeScheduleText(text);
            return daysOrder.filter(day => cleanText.includes(day));
        };

        // Parse group schedules line by line so each day's time stays tied to
        // the same line. This is important for multi-line schedules where
        // different days use different AM/PM values.
        const parseGroupScheduleLines = (scheduleText) => {
            if (!scheduleText) return [];

            const lines = String(scheduleText).split(/\r?\n|<br\s*\/?>/i);
            const parsedRules = [];

            lines.forEach(line => {
                const cleanLine = line.trim();
                if (!cleanLine) return;

                const time24h = parseTimeTo24h(cleanLine);
                if (time24h === null) return;

                const daysInLine = extractDaysFromText(cleanLine);
                daysInLine.forEach(dayName => {
                    parsedRules.push({
                        day: dayName,
                        hour: time24h
                    });
                });
            });

            return parsedRules;
        };

        const splitScheduleLines = value => String(value ?? '')
            .replace(/<br\s*\/?>/gi, '\n')
            .split(/\r?\n/)
            .map(line => normalizeScheduleText(line))
            .filter(Boolean);

        const formatHourTo12h = (hour24) => {
            const period = hour24 >= 12 ? 'م' : 'ص';
            const hour12 = hour24 % 12 || 12;
            const formattedHour = String(hour12).padStart(2, '0');

            return `${formattedHour}:00 ${period}`;
        };

        /*
         * `day` and `time` are normally one value per schedule item, but
         * older/imported records can store a group as parallel line lists:
         *
         *   day:  "السبت والاثنين\nالأربعاء"
         *   time: "05:00 AM\n05:00 PM"
         *
         * Do not concatenate the two complete fields and parse them as one
         * block. That loses the relationship between a line's days and its
         * time. Build one combined line at a time, then let
         * parseGroupScheduleLines parse that line independently.
         */
        const getScheduleLinesForItem = item => {
            const dayLines = splitScheduleLines(item.day);
            const timeLines = splitScheduleLines(item.time);

            if (!dayLines.length || !timeLines.length) return [];

            // The usual representation: one day line paired with one time
            // line, or parallel day/time line lists of the same length.
            if (dayLines.length === timeLines.length) {
                return dayLines.map((dayLine, index) =>
                    `${dayLine} ${timeLines[index]}`
                );
            }

            /*
             * If the time lines already contain day names, they are complete
             * schedule lines and must be parsed as-is. Otherwise the
             * day/time lists are ambiguous (there is no safe way to know
             * which day belongs to which time), so do not cross-apply times
             * to every day.
             */
            const selfContainedTimeLines = timeLines.filter(line =>
                extractDaysFromText(line).length > 0
            );
            if (selfContainedTimeLines.length) return selfContainedTimeLines;

            return [];
        };

        const expandedSlots = [];

        schedules.forEach(item => {
            const groupText =
                item.groupName ||
                item.groupNumber ||
                (item.notes ? `المجموعة ${item.notes}` : 'مجموعة');

            const grade = item.gradeName
                ? item.gradeName
                    // Standardize the hamza variant before rendering slots.
                    .replace(/إبتدائي/g, 'ابتدائي')
                    .replace(
                        /^(ابتدائي|ابتدائى|إعدادي|اعدادي|ثانوي|ثانوية)\s*-\s*/i,
                        ''
                    )
                : '';

            const scheduleLines = getScheduleLinesForItem(item);

            // Parsing happens after the line pairing above, so a marker such
            // as "PM" can only affect days from that same line.
            scheduleLines.forEach(scheduleLine => {
                parseGroupScheduleLines(scheduleLine).forEach(rule => {
                    expandedSlots.push({
                        day: rule.day,
                        timeLabel: formatHourTo12h(rule.hour),
                        hour24: rule.hour,
                        group: groupText,
                        grade
                    });
                });
            });
        });

        if (!expandedSlots.length) return '';

        const gradeNames = [...new Set(
            schedules.map(schedule => schedule.gradeName).filter(Boolean)
        )];
        const resolvedMapTitle = mapTitle || (
            gradeNames.length === 1
                ? `🗺️ خريطة مواعيد الصف ${gradeNames[0]}`
                : '🗺️ خريطة مواعيد كل المراحل الدراسية'
        );

        const hourSlotsMap = new Map();
        expandedSlots.forEach(slot => {
            if (!hourSlotsMap.has(slot.timeLabel)) {
                hourSlotsMap.set(slot.timeLabel, slot.hour24);
            }
        });

        const activeHours = Array.from(hourSlotsMap.entries())
            .sort((a, b) => a[1] - b[1])
            .map(entry => entry[0]);

        /*
         * Keep the first (day) column stable and distribute the available
         * width evenly across the time columns. Explicit col widths are
         * important in RTL tables: the DOM order and the visual order must
         * stay identical in both Chromium print and html2canvas.
         */
        const timeColumnWidth = activeHours.length
            ? `${90 / activeHours.length}%`
            : '90%';
        const matrixColGroup = `
            <colgroup>
                <col class="matrix-day-col" style="width: 10%;">
                ${activeHours.map(() => `
                    <col class="matrix-time-col" style="width: ${timeColumnWidth};">
                `).join('')}
            </colgroup>
        `;

        const headerCols = activeHours.map(hour => `
            <th scope="col">${this.escapeHtml(hour)}</th>
        `).join('');

        const rowsHtml = daysOrder.map(day => {
            const cells = activeHours.map(hourLabel => {
                const matches = expandedSlots.filter(slot => (
                    slot.day === day &&
                    slot.timeLabel === hourLabel
                ));

                if (matches.length > 0) {
                    const cellContent = matches
                        .map(match => `
                            <div class="slot-card">
                                <div class="slot-group">
                                    ${this.escapeHtml(match.group)}
                                </div>

                                ${
                                    match.grade
                                        ? `
                                            <div class="slot-sub">
                                                (${this.escapeHtml(match.grade)})
                                            </div>
                                        `
                                        : ''
                                }
                            </div>
                        `)
                        .join('');

                    return `
                        <td class="matrix-slot matrix-slot-filled">
                            ${cellContent}
                        </td>
                    `;
                }

                return `
                    <td class="matrix-slot matrix-slot-empty">
                        —
                    </td>
                `;
            }).join('');

            return `
                <tr>
                    <th scope="row" class="matrix-day">${this.escapeHtml(day)}</th>

                    ${cells}
                </tr>
            `;
        }).join('');

        return `
            <div class="weekly-map-content matrix-pdf-container">
                <div class="map-header header-card">
                    <h1>${this.escapeHtml(resolvedMapTitle.replace(/^🗺️\s*/, ''))}</h1>
                    <p>توزيع الحصص والمجموعات حسب اليوم والساعة</p>
                </div>

                <table class="matrix-table" dir="rtl">
                    ${matrixColGroup}
                    <thead>
                        <tr>
                            <th scope="col" class="matrix-corner">اليوم \\ الساعة</th>

                            ${headerCols}
                        </tr>
                    </thead>

                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    buildSchedulePrintTemplate({ mode = 'PRINT_ALL' } = {}) {
        const esc = val => this.escapeHtml(val);
        const schedules = this.getFilteredSchedules ? this.getFilteredSchedules() : [];
        const activeStage = window.GlobalStageFilter?.getActiveStage?.() || null;
        const activeGrade = window.GlobalStageFilter?.getActiveGrade?.() ?? null;
        const selectedGradeOnly = Boolean(
            activeStage &&
            activeGrade !== null &&
            activeGrade !== undefined &&
            activeGrade !== '' &&
            activeGrade !== 'ALL'
        );
        const normalizedMode = selectedGradeOnly
            ? 'SELECTED_GRADE'
            : (mode === 'ALL' ? 'PRINT_ALL' : mode);
        const includeGradePages = normalizedMode !== 'MATRIX_ONLY';
        const includeMatrixPage =
            normalizedMode !== 'GRADES_ONLY' &&
            normalizedMode !== 'SELECTED_GRADE';
        const isLandscapeMode =
            selectedGradeOnly ||
            normalizedMode === 'MATRIX_ONLY' ||
            normalizedMode === 'PRINT_ALL';
        const isSinglePageMode =
            selectedGradeOnly ||
            normalizedMode === 'MATRIX_ONLY';
        const targetWidth = isLandscapeMode ? 1122 : 794;
        const formatScheduleRange = timeStr => {
            if (!timeStr) return '';

            return String(timeStr)
                .split(/\s*-\s*/)
                .map(time => formatScheduleTime(time))
                .join(' - ');
        };

        const stageWeights = {
            primary: 1,
            preparatory: 2,
            secondary: 3
        };
        const getStageWeight = (gradeName, stage) => {
            if (stageWeights[stage] !== undefined) return stageWeights[stage];

            const label = String(gradeName || '').toLowerCase();
            if (label.includes('ابتدائي') || label.includes('ابتدائى')) return 1;
            if (label.includes('إعدادي') || label.includes('اعدادي')) return 2;
            if (label.includes('ثانوي') || label.includes('ثانوى')) return 3;
            return 99;
        };

        /*
         * Build one entry per configured grade, even when that grade has no
         * saved slots yet. This gives the export a deterministic four-stage
        * layout instead of allowing missing data to collapse a page.
         */
        const scheduleGradeEntries = new Map();
        const scheduleContexts = this.getScheduleGradeContexts?.() || [];
        scheduleContexts.forEach(context => {
            scheduleGradeEntries.set(context.gradeKey, {
                stage: context.stage,
                stageName: context.stageName,
                grade: context.gradeIdx,
                gradeName: context.gradeName,
                schedules: []
            });
        });

        schedules.forEach(item => {
            const key = item.gradeKey || `${item.stage}:${item.grade}`;
            if (!scheduleGradeEntries.has(key)) {
                scheduleGradeEntries.set(key, {
                    stage: item.stage,
                    stageName: item.stageName,
                    grade: item.grade,
                    gradeName: item.gradeName || 'غير محدد',
                    schedules: []
                });
            }
            scheduleGradeEntries.get(key).schedules.push(item);
        });

        const sortedGradeEntries = Array.from(scheduleGradeEntries.values())
            .sort((entryA, entryB) => {
                const stageDifference =
                    getStageWeight(entryA.gradeName, entryA.stage) -
                    getStageWeight(entryB.gradeName, entryB.stage);
                if (stageDifference !== 0) return stageDifference;

                const gradeDifference =
                    (Number(entryA.grade) || 0) - (Number(entryB.grade) || 0);
                if (gradeDifference !== 0) return gradeDifference;

                return String(entryA.gradeName).localeCompare(
                    String(entryB.gradeName),
                    'ar'
                );
            });

        const renderGradeBlock = (entry, className = '') => `
            <div class="grade-schedule-block grade-block schedule-block ${className}">
                <h2 class="grade-schedule-title grade-title">
                    جدول مواعيد: ${esc(entry.gradeName)}
                </h2>
                <table class="print-table custom-table schedule-print-table grade-schedule-table">
                    <colgroup>
                        <col style="width: 18%;">
                        <col style="width: 20%;">
                        <col style="width: 22%;">
                        <col style="width: 40%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>اليوم</th>
                            <th>الموعد</th>
                            <th>القاعة</th>
                            <th>اسم المجموعة / ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entry.schedules.length
                            ? entry.schedules.map(item => `
                                <tr>
                                    <td>${esc(item.day)}</td>
                                    <td class="time-cell">${esc(formatScheduleRange(item.time))}</td>
                                    <td>${esc(item.hall || 'القاعة الرئيسية')}</td>
                                    <td>${esc([
                                        item.groupName,
                                        item.notes
                                    ].filter(Boolean).join(' / ') || '—')}</td>
                                </tr>
                            `).join('')
                            : `
                                <tr>
                                    <td colspan="4">لا توجد مواعيد مسجلة لهذا الصف</td>
                                </tr>
                            `}
                    </tbody>
                </table>
            </div>
        `;

        const getStageEntries = (stage, minGrade = 1, maxGrade = Infinity) =>
            sortedGradeEntries.filter(entry =>
                entry.stage === stage &&
                Number(entry.grade) >= minGrade &&
                Number(entry.grade) <= maxGrade
            );

        const renderStagePage = (title, entries, className = '') => `
            <div class="pdf-page page-container schedule-stage-page ${className}">
                <div class="header-card stage-page-header">
                    <h1>${esc(title)}</h1>
                </div>
                ${entries.length
                    ? entries.map(renderGradeBlock).join('')
                    : `
                        <div class="stage-empty-state">
                            لا توجد صفوف أو مواعيد محددة لهذه المرحلة
                        </div>
                    `}
            </div>
        `;

        const primaryPartOne = getStageEntries('primary', 1, 3);
        const primaryPartTwo = getStageEntries('primary', 4, 6);
        const preparatoryEntries = getStageEntries('preparatory', 1, 3);
        const secondaryEntries = getStageEntries('secondary', 1, 3);

        const weeklyMapTitle = '🗺️ خريطة مواعيد كل المراحل الدراسية';
        const selectedGradeEntry = selectedGradeOnly
            ? sortedGradeEntries.find(entry =>
                entry.stage === activeStage &&
                Number(entry.grade) === Number(activeGrade)
            )
            : null;
        const selectedGradePage = selectedGradeOnly
            ? `
                <div class="pdf-page page-container schedule-stage-page selected-grade-page">
                    <div class="header-card stage-page-header">
                        <h1>${esc(selectedGradeEntry?.gradeName || 'الصف المحدد حالياً')}</h1>
                    </div>
                    ${selectedGradeEntry
                        ? renderGradeBlock(selectedGradeEntry, 'selected-grade-block')
                        : `
                            <div class="stage-empty-state">
                                لا توجد مواعيد مسجلة لهذا الصف
                            </div>
                        `}
                </div>
            `
            : '';
        const template = document.createElement('div');

        template.id = 'schedulePrintTemplate';
        template.className = 'print-report-container student-list-pdf-host schedule-print-host';
        template.classList.toggle('selected-grade-only', selectedGradeOnly);
        template.classList.toggle(
            'matrix-only-mode',
            normalizedMode === 'MATRIX_ONLY'
        );
        template.dir = 'rtl';
        template.style.cssText = [
            'position:absolute',
            // Keep the render host in the layout tree. html2canvas can
            // measure an off-screen node inconsistently, especially while
            // Arabic fonts are still shaping.
            'left:0',
            'top:0',
            `width:${targetWidth}px`,
            `max-width:${targetWidth}px`,
            'box-sizing:border-box',
            // Override the generic student-list print host padding. The
            // schedule template owns its A4 margins inside each page.
            'margin:0',
            'padding:0',
            'page-break-after:avoid',
            'break-after:avoid',
            `height:${isSinglePageMode ? '794px' : 'auto'}`,
            `min-height:${isSinglePageMode ? '0' : '1122px'}`,
            'display:block',
            'visibility:visible',
            // Keep the temporary host invisible to the user. The html2canvas
            // clone is made opaque in onclone below.
            'opacity:0',
            `overflow:${isSinglePageMode ? 'hidden' : 'visible'}`,
            'background:#ffffff',
            'color:#0f172a',
            'z-index:2147483647',
            'pointer-events:none',
            'font-family:Cairo, Tajawal, Arial, sans-serif',
            'text-rendering:optimizeLegibility',
            'font-kerning:normal',
            'font-synthesis:none',
            'letter-spacing:normal',
            'word-spacing:normal'
        ].join(';');

        template.innerHTML = `
            <style>
                :root {
                    --ink: #172033;
                    --muted: #64748b;
                    --line: #d9e1ef;
                    --violet: #6d28d9;
                    --violet-dark: #4c1d95;
                    --violet-soft: #f5f3ff;
                    --cyan-soft: #ecfeff;
                }

                * {
                    box-sizing: border-box;
                }

                .schedule-print-document {
                    width: 100%;
                    min-height: 1122px;
                    margin: 0;
                    padding: 0;
                    page-break-after: avoid;
                    break-after: avoid;
                    background: #ffffff;
                    color: var(--ink);
                    font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                }

                /*
                 * Each report section owns one printable A4 canvas. The
                 * fixed pixel height is used by the direct PDF rasterizer;
                 * the print-specific rule below maps it to the A4 content
                 * height after the requested page margins are applied.
                 */
                .pdf-page,
                .page-container {
                    display: block;
                    width: 100%;
                    min-height: 1122px;
                    /* 10mm vertical / 12mm horizontal A4 margins at 96dpi. */
                    padding: 24px 34px;
                    background: #ffffff;
                }

                .pdf-page {
                    page-break-after: always;
                    break-after: page;
                }

                .pdf-page:last-child {
                    page-break-after: avoid;
                    break-after: avoid;
                }

                .schedule-stage-page {
                    overflow: visible;
                }

                /*
                 * A selected grade is rendered as one A4 landscape page.
                 * Keep its capture bounds at 1122 × 794px; the generic
                 * portrait min-height would otherwise create a second,
                 * mostly blank landscape slice in the raster PDF.
                 */
                .schedule-print-host.selected-grade-only .pdf-page,
                .schedule-print-host.selected-grade-only .page-container {
                    width: 100% !important;
                    height: 794px !important;
                    min-height: 794px !important;
                    max-height: 794px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }

                .schedule-print-host.selected-grade-only,
                .schedule-print-host.matrix-only-mode {
                    height: 794px !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }

                .schedule-print-host.selected-grade-only .schedule-print-document {
                    min-height: 0 !important;
                    height: 794px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }

                .stage-page-header {
                    margin-bottom: 12px;
                    padding: 10px 14px;
                    border-radius: 10px;
                }

                .stage-page-header h1 {
                    font-size: 1.1rem;
                    line-height: 1.3;
                }

                .weekly-map-content {
                    margin-top: 0;
                }

                .header-card {
                    position: relative;
                    overflow: hidden;
                    margin-bottom: 20px;
                    padding: 22px 24px;
                    border: 1px solid #ddd6fe;
                    border-radius: 18px;
                    background:
                        radial-gradient(circle at 12% 10%, rgba(139, 92, 246, 0.2), transparent 34%),
                        linear-gradient(135deg, #ffffff 0%, #faf5ff 58%, #eef2ff 100%);
                    box-shadow: 0 10px 24px rgba(76, 29, 149, 0.08);
                    text-align: right;
                }

                .header-card::after {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    right: 0;
                    width: 5px;
                    content: '';
                    background: linear-gradient(180deg, #7c3aed, #06b6d4);
                }

                .header-card-kicker {
                    margin-bottom: 5px;
                    color: var(--violet);
                    font-size: 0.72rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                }

                .header-card h1,
                .header-card h2 {
                    margin: 0;
                    color: var(--ink);
                    font-size: 1.55rem;
                    font-weight: 800;
                    line-height: 1.35;
                }

                .header-card p {
                    margin: 7px 0 0;
                    color: var(--muted);
                    font-size: 0.82rem;
                }

                .header-card-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px 20px;
                    margin-top: 14px;
                    padding-top: 12px;
                    border-top: 1px solid #e9d5ff;
                    color: var(--muted);
                    font-size: 0.76rem;
                }

                .header-card-meta strong {
                    color: var(--violet-dark);
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 9px;
                    margin-top: 18px;
                }

                .summary-card {
                    padding: 10px 8px;
                    border: 1px solid #ddd6fe;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.84);
                    text-align: center;
                }

                .summary-card span {
                    display: block;
                    color: var(--muted);
                    font-size: 0.68rem;
                }

                .summary-card strong {
                    display: block;
                    margin-top: 2px;
                    color: var(--violet-dark);
                    font-size: 1.12rem;
                    font-weight: 800;
                }

                .details-heading {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 12px;
                    margin: 0 0 12px;
                    padding: 0 10px 8px 0;
                    border-right: 4px solid #7c3aed;
                    border-bottom: 1px solid #e2e8f0;
                }

                .details-heading h2 {
                    margin: 0;
                    color: var(--ink);
                    font-size: 1.08rem;
                }

                .details-heading span {
                    color: var(--muted);
                    font-size: 0.72rem;
                }

                /*
                 * The shared print stylesheet cannot cross into the
                 * temporary print iframe, so keep the same pagination
                 * contract in the generated report as well.
                 */
                .grade-schedule-block {
                    display: block;
                    margin-bottom: 12px;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                .grade-block {
                    margin-bottom: 12px;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                .schedule-block {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                .grade-title,
                .grade-schedule-title {
                    margin: 0 0 6px;
                    padding: 5px 10px;
                    border-right: 4px solid #4f46e5;
                    border-radius: 4px 0 0 4px;
                    background: #f1f5f9;
                    color: #1e293b;
                    font-size: 10pt;
                    font-weight: 700;
                    line-height: 1.25;
                    page-break-after: avoid;
                    break-after: avoid;
                }

                .custom-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    page-break-inside: auto;
                }

                .custom-table tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                .custom-table thead {
                    display: table-header-group;
                }

                .matrix-table {
                    width: 100%;
                    max-width: 100%;
                    border-collapse: collapse;
                    border-spacing: 0;
                    table-layout: fixed;
                    background: #ffffff;
                    direction: rtl;
                    margin-top: 10px;
                }

                table {
                    page-break-inside: auto;
                }

                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                thead {
                    display: table-header-group;
                }

                tbody {
                    page-break-inside: avoid;
                }

                .custom-table th,
                .custom-table td {
                    border: 1px solid #e2e8f0;
                    padding: 5px;
                    color: var(--ink);
                    font-size: 8.5pt;
                    line-height: 1.2;
                    text-align: center;
                    vertical-align: middle;
                }

                .custom-table th {
                    background: #334155;
                    color: #ffffff;
                    font-weight: 800;
                }

                .stage-empty-state {
                    padding: 16px;
                    border: 1px solid #cbd5e1;
                    color: #64748b;
                    text-align: center;
                    font-size: 9pt;
                }

                .custom-table tbody tr:nth-child(even) td {
                    background: #fafbff;
                }

                .custom-table tr,
                .matrix-table tr {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .weekly-map-page .header-card {
                    margin-bottom: 12px;
                    padding: 10px 14px;
                    border-radius: 10px;
                }

                .weekly-map-page .header-card h1 {
                    font-size: 1.1rem;
                    line-height: 1.3;
                }

                /*
                 * The matrix is rendered at the A4 landscape raster size:
                 * 1122px wide by 794px high. This keeps the canvas aspect
                 * ratio aligned with the landscape jsPDF page.
                 */
                @page matrix-landscape {
                    size: A4 landscape;
                    margin: 8mm 10mm;
                }

                .matrix-page {
                    width: 100% !important;
                    box-sizing: border-box;
                    direction: rtl !important;
                }

                .pdf-page.matrix-page,
                .pdf-page.matrix-pdf-page,
                .pdf-page.matrix-section {
                    width: 100% !important;
                    page: matrix-landscape;
                    page-break-before: always;
                    break-before: page;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    /*
                     * 1122px × 794px is the A4 landscape ratio used by the
                     * html2canvas raster path. Native print overrides this
                     * with the physical printable height below.
                     */
                    height: 794px;
                    min-height: 794px;
                    padding: 30px 27px;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    direction: rtl !important;
                }

                .matrix-page .weekly-map-content,
                .matrix-pdf-page .weekly-map-content,
                .matrix-section .weekly-map-content,
                .matrix-pdf-container {
                    width: 100%;
                    display: flex;
                    flex: 1 1 auto;
                    flex-direction: column;
                    min-height: 0;
                }

                .matrix-page .matrix-table,
                .matrix-pdf-page .matrix-table,
                .matrix-section .matrix-table {
                    width: 100% !important;
                    height: 85%;
                    flex: 1 1 auto;
                    min-height: 0;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    direction: rtl !important;
                }

                .matrix-table {
                    margin-top: 10px;
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    direction: rtl !important;
                }

                .matrix-table th,
                .matrix-table td {
                    border: 1px solid #cbd5e1 !important;
                    padding: 2px 1px !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    height: auto;
                    min-width: 0;
                    overflow: hidden;
                    word-break: normal !important;
                    overflow-wrap: normal !important;
                }

                .matrix-table thead th {
                    background: #1e1b4b;
                    color: #ffffff;
                    font-size: 8.5pt !important;
                    font-weight: 800;
                    line-height: 1.2;
                    padding: 8px 2px !important;
                    text-align: center;
                    white-space: nowrap;
                    vertical-align: middle;
                }

                .matrix-table tr {
                    height: 12%;
                }

                .matrix-table tbody tr {
                    height: 12%;
                }

                .matrix-table .matrix-corner {
                    width: 10%;
                    background: #312e81;
                    white-space: normal;
                }

                .matrix-table .matrix-day {
                    width: 10%;
                    background: #eef2ff;
                    color: var(--violet-dark);
                    font-size: 7.5pt;
                    font-weight: 800;
                    vertical-align: middle;
                }

                .matrix-slot {
                    color: #94a3b8;
                    font-size: 6.5pt;
                }

                .matrix-slot-empty {
                    background: #f8fafc;
                    vertical-align: middle !important;
                }

                .matrix-slot-filled {
                    background: linear-gradient(145deg, #f5f3ff, #ecfeff);
                }

                .slot-card {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    width: 98% !important;
                    max-width: 98%;
                    margin: 1px auto !important;
                    padding: 3px 1px !important;
                    background: #ffffff !important;
                    border: 1px solid #cbd5e1 !important;
                    border-right: 3px solid #4f46e5 !important;
                    border-radius: 4px !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    direction: rtl !important;
                    text-align: center !important;
                }

                .slot-card + .slot-card {
                    margin-top: 4px;
                    border-top: 1px solid #cbd5e1;
                }

                /*
                 * When several groups share one time slot, let their cards
                 * stack at natural height instead of forcing them to overlap.
                 */
                .matrix-slot-filled > .slot-card:not(:only-child) {
                    height: auto;
                }

                .slot-group {
                    display: block;
                    width: 100% !important;
                    margin-bottom: 0;
                    color: #0f172a !important;
                    font-size: 8pt !important;
                    font-weight: 800 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    direction: rtl !important;
                    unicode-bidi: embed !important;
                    text-align: center !important;
                }

                .slot-sub {
                    display: block;
                    width: 100% !important;
                    color: #4338ca !important;
                    font-size: 6.5pt !important;
                    font-weight: 700 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    margin-top: 1px !important;
                    direction: rtl !important;
                    unicode-bidi: embed !important;
                    text-align: center !important;
                }

                /* Force strictly one-page bounds for matrix-only exports. */
                .pdf-page.matrix-page,
                .matrix-pdf-container {
                    min-height: unset !important;
                    height: auto !important;
                    max-height: 100% !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                }

                /* Prevent the capture host from creating a trailing canvas page. */
                .schedule-print-host.matrix-only-mode {
                    min-height: 0 !important;
                    height: auto !important;
                }

                .schedule-print-host.matrix-only-mode .schedule-print-document {
                    min-height: 0 !important;
                    height: auto !important;
                }

                /* Force the matrix to occupy the full landscape page. */
                .pdf-page.matrix-page,
                .matrix-pdf-page {
                    height: 100% !important;
                    min-height: 100vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    box-sizing: border-box !important;
                    padding: 15mm !important;
                }

                .weekly-map-content {
                    display: flex !important;
                    flex-direction: column !important;
                    flex: 1 !important;
                    height: 100% !important;
                }

                .matrix-table {
                    width: 100% !important;
                    height: 100% !important;
                    flex: 1 !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    margin-top: 15px !important;
                }

                .matrix-table tbody {
                    height: 100% !important;
                }

                .matrix-table tr {
                    height: calc(100% / 7) !important;
                }

                .matrix-table thead tr {
                    height: auto !important;
                }

                .matrix-table tbody tr {
                    height: calc(100% / 7) !important;
                }

                .matrix-table td,
                .matrix-table th {
                    height: inherit !important;
                    padding: 4px !important;
                    vertical-align: middle !important;
                }

                /* Keep cards readable inside the expanded matrix cells. */
                .slot-card {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    width: 98% !important;
                    height: 88% !important;
                    margin: 0 auto !important;
                    padding: 2px 1px !important;
                    background: #ffffff !important;
                    border: 1px solid #cbd5e1 !important;
                    border-right: 3px solid #4f46e5 !important;
                    border-radius: 4px !important;
                    box-sizing: border-box !important;
                }

                .slot-group {
                    width: 100% !important;
                    color: #0f172a !important;
                    font-size: 8.5pt !important;
                    font-weight: 800 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    text-align: center !important;
                }

                .slot-sub {
                    width: 100% !important;
                    color: #4338ca !important;
                    font-size: 7pt !important;
                    font-weight: 700 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    text-align: center !important;
                    margin-top: 1px !important;
                }

                /*
                 * Definitive matrix page sizing: the matrix owns the full
                 * A4 landscape canvas and its table stretches with it.
                 */
                .pdf-page.matrix-page,
                .matrix-pdf-page,
                .matrix-pdf-container {
                    width: 100% !important;
                    height: 100% !important;
                    box-sizing: border-box !important;
                    padding: 10mm !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                }

                .matrix-table {
                    width: 100% !important;
                    height: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    margin-top: 10px !important;
                }

                .matrix-table th,
                .matrix-table td {
                    border: 1px solid #cbd5e1 !important;
                    padding: 2px !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                }

                .slot-card {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    width: 100% !important;
                    height: 94% !important;
                    margin: 0 !important;
                    padding: 1px 0px !important;
                    box-sizing: border-box !important;
                    border-radius: 3px !important;
                }

                .slot-group {
                    color: #0f172a !important;
                    font-size: 7.5pt !important;
                    font-weight: 800 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    width: 100% !important;
                    text-align: center !important;
                }

                .slot-sub {
                    color: #4338ca !important;
                    font-size: 6pt !important;
                    font-weight: 700 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    width: 100% !important;
                    text-align: center !important;
                    margin-top: 1px !important;
                }

                /*
                 * Final matrix text-fit pass: remove cell/card padding and
                 * clip only at the actual text boundary instead of adding a
                 * short ellipsis that hides the grade label.
                 */
                .matrix-table th,
                .matrix-table td {
                    padding: 1px !important;
                }

                .slot-card {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    width: 100% !important;
                    height: 95% !important;
                    margin: 0 !important;
                    padding: 2px 0px !important;
                    box-sizing: border-box !important;
                    border-radius: 3px !important;
                }

                .slot-group {
                    font-size: 7pt !important;
                    font-weight: 800 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: clip !important;
                    width: 100% !important;
                    text-align: center !important;
                }

                .slot-sub {
                    font-size: 5.8pt !important;
                    font-weight: 700 !important;
                    line-height: 1.1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: clip !important;
                    width: 100% !important;
                    text-align: center !important;
                    margin-top: 1px !important;
                }

                .header-card-kicker {
                    direction: rtl !important;
                    unicode-bidi: embed !important;
                }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                    }

                    @page selected-grade-schedule {
                        size: A4 landscape;
                        margin: 10mm;
                    }

                    .schedule-print-host.selected-grade-only {
                        page: selected-grade-schedule;
                        height: auto !important;
                        min-height: 0 !important;
                    }

                    .schedule-print-document {
                        width: 100% !important;
                        min-height: 0;
                    }

                    .schedule-print-host.selected-grade-only .schedule-print-document {
                        min-height: 0 !important;
                        height: auto !important;
                    }

                    .pdf-page,
                    .page-container {
                        min-height: calc(297mm - 20mm);
                        padding: 0;
                    }

                    .schedule-print-host.selected-grade-only .pdf-page,
                    .schedule-print-host.selected-grade-only .page-container {
                        width: 100% !important;
                        height: auto !important;
                        min-height: calc(210mm - 20mm) !important;
                        max-height: calc(210mm - 20mm) !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }

                    .schedule-print-host.selected-grade-only .stage-page-header {
                        margin-bottom: 6px;
                        padding: 8px 12px;
                    }

                    .schedule-print-host.selected-grade-only .stage-page-header h1 {
                        font-size: 16pt;
                    }

                    .schedule-print-host.selected-grade-only .grade-schedule-block {
                        margin-bottom: 0;
                    }

                    .schedule-print-host.selected-grade-only .grade-schedule-title {
                        margin-bottom: 4px;
                        padding: 4px 8px;
                        font-size: 10pt;
                    }

                    .schedule-print-host.selected-grade-only .custom-table th,
                    .schedule-print-host.selected-grade-only .custom-table td {
                        padding: 4px;
                        font-size: 8.5pt;
                        line-height: 1.15;
                    }

                    .schedule-print-host.selected-grade-only .pdf-page:not(.selected-grade-page),
                    .schedule-print-host.selected-grade-only .matrix-page,
                    .schedule-print-host.selected-grade-only .stage-empty-state {
                        display: none !important;
                    }

                    .pdf-page.matrix-page,
                    .pdf-page.matrix-pdf-page,
                    .pdf-page.matrix-section {
                        width: 100% !important;
                        height: calc(210mm - 16mm);
                        min-height: calc(210mm - 16mm);
                        padding: 8mm 10mm;
                        direction: rtl !important;
                    }

                    .weekly-map-content {
                        margin-top: 0;
                    }
                }
            </style>

            <div class="schedule-print-document">
                ${selectedGradeOnly
                    ? selectedGradePage
                    : includeGradePages ? `
                    ${renderStagePage(
                        'جدول المراحل الدراسية - المرحلة الابتدائية (1 - 3)',
                        primaryPartOne,
                        'primary-page primary-part-one'
                    )}
                    ${renderStagePage(
                        'جدول المراحل الدراسية - المرحلة الابتدائية (4 - 6)',
                        primaryPartTwo,
                        'primary-page primary-part-two'
                    )}
                    ${renderStagePage(
                        'جدول المراحل الدراسية - المرحلة الإعدادية',
                        preparatoryEntries,
                        'preparatory-page'
                    )}
                    ${renderStagePage(
                        'جدول المراحل الدراسية - المرحلة الثانوية',
                        secondaryEntries,
                        'secondary-page'
                    )}
                ` : ''}
                ${includeMatrixPage ? `
                <div class="pdf-page page-container matrix-page matrix-pdf-page matrix-section weekly-map-page">
                        ${this.buildWeeklyMatrixGrid(schedules, weeklyMapTitle) || `
                            <div class="map-header header-card dark">
                                <h1>خريطة مواعيد كل المراحل الدراسية</h1>
                            </div>
                            <div class="stage-empty-state">لا توجد مواعيد لإنشاء الخريطة الأسبوعية</div>
                        `}
                    </div>
                ` : ''}
            </div>
        `;

        return template;
    },

    printScheduleOnly(options = {}) {
        const template = this.buildSchedulePrintTemplate(options);
        const selectedGradeOnly = template.classList.contains('selected-grade-only');
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.title = 'طباعة جدول المواعيد';
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>جدول المواعيد الأسبوعي</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;700&display=swap');
                    @page { size: A4 portrait; margin: 10mm 12mm; }
                    @page selected-grade-schedule { size: A4 landscape; margin: 10mm; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif; margin: 0; padding: 0; color: #000; }
                    body > div { width: 100% !important; max-width: 100% !important; }
                    .schedule-print-document { width: 100% !important; }
                    .schedule-print-host.selected-grade-only { page: selected-grade-schedule; }
                    .pdf-page {
                        display: block;
                        width: 100%;
                        page-break-after: always;
                        break-after: page;
                    }
                    .pdf-page:last-child {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .schedule-print-host.selected-grade-only .pdf-page {
                        height: auto !important;
                        min-height: calc(210mm - 20mm) !important;
                        max-height: calc(210mm - 20mm) !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    .schedule-print-host.selected-grade-only .pdf-page:not(.selected-grade-page),
                    .schedule-print-host.selected-grade-only .matrix-page,
                    .schedule-print-host.selected-grade-only .stage-empty-state {
                        display: none !important;
                    }
                    .schedule-print-host.selected-grade-only .stage-page-header {
                        margin-bottom: 6px;
                        padding: 8px 12px;
                    }
                    .schedule-print-host.selected-grade-only .grade-schedule-block {
                        margin-bottom: 0;
                    }
                    .schedule-print-host.selected-grade-only .grade-schedule-title {
                        margin-bottom: 4px;
                        padding: 4px 8px;
                    }
                    .schedule-print-host.selected-grade-only .custom-table th,
                    .schedule-print-host.selected-grade-only .custom-table td {
                        padding: 4px;
                        font-size: 8.5pt;
                        line-height: 1.15;
                    }
                    .weekly-map-content {
                        margin-top: 0;
                    }
                    @page matrix-landscape {
                        size: A4 landscape;
                        margin: 8mm 10mm;
                    }
                    .matrix-page {
                        width: 100% !important;
                        box-sizing: border-box;
                        direction: rtl !important;
                    }
                    .pdf-page.matrix-page,
                    .pdf-page.matrix-pdf-page,
                    .pdf-page.matrix-section {
                        width: 100% !important;
                        page: matrix-landscape;
                        page-break-before: always;
                        break-before: page;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        height: calc(210mm - 16mm);
                        min-height: calc(210mm - 16mm);
                        display: flex;
                        flex-direction: column;
                        direction: rtl !important;
                    }
                    .matrix-page .weekly-map-content,
                    .matrix-pdf-page .weekly-map-content,
                    .matrix-section .weekly-map-content,
                    .matrix-pdf-container {
                        width: 100% !important;
                        display: flex;
                        flex: 1 1 auto;
                        flex-direction: column;
                        min-height: 0;
                    }
                    .matrix-page .matrix-table,
                    .matrix-pdf-page .matrix-table,
                    .matrix-section .matrix-table {
                        width: 100% !important;
                        height: 85%;
                        flex: 1 1 auto;
                        min-height: 0;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        direction: rtl !important;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
                    th { background-color: #ede9fe; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    thead { display: table-header-group; }
                    tbody { page-break-inside: avoid; }
                    .custom-table {
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: auto;
                    }
                    .custom-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .custom-table thead { display: table-header-group; }
                    .schedule-table td.time-cell,
                    .grade-schedule-table td.time-cell {
                        direction: rtl !important;
                        white-space: nowrap;
                        text-align: center;
                        font-weight: 600;
                    }
                    .matrix-table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        direction: rtl !important;
                    }
                    .schedule-print-table { page-break-inside: auto; }
                    .grade-schedule-block {
                        display: block;
                        margin-bottom: 12px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .grade-block {
                        margin-bottom: 12px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .schedule-block {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .grade-schedule-title {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .grade-schedule-table {
                        page-break-inside: auto;
                        break-inside: auto;
                    }
                    .grade-schedule-table tbody tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .schedule-checklist-table { page-break-inside: avoid; }
                </style>
            </head>
            <body>${template.innerHTML}</body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 1000);
        }, 300);
    },

    async downloadSchedulePDFOnly(mode = 'PRINT_ALL') {
        if (typeof window.html2canvas !== 'function') {
            alert('مكتبة رسم PDF غير محملة.');
            this.printScheduleOnly({ mode });
            return false;
        }

        const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
        if (typeof jsPDFConstructor !== 'function') {
            alert('مكتبة إنشاء PDF غير محملة.');
            this.printScheduleOnly({ mode });
            return false;
        }

        const template = this.buildSchedulePrintTemplate({ mode });
        const selectedGradeOnly = template.classList.contains('selected-grade-only');
        const isLandscapeMode =
            selectedGradeOnly ||
            mode === 'MATRIX_ONLY' ||
            mode === 'PRINT_ALL';
        const targetWidth = isLandscapeMode ? 1122 : 794;

        /*
         * Keep the schedule renderer's pagination policy explicit and
         * html2pdf-compatible. This project uses html2canvas + jsPDF
         * directly, so the avoid-all rule is enforced below by clipping
         * single-page canvases before they reach jsPDF.
         */
        const schedulePdfOptions = {
            margin: [0, 0, 0, 0],
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy']
            }
        };
        const forceSinglePageClip =
            schedulePdfOptions.pagebreak.mode.includes('avoid-all') &&
            (mode === 'MATRIX_ONLY' || selectedGradeOnly);

        // Keep the html2canvas viewport and the temporary render host aligned
        // with the widest page included in this export.
        template.style.width = `${targetWidth}px`;
        template.style.maxWidth = `${targetWidth}px`;

        window.ModalManager?.open('printLoadingModal');

        try {
            document.body.appendChild(template);
            if (this.waitForArabicFonts) await this.waitForArabicFonts();
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));

            const canvas = await window.html2canvas(template, {
                backgroundColor: '#ffffff',
                // Render at a high density, then place the bitmap in jsPDF.
                // jsPDF never receives Arabic text, so it cannot reverse or
                // detach the glyphs.
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                letterRendering: false,
                foreignObjectRendering: false,
                enableCORS: true,
                width: isLandscapeMode ? 1122 : 794,
                windowWidth: isLandscapeMode ? 1122 : 794,
                scrollX: 0,
                scrollY: 0,
                onclone: clonedDocument => {
                    const clonedTemplate =
                        clonedDocument.getElementById('schedulePrintTemplate');
                    if (!clonedTemplate) return;

                    clonedTemplate.style.display = 'block';
                    clonedTemplate.style.visibility = 'visible';
                    clonedTemplate.style.opacity = '1';
                    clonedTemplate.style.position = 'absolute';
                    clonedTemplate.style.left = '0';
                    clonedTemplate.style.top = '0';
                    clonedTemplate.style.zIndex = '0';
                    clonedTemplate.style.direction = 'rtl';
                    clonedTemplate.style.fontFamily =
                        "'Cairo', 'Tajawal', Arial, sans-serif";
                    clonedTemplate.style.textRendering = 'optimizeLegibility';
                    clonedTemplate.style.fontKerning = 'normal';
                    clonedTemplate.style.fontSynthesis = 'none';
                    clonedTemplate.style.letterSpacing = 'normal';
                    clonedTemplate.style.wordSpacing = 'normal';
                    clonedTemplate.style.margin = '0';
                    clonedTemplate.style.padding = '0';
                    clonedTemplate.style.pageBreakAfter = 'avoid';
                    clonedTemplate.style.breakAfter = 'avoid';

                    clonedTemplate
                        .querySelectorAll('.slot-card, .slot-group, .slot-sub')
                        .forEach(element => {
                            element.style.direction = 'rtl';
                            element.style.unicodeBidi = 'embed';
                            element.style.transform = 'none';
                        });
                }
            });
            /*
             * html2canvas does not apply print fragmentation rules when it
             * rasterizes a screen DOM. Use the actual .pdf-page bounds as
             * explicit PDF page ranges so the five requested pages remain
             * isolated and the weekly map cannot be merged into page 4.
             */
            const templateRect = template.getBoundingClientRect();
            const canvasScale = templateRect.width
                ? canvas.width / templateRect.width
                : 1;
            const pageRanges = [...template.querySelectorAll('.pdf-page')]
                .map(pageContainer => {
                    const rect = pageContainer.getBoundingClientRect();
                    const orientation = (
                        selectedGradeOnly ||
                        mode === 'MATRIX_ONLY' ||
                        pageContainer.classList.contains('matrix-page') ||
                        pageContainer.classList.contains('matrix-pdf-page') ||
                        pageContainer.classList.contains('matrix-section')
                    )
                        ? 'landscape'
                        : 'portrait';
                    const pageWidthMm = orientation === 'landscape' ? 297 : 210;
                    const pageHeightMm = orientation === 'landscape' ? 210 : 297;
                    return {
                        start: Math.max(
                            0,
                            Math.round((rect.top - templateRect.top) * canvasScale)
                        ),
                        end: Math.min(
                            canvas.height,
                            Math.round((rect.bottom - templateRect.top) * canvasScale)
                        ),
                        orientation,
                        sourcePageHeight: Math.max(
                            1,
                            Math.floor(canvas.width * pageHeightMm / pageWidthMm)
                        )
                    };
                })
                .filter(range => range.end > range.start);

            /*
             * The direct PDF path is rasterized by html2canvas, so browser
             * print fragmentation rules are not applied automatically. If a
             * page-height slice would cross a grade block, end that slice
             * before the block and let the block begin at the next PDF page.
             * A block taller than one page is allowed to continue normally;
             * it cannot be made atomic without overflowing the page itself.
             */
            const scheduleBlocks = [...template.querySelectorAll('.grade-schedule-block')]
                .map(block => {
                    const rect = block.getBoundingClientRect();
                    return {
                        start: Math.max(
                            0,
                            Math.round((rect.top - templateRect.top) * canvasScale)
                        ),
                        end: Math.min(
                            canvas.height,
                            Math.round((rect.bottom - templateRect.top) * canvasScale)
                        )
                    };
                })
                .filter(block => block.end > block.start)
                .sort((a, b) => a.start - b.start);

            const splitRangeAtScheduleBlocks = range => {
                const blocksInRange = scheduleBlocks.filter(block =>
                    block.start >= range.start && block.end <= range.end
                );
                const splitRanges = [];
                let start = range.start;

                while (start < range.end) {
                    const pageEnd = Math.min(
                        start + range.sourcePageHeight,
                        range.end
                    );
                    const crossingBlock = blocksInRange.find(block =>
                        block.start > start &&
                        block.start < pageEnd &&
                        block.end > pageEnd
                    );
                    const end = crossingBlock ? crossingBlock.start : pageEnd;

                    splitRanges.push({
                        ...range,
                        start,
                        end
                    });
                    start = end;
                }

                return splitRanges;
            };

            let rangesToRender = (pageRanges.length
                ? pageRanges
                : [{
                    start: 0,
                    end: canvas.height,
                    orientation: 'portrait',
                    sourcePageHeight: Math.max(
                        1,
                        Math.floor(canvas.width * 297 / 210)
                    )
                }]
            ).flatMap(splitRangeAtScheduleBlocks);

            /*
             * Keep a defensive fallback for browsers that report an invalid
             * layout range after cloning the temporary template.
             */
            if (!rangesToRender.length && canvas.height > 0) {
                rangesToRender.push({
                    start: 0,
                    end: canvas.height,
                    orientation: 'portrait',
                    sourcePageHeight: Math.max(
                        1,
                        Math.floor(canvas.width * 297 / 210)
                    )
                });
            }

            /*
             * MATRIX_ONLY is a single landscape canvas. Do not feed the
             * generic page slicer a second inferred range from the host's
             * remaining layout height.
             */
            if (forceSinglePageClip) {
                const singlePageOrientation = 'landscape';
                const singlePageHeight = Math.max(
                    1,
                    Math.floor(
                        canvas.width *
                        (singlePageOrientation === 'landscape' ? 210 : 297) /
                        (singlePageOrientation === 'landscape' ? 297 : 210)
                    )
                );
                rangesToRender = [{
                    start: 0,
                    // A single-page export must never pass the host's
                    // overflow height to jsPDF as a second blank slice.
                    end: Math.min(canvas.height, singlePageHeight),
                    orientation: singlePageOrientation,
                    sourcePageHeight: singlePageHeight
                }];
            }

            /*
             * MATRIX_ONLY must initialize jsPDF itself in landscape. CSS
             * named pages control native printing, but cannot change the
             * orientation of an already-created jsPDF document.
             */
            const initialOrientation = mode === 'MATRIX_ONLY'
                ? 'landscape'
                : (rangesToRender[0]?.orientation || 'portrait');
            const pdf = new jsPDFConstructor({
                orientation: initialOrientation,
                unit: 'mm',
                format: 'a4'
            });
            let pageIndex = 0;

            const addCanvasSlice = (
                offsetY,
                requestedHeight,
                orientation = 'portrait'
            ) => {
                const isLandscape = orientation === 'landscape';
                const pageWidthMm = isLandscape ? 297 : 210;
                const pageHeightMm = isLandscape ? 210 : 297;
                const sourcePageHeight = Math.max(
                    1,
                    Math.floor(canvas.width * pageHeightMm / pageWidthMm)
                );
                let remainingHeight = requestedHeight;

                while (remainingHeight > 0) {
                    const sliceHeight = Math.min(sourcePageHeight, remainingHeight);
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = sliceHeight;
                    const pageContext = pageCanvas.getContext('2d');
                    pageContext.fillStyle = '#ffffff';
                    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                    pageContext.drawImage(
                        canvas,
                        0, offsetY, canvas.width, sliceHeight,
                        0, 0, pageCanvas.width, pageCanvas.height
                    );

                    if (pageIndex > 0) {
                        pdf.addPage('a4', orientation);
                    }
                    pdf.addImage(
                        pageCanvas.toDataURL('image/jpeg', 0.95),
                        'JPEG',
                        0,
                        0,
                        pageWidthMm,
                        (sliceHeight / canvas.width) * pageWidthMm
                    );
                    pageCanvas.width = 0;
                    pageCanvas.height = 0;
                    offsetY += sliceHeight;
                    remainingHeight -= sliceHeight;
                    pageIndex += 1;
                }
            };

            rangesToRender.forEach(range => {
                addCanvasSlice(
                    range.start,
                    range.end - range.start,
                    range.orientation
                );
            });

            /*
             * Keep a defensive fallback for browsers that report no bounds
             * for the temporary template. This branch is normally bypassed
             * because the page-container ranges above are always present.
             */
            if (!pageIndex && canvas.height > 0) {
                addCanvasSlice(0, canvas.height, 'portrait');
            }

            pdf.save(this.generateFilename('schedule'));
            return true;
        } catch (error) {
            alert('تعذر تنزيل PDF: ' + (error && error.message ? error.message : error));
            return false;
        } finally {
            template.remove();
            window.ModalManager?.close('printLoadingModal');
        }
    },

    downloadSchedulePDF() {
        return this.downloadSchedulePDFOnly();
    },

    async exportCurrentView(targetType = null, exportContext = null) {
        const prepared = await this.prepareExportView(targetType, exportContext);
        if (!prepared) return;

        this.openPrintPreview(prepared.tableContainer, prepared.activeView);
    },

    prepareCurrentView(exportContext = null) {
        const currentView = this.getActiveViewInfo();
        if (!currentView) return;
        const isExpelledStudentsExport = exportContext?.targetType === 'expelled-students';
        const activeView = isExpelledStudentsExport
            ? {
                containerId: 'expelledStudentsTableContainer',
                type: 'expelledStudents',
                orientation: 'portrait',
                title: exportContext.title,
                exportContext
            }
            : currentView;

        // 1. Isolation Phase: Identify the target table container
        const tableContainer = document.getElementById(activeView.containerId);
        if (!tableContainer) {
            alert('عذراً، تعذر العثور على محتوى الجدول للطباعة.');
            return;
        }

        // 2. Data Preparation
        const teacherName = window.Auth.getTeacherName();
        const stage = window.GlobalStageFilter.getActiveStage();
        const grade = window.GlobalStageFilter.getActiveGrade();
        // Use 'ar-EG-u-nu-latn' to keep Arabic names but force standard numerals (123)
        const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        const students = window.StudentStore.getStudents(stage, grade).filter(s => s.name);
        const stats = this.calculateSummaryStats(activeView.type, stage, grade, students);

        let docTitle = this.getDocTitle(activeView);
        let subTitle = this.getSubTitle(stage, grade);

        // 3. Official Elements Update (Standardizing numerals for report)
        document.getElementById('printTeacherName').textContent = teacherName;
        document.getElementById('footerTeacherName').textContent = "بواسطة: " + teacherName;
        document.getElementById('printDocumentTitle').textContent = docTitle;
        
        const printTime = window.AppUtils.formatTime12h(new Date());
        document.getElementById('printDate').textContent = `${today} (الساعة: ${printTime})`;
        document.getElementById('printSubTitle').textContent = subTitle;
        
        const iconEl = document.getElementById('printAcademyIcon');
        const userIcon = localStorage.getItem('academy_icon_class') || 'fa-graduation-cap';
        if (iconEl) iconEl.className = `fas ${userIcon}`;

        // Enhanced Tiled Watermark (Dynamic text generation via CSS variable)
        const watermarkContainer = document.getElementById('printWatermark');
        if (watermarkContainer) {
            watermarkContainer.style.setProperty('--watermark-text', `"${teacherName}"`);
        }

        // Standardize numeral output in stats
        document.getElementById('printStatTotalStudents').textContent = window.AppUtils.formatNumber(stats.totalStudents);
        document.getElementById('printStatFinancial').textContent = stats.financial;
        document.getElementById('printStatPerformance').textContent = stats.performance;
        document.getElementById('printStatFlagged').textContent = window.AppUtils.formatNumber(stats.flagged);

        // 4. Page Calculation Logic
        this.updatePrintPageNumbers(tableContainer);

        // 5. Smart Column Hiding (If columns are entirely empty in current filtered view)
        this.applySmartColumnHiding(tableContainer);

        // 6. Input Sync
        this.syncInputValues();

        return { tableContainer, activeView };
    },

    async prepareExportView(targetType = null, exportContext = null) {
        if (targetType === 'student-list' && this.getActiveViewInfo()?.type !== 'students') {
            alert('يرجى فتح قائمة الطلاب أولاً قبل تصديرها.');
            return null;
        }
        if (targetType === 'unpaid-students' && this.getActiveViewInfo()?.type !== 'nonPayers') {
            alert('يرجى فتح قائمة الممتنعين عن الدفع أولاً قبل تصديرها.');
            return null;
        }
        if (targetType === 'group-session-attendance' && this.getActiveViewInfo()?.type !== 'groupSessionAttendance') {
            alert('يرجى فتح أرشيف حضور المجموعات أولاً قبل تصديره.');
            return null;
        }
        if (targetType === 'repeated-absence' && this.getActiveViewInfo()?.type !== 'repeatedAbsence') {
            alert('يرجى فتح صفحة الغياب المتكرر أولاً قبل تصديرها.');
            return null;
        }
        if (targetType === 'expelled-students' && (
            this.getActiveViewInfo()?.type !== 'repeatedAbsence'
            || !exportContext
            || !Array.isArray(exportContext.data)
        )) {
            alert('يرجى فتح نافذة الطلاب المطرودين أولاً قبل تصديرها.');
            return null;
        }
        if (targetType === 'exam-grades' && this.getActiveViewInfo()?.type !== 'examGrades') {
            alert('يرجى فتح شاشة رصد درجات الطلاب أولاً قبل تصديرها.');
            return null;
        }

        const prepared = this.prepareCurrentView(exportContext);
        if (!prepared) return null;

        // The student list can be redrawn after a search/filter action. Wait
        // for the actual table to settle before either printing or exporting.
        if (this.usesCleanTemplate(prepared.activeView)) {
            const tableReady = await this.waitForStudentTableReady(
                prepared.tableContainer,
                prepared.activeView
            );
            if (!tableReady) return null;

            // Recalculate the export state after the final DOM is available.
            this.applySmartColumnHiding(prepared.tableContainer);
            this.updatePrintPageNumbers(prepared.tableContainer);
            this.syncInputValues();
        }

        return prepared;
    },

    updatePrintPageNumbers(tableContainer) {
        // Calculate approximate total pages: cover page + table pages.
        const rowsPerPage = 22;
        const totalRows = tableContainer.querySelectorAll('tbody tr').length;
        const totalPagesCount = Math.max(1, Math.ceil(totalRows / rowsPerPage)) + 1;

        document.querySelectorAll('.page-number').forEach(el => {
            el.dataset.totalPages = totalPagesCount;
            el.innerHTML = `<span class="current-page-num"></span> من ${window.AppUtils.formatNumber(totalPagesCount)}`;
        });
    },

    async downloadCurrentView(targetType = null, exportContext = null) {
        if (targetType === 'student-codes') {
            return this.downloadStudentCodesView();
        }

        if (typeof window.html2canvas !== 'function') {
            alert('مكتبة رسم PDF غير محملة.');
            return false;
        }

        const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF
            ? window.jspdf.jsPDF
            : window.jsPDF;
        if (typeof jsPDFConstructor !== 'function') {
            alert('مكتبة إنشاء PDF غير محملة.');
            return false;
        }

        const prepared = await this.prepareExportView(targetType, exportContext);
        if (!prepared) return false;

        const { tableContainer, activeView } = prepared;
        let pdfHost = null;
        let template = null;
        window.ModalManager.open('printLoadingModal');

        try {
            this.preparePrintableTable(tableContainer);
            template = this.buildStudentListPDFHost(tableContainer, activeView);
            if (!template) return false;

            // Mount the hidden template briefly, then clone it with explicit
            // A4 pixel dimensions. Keeping the screen table out of the
            // capture avoids hidden/overflowing parents producing an empty
            // canvas.
            document.body.appendChild(template);
            const templateElement = document.getElementById('pdf-printable-container');
            pdfHost = this.mountPrintableTemplate(templateElement, 'student-list-pdf-render', activeView);

            await this.waitForPDFRender(pdfHost);
            await this.waitForArabicFonts();
            await this.saveStudentListPDF(
                pdfHost,
                activeView,
                jsPDFConstructor
            );

            return true;
        } catch (error) {
            alert('تعذر تنزيل PDF: ' + (error && error.message ? error.message : error));
            return false;
        } finally {
            if (pdfHost) pdfHost.remove();
            if (template) template.remove();
            this.cleanupPrintableTable(tableContainer);
            window.ModalManager.close('printLoadingModal');
        }
    },

    async downloadStudentCodesViewPaged() {
        const element = document.getElementById('printable-student-codes');
        const pagesRoot = document.getElementById('studentCodesPrintPages');
        const studentCodes = window.StudentCodes;

        if (!element || !pagesRoot || !studentCodes) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        if (typeof window.html2canvas !== 'function') {
            alert('مكتبة رسم PDF غير محملة.');
            return false;
        }

        const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
        if (typeof jsPDFConstructor !== 'function') {
            alert('مكتبة إنشاء PDF غير محملة.');
            return false;
        }

        const pendingIds = studentCodes.pendingPrintableIds || [];
        const printableIds = new Set(
            (
                pendingIds.length
                    ? pendingIds
                    : studentCodes.visibleStudents?.map(student => student.cardId) || []
            ).map(String)
        );
        const printableStudents = (studentCodes.visibleStudents || []).filter(student =>
            printableIds.has(String(student.cardId))
        );

        if (!printableStudents.length) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        const originalStyle = {
            display: element.style.display,
            width: element.style.width,
            minWidth: element.style.minWidth,
            maxWidth: element.style.maxWidth,
            margin: element.style.margin,
            padding: element.style.padding,
            backgroundColor: element.style.backgroundColor,
            color: element.style.color,
            fontFamily: element.style.fontFamily,
            direction: element.style.direction,
            textAlign: element.style.textAlign,
            letterSpacing: element.style.letterSpacing,
            wordSpacing: element.style.wordSpacing
        };

        studentCodes.renderPrintPages(printableStudents, printableIds);
        studentCodes.renderBarcodes(pagesRoot);

        element.classList.add('student-codes-pdf-capture');
        element.style.display = 'block';
        element.style.width = '794px';
        element.style.minWidth = '794px';
        element.style.maxWidth = '794px';
        element.style.margin = '0';
        element.style.padding = '0';
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#0f172a';
        element.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
        element.style.direction = 'rtl';
        element.style.textAlign = 'right';
        element.style.letterSpacing = 'normal';
        element.style.wordSpacing = 'normal';

        window.ModalManager.open('printLoadingModal');

        try {
            await this.waitForPDFRender(pagesRoot);
            await this.waitForArabicFonts();

            const pages = Array.from(
                pagesRoot.querySelectorAll('.student-codes-print-page')
            );
            if (!pages.length) {
                throw new Error('تعذر إنشاء صفحات بطاقات الطلاب.');
            }

            const pdf = new jsPDFConstructor({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                const rect = page.getBoundingClientRect();
                if (!rect.width || !rect.height) {
                    throw new Error('تعذر قياس صفحة بطاقات الطلاب.');
                }

                const canvas = await window.html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    letterRendering: false,
                    foreignObjectRendering: false,
                    backgroundColor: '#ffffff',
                    width: 794,
                    height: 1122,
                    windowWidth: 794,
                    windowHeight: 1122,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: clonedDocument => {
                        const clonedHead = clonedDocument.head;
                        if (clonedHead && !clonedHead.querySelector('meta[charset]')) {
                            const charset = clonedDocument.createElement('meta');
                            charset.setAttribute('charset', 'UTF-8');
                            clonedHead.prepend(charset);
                        }

                        const clonedHtml = clonedDocument.documentElement;
                        const clonedBody = clonedDocument.body;
                        [clonedHtml, clonedBody].forEach(node => {
                            if (!node) return;
                            node.setAttribute('dir', 'rtl');
                            node.setAttribute('lang', 'ar');
                            node.setAttribute('data-theme', 'light');
                            node.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
                            node.style.letterSpacing = 'normal';
                        });

                        const clonedPage = clonedDocument.querySelector(
                            `[data-page-index="${pageIndex}"]`
                        );
                        if (clonedPage) {
                            clonedPage.style.display = 'flex';
                            clonedPage.style.width = '794px';
                            clonedPage.style.height = '1122px';
                            clonedPage.style.minHeight = '1122px';
                            clonedPage.style.direction = 'rtl';
                            clonedPage.style.fontFamily =
                                "'Cairo', 'Tajawal', sans-serif";
                        }
                    }
                });

                if (!canvas.width || !canvas.height) {
                    throw new Error('تم إنشاء لوحة PDF فارغة.');
                }

                if (pageIndex > 0) {
                    pdf.addPage('a4', 'portrait');
                }

                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.98),
                    'JPEG',
                    0,
                    0,
                    210,
                    297,
                    undefined,
                    'FAST'
                );
            }

            const filename = (studentCodes.getPrintableTitle?.() || 'أكواد الطلاب')
                .replace(/[\\/:*?"<>|]/g, '-')
                .trim();
            pdf.save(`${filename || 'أكواد الطلاب'}.pdf`);
            return true;
        } catch (error) {
            alert('تعذر تنزيل PDF: ' + (error?.message || error));
            return false;
        } finally {
            element.classList.remove('student-codes-pdf-capture');
            Object.entries(originalStyle).forEach(([property, value]) => {
                element.style[property] = value;
            });
            studentCodes.renderPrintPages(studentCodes.visibleStudents);
            window.ModalManager.close('printLoadingModal');
        }
    },

    async downloadStudentCodesView() {
        return this.downloadStudentCodesViewPaged();
    },

    // Compatibility fallback retained for older callers.
    async downloadStudentCodesViewLegacy() {
        const element = document.getElementById('printable-student-codes');
        const studentCodes = window.StudentCodes;
        const sourceGrid = element?.querySelector('.student-codes-grid-printable');

        if (!element || !sourceGrid) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        if (typeof window.html2canvas !== 'function') {
            alert('مكتبة رسم PDF غير محملة.');
            return false;
        }

        const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF
            ? window.jspdf.jsPDF
            : window.jsPDF;
        if (typeof jsPDFConstructor !== 'function') {
            alert('مكتبة إنشاء PDF غير محملة.');
            return false;
        }

        const pendingIds = studentCodes?.pendingPrintableIds || [];
        const printableIds = new Set(
            (pendingIds.length
                ? pendingIds
                : studentCodes?.visibleStudents?.map(student => student.cardId)
                    || Array.from(sourceGrid.querySelectorAll('[data-student-id]'))
                        .map(card => card.dataset.studentId)
            ).map(String)
        );

        if (!printableIds.size) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        const printableTitle = studentCodes?.getPrintableTitle?.()
            || 'أكواد جميع الطلاب';
        const titleHeader = element.querySelector('.print-grade-title');
        const printHeader = element.querySelector('.student-codes-print-header');
        const originalElementStyle = {
            display: element.style.display,
            width: element.style.width,
            minWidth: element.style.minWidth,
            backgroundColor: element.style.backgroundColor,
            color: element.style.color,
            fontFamily: element.style.fontFamily,
            direction: element.style.direction,
            textAlign: element.style.textAlign,
            letterSpacing: element.style.letterSpacing,
            wordSpacing: element.style.wordSpacing
        };
        const originalHeaderStyle = printHeader
            ? {
                display: printHeader.style.display,
                visibility: printHeader.style.visibility
            }
            : null;
        const hiddenCards = [];

        const titleSpan = element.querySelector('#studentCodesPrintableGradeTitle');
        if (titleSpan) {
            titleSpan.textContent = printableTitle;
        } else if (titleHeader) {
            titleHeader.textContent = printableTitle;
        }
        if (printHeader) {
            printHeader.style.display = 'block';
            printHeader.style.visibility = 'visible';
        }

        element.style.display = 'block';
        element.style.width = '1050px';
        element.style.minWidth = '1050px';
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#000000';
        element.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
        element.style.direction = 'rtl';
        element.style.textAlign = 'right';
        element.style.letterSpacing = 'normal';
        element.style.wordSpacing = 'normal';

        sourceGrid.querySelectorAll(
            '.student-code-card[data-student-id]'
        ).forEach(card => {
            if (!printableIds.has(String(card.dataset.studentId))) {
                hiddenCards.push({
                    card,
                    display: card.style.display
                });
                card.style.display = 'none';
            }
        });

        window.ModalManager.open('printLoadingModal');

        try {
            await this.waitForPDFRender(element);
            await this.waitForArabicFonts();

            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                throw new Error('تعذر قياس حاوية أكواد الطلاب قبل إنشاء PDF.');
            }

            const canvas = await window.html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                letterRendering: true,
                foreignObjectRendering: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1200,
                windowHeight: 1122,
                onclone: clonedDocument => {
                    // Force the cloned document itself into light mode before
                    // html2canvas evaluates any theme-dependent selectors.
                    const clonedHtml = clonedDocument.documentElement;
                    const clonedBody = clonedDocument.body;

                    if (clonedHtml) {
                        clonedHtml.setAttribute('data-theme', 'light');
                        clonedHtml.classList.remove(
                            'dark',
                            'dark-mode',
                            'theme-dark'
                        );
                        clonedHtml.classList.add('light', 'light-mode');
                    }

                    if (clonedBody) {
                        clonedBody.setAttribute('data-theme', 'light');
                        clonedBody.classList.remove(
                            'dark',
                            'dark-mode',
                            'theme-dark',
                            'student-codes-print-mode'
                        );
                        clonedBody.classList.add('light', 'light-mode');
                    }

                    const clonedElement =
                        clonedDocument.getElementById('printable-student-codes');

                    if (!clonedElement) return;

                    clonedElement.classList.add('student-codes-pdf-capture');
                    clonedElement.style.display = 'block';
                    clonedElement.style.visibility = 'visible';
                    clonedElement.style.position = 'relative';
                    clonedElement.style.left = '0';
                    clonedElement.style.top = '0';
                    clonedElement.style.zIndex = '0';
                    clonedElement.style.setProperty('width', '1050px', 'important');
                    clonedElement.style.setProperty('min-width', '1050px', 'important');
                    clonedElement.style.setProperty('max-width', '1050px', 'important');
                    clonedElement.style.height = 'auto';
                    clonedElement.style.minHeight = '0';
                    clonedElement.style.backgroundColor = '#ffffff';
                    clonedElement.style.backgroundImage = 'none';
                    clonedElement.style.color = '#000000';
                    clonedElement.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
                    clonedElement.style.direction = 'rtl';
                    clonedElement.style.textAlign = 'right';
                    clonedElement.style.letterSpacing = 'normal';
                    clonedElement.style.wordSpacing = 'normal';

                    const clonedHeader =
                        clonedElement.querySelector('.student-codes-print-header');
                    if (clonedHeader) {
                        clonedHeader.style.display = 'block';
                        clonedHeader.style.visibility = 'visible';
                    }

                    const clonedGrid =
                        clonedElement.querySelector('.student-codes-grid-printable');
                    if (clonedGrid) {
                        clonedGrid.style.setProperty('display', 'grid', 'important');
                        clonedGrid.style.setProperty(
                            'grid-template-columns',
                            'repeat(3, 1fr)',
                            'important'
                        );
                        clonedGrid.style.setProperty('gap', '3.5mm', 'important');
                        clonedGrid.style.setProperty('width', '100%', 'important');
                        clonedGrid.style.setProperty('max-width', 'none', 'important');
                        clonedGrid.style.setProperty('padding', '0', 'important');
                        clonedGrid.style.setProperty('margin', '0', 'important');
                        clonedGrid.style.setProperty('direction', 'rtl', 'important');
                        clonedGrid.style.setProperty(
                            'background',
                            '#ffffff',
                            'important'
                        );
                    }

                    clonedElement.querySelectorAll(
                        '.student-code-card[data-student-id]'
                    ).forEach(card => {
                        card.style.display =
                            printableIds.has(String(card.dataset.studentId))
                                ? 'flex'
                                : 'none';
                        card.style.backgroundColor = '#ffffff';
                        card.style.backgroundImage = 'none';
                        card.style.color = '#000000';
                        card.style.border = '1.5px dashed #64748b';
                        card.style.outline = '1px solid #e2e8f0';
                        card.style.outlineOffset = '3px';
                        card.style.marginBottom = '5mm';
                        card.style.boxShadow = 'none';
                        card.style.setProperty('width', '100%', 'important');
                        card.style.setProperty('min-height', '0', 'important');
                        card.style.setProperty('height', '95mm', 'important');
                        card.style.setProperty('min-height', '95mm', 'important');
                        card.style.setProperty('padding', '4.5mm', 'important');
                        card.style.setProperty('overflow', 'visible', 'important');
                        card.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
                        card.style.direction = 'rtl';
                        card.style.textAlign = 'right';
                    });

                    clonedElement.querySelectorAll(
                        '.student-code-app-title, .student-code-teacher, ' +
                        '.student-code-label, .student-code-value, ' +
                        '.student-code-student-name, .student-code-card-footer, ' +
                        '.student-code-badge'
                    ).forEach(textElement => {
                        textElement.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
                        textElement.style.letterSpacing = 'normal';
                        textElement.style.wordSpacing = 'normal';
                        textElement.style.setProperty(
                            'color',
                            '#0f172a',
                            'important'
                        );
                        textElement.style.setProperty(
                            'text-shadow',
                            'none',
                            'important'
                        );
                    });

                    clonedElement.querySelectorAll(
                        '.student-code-barcode-container'
                    ).forEach(barcodeContainer => {
                        barcodeContainer.style.minHeight = '22mm';
                        barcodeContainer.style.height = 'auto';
                        barcodeContainer.style.padding = '2.5mm';
                        barcodeContainer.style.marginTop = '2mm';
                        barcodeContainer.style.overflow = 'visible';
                        barcodeContainer.style.backgroundColor = '#f8fafc';
                        barcodeContainer.style.border = '1px solid #cbd5e1';
                    });

                    clonedElement.querySelectorAll(
                        '.student-code-barcode'
                    ).forEach(barcode => {
                        barcode.style.width = '100%';
                        barcode.style.maxWidth = '180px';
                        barcode.style.height = '14mm';
                    });

                    clonedElement.querySelectorAll(
                        '.student-code-selection-control'
                    ).forEach(control => {
                        control.style.display = 'none';
                    });
                }
            });

            if (!canvas.width || !canvas.height) {
                throw new Error('تم إنشاء لوحة PDF فارغة.');
            }

            const pdf = new jsPDFConstructor({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });

            const marginMm = 10;
            const pageWidthMm = 210 - (marginMm * 2);
            const pageHeightMm = 297 - (marginMm * 2);
            const pageHeightPx = Math.max(
                1,
                Math.floor(canvas.width * pageHeightMm / pageWidthMm)
            );
            let pageIndex = 0;

            for (let offset = 0; offset < canvas.height; offset += pageHeightPx) {
                const sliceHeight = Math.min(
                    pageHeightPx,
                    canvas.height - offset
                );
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;

                const context = pageCanvas.getContext('2d');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                context.drawImage(
                    canvas,
                    0,
                    offset,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                if (pageIndex > 0) {
                    pdf.addPage('a4', 'portrait');
                }

                pdf.addImage(
                    pageCanvas.toDataURL('image/jpeg', 0.98),
                    'JPEG',
                    marginMm,
                    marginMm,
                    pageWidthMm,
                    sliceHeight * pageWidthMm / canvas.width,
                    undefined,
                    'FAST'
                );

                pageCanvas.width = 0;
                pageCanvas.height = 0;
                pageIndex += 1;
            }

            const filename = printableTitle
                .replace(/[\\/:*?"<>|]/g, '-')
                .trim();
            pdf.save(`${filename || 'أكواد الطلاب'}.pdf`);
            return true;
        } catch (error) {
            alert('تعذر تنزيل PDF: ' + (error?.message || error));
            return false;
        } finally {
            hiddenCards.forEach(({ card, display }) => {
                card.style.display = display;
            });

            element.style.display = originalElementStyle.display;
            element.style.width = originalElementStyle.width;
            element.style.minWidth = originalElementStyle.minWidth;
            element.style.backgroundColor = originalElementStyle.backgroundColor;
            element.style.color = originalElementStyle.color;
            element.style.fontFamily = originalElementStyle.fontFamily;
            element.style.direction = originalElementStyle.direction;
            element.style.textAlign = originalElementStyle.textAlign;
            element.style.letterSpacing = originalElementStyle.letterSpacing;
            element.style.wordSpacing = originalElementStyle.wordSpacing;

            if (printHeader && originalHeaderStyle) {
                printHeader.style.display = originalHeaderStyle.display;
                printHeader.style.visibility = originalHeaderStyle.visibility;
            }

            window.ModalManager.close('printLoadingModal');
        }
    },

    getStudentListCanvasOptions() {
        return {
            // A higher raster scale keeps browser-shaped Arabic glyphs sharp
            // when the page image is viewed or printed at 100%.
            scale: 3,
            useCORS: true,
            allowTaint: true,
            letterRendering: false,
            foreignObjectRendering: false,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794,
            windowHeight: 1122,
            scrollX: 0,
            scrollY: 0,
            onclone: clonedDocument => {
                // html2canvas clones the document before painting it. Force
                // only the export clone to be renderable; the live UI remains
                // untouched and the clone is discarded after capture.
                const clonedHost = clonedDocument.querySelector('.student-list-pdf-host');
                if (clonedHost) {
                    clonedHost.style.display = 'block';
                    clonedHost.style.visibility = 'visible';
                    clonedHost.style.opacity = '1';
                    clonedHost.style.position = 'absolute';
                    clonedHost.style.left = '0';
                    clonedHost.style.top = '0';
                    clonedHost.style.zIndex = '0';
                    clonedHost.style.width = '794px';
                    clonedHost.style.height = 'auto';
                    clonedHost.style.minHeight = '1122px';
                    clonedHost.style.backgroundColor = '#ffffff';
                }
            }
        };
    },

    inspectStudentExportTarget(tableContainer, pdfHost) {
        const table = tableContainer.querySelector('.students-data-container table.students-table');
        const exportTable = pdfHost.querySelector('table');
        const getRect = element => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        };

        const parentStates = [];
        let current = table;
        while (current) {
            const styles = getComputedStyle(current);
            parentStates.push({
                tag: current.tagName,
                id: current.id,
                className: typeof current.className === 'string' ? current.className : '',
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                overflow: styles.overflow,
                rect: getRect(current)
            });
            current = current.parentElement;
        }

        return {
            tableFound: !!table,
            exportTableFound: !!exportTable,
            rowCount: table ? table.querySelectorAll('tbody tr').length : 0,
            exportRowCount: exportTable ? exportTable.querySelectorAll('tbody tr').length : 0,
            textLength: table ? table.innerText.trim().length : 0,
            exportTextLength: exportTable ? exportTable.innerText.trim().length : 0,
            tableRect: getRect(table),
            exportTableRect: getRect(exportTable),
            parents: parentStates
        };
    },

    inspectPDFCanvas(canvas) {
        if (!canvas || !canvas.width || !canvas.height) {
            return { width: canvas?.width || 0, height: canvas?.height || 0, nonWhitePixels: 0 };
        }

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            return { width: canvas.width, height: canvas.height, nonWhitePixels: 0 };
        }

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let nonWhitePixels = 0;
        let nonTransparentPixels = 0;
        const step = 4;

        for (let index = 0; index < pixels.length; index += step * 4) {
            const alpha = pixels[index + 3];
            if (alpha > 0) nonTransparentPixels += 1;
            if (alpha > 0 && (
                pixels[index] !== 255 ||
                pixels[index + 1] !== 255 ||
                pixels[index + 2] !== 255
            )) {
                nonWhitePixels += 1;
            }
        }

        return {
            width: canvas.width,
            height: canvas.height,
            nonWhitePixels,
            nonTransparentPixels
        };
    },

    assertPDFCanvas(canvas, canvasDebug = this.inspectPDFCanvas(canvas)) {
        if (
            !canvas ||
            canvasDebug.width <= 0 ||
            canvasDebug.height <= 0 ||
            canvasDebug.nonWhitePixels <= 0
        ) {
            throw new Error('تم التقاط لوحة PDF فارغة رغم اكتمال جدول الطلاب.');
        }
    },

    createStudentListPDFPages(pdfHost, activeView) {
        const sourceTable = pdfHost.querySelector('.student-list-pdf-table');
        const sourceRows = Array.from(sourceTable?.querySelectorAll('tbody tr') || []);
        const sourceHeader = pdfHost.querySelector('.student-list-pdf-header');
        const sourceBanner = pdfHost.querySelector('.student-list-pdf-section-banner');
        const sourceWatermark = pdfHost.querySelector('.student-list-pdf-watermark');
        const sourceFooter = pdfHost.querySelector('.student-list-pdf-footer');
        const isLandscape = activeView?.orientation === 'landscape';
        const pageWidth = isLandscape ? 1122 : 794;
        const pageHeight = isLandscape ? 794 : 1122;

        if (!sourceTable || !sourceRows.length) {
            throw new Error('لم يتم العثور على صفوف قائمة الطلاب بعد اكتمال الرسم.');
        }

        const pagesRoot = document.createElement('div');
        pagesRoot.className = 'student-list-pdf-pages';
        pagesRoot.style.cssText = [
            'position:absolute',
            'left:0',
            'top:0',
            `width:${pageWidth}px`,
            'display:block',
            'visibility:visible',
            'opacity:1',
            'z-index:-9999',
            'pointer-events:none',
            'direction:rtl'
        ].join(';');

        /*
         * Build pages from measured rows instead of a fixed row count.
         * Twenty rows fit on an empty page, but the first page also contains
         * the report header and banner. A fixed count allowed the last rows
         * to run underneath the footer or past the page clip.
         */
        const pageParts = [];
        const pagePaddingBottom = 45;
        const footerGap = 8;
        let sourceRowIndex = 0;
        let pageIndex = 0;

        // Rows must be measured in an attached layout context.
        document.body.appendChild(pagesRoot);

        while (sourceRowIndex < sourceRows.length) {
            const page = document.createElement('div');
            page.id = `student-list-pdf-page-${pageIndex}`;
            page.className = 'student-list-pdf-host student-list-pdf-page student-list-page';
            page.dataset.pdfPageIndex = String(pageIndex);
            page.dir = 'rtl';
            page.style.cssText = [
                'position:relative',
                `width:${pageWidth}px`,
                `height:${pageHeight}px`,
                `min-height:${pageHeight}px`,
                `max-height:${pageHeight}px`,
                'padding:20px 20px 45px',
                'overflow:hidden',
                'display:block',
                'visibility:visible',
                'opacity:1',
                'background:#ffffff',
                'color:#0f172a',
                "font-family:'Cairo','Tajawal',Arial,sans-serif",
                'direction:rtl',
                'text-align:right',
                'unicode-bidi:embed',
                'letter-spacing:normal',
                'word-spacing:normal',
                'font-variant-ligatures:normal',
                'text-rendering:geometricPrecision',
                '-webkit-font-smoothing:antialiased'
            ].join(';');
            page.dataset.pdfOrientation = isLandscape ? 'landscape' : 'portrait';

            if (pageIndex === 0 && sourceHeader) {
                page.appendChild(sourceHeader.cloneNode(true));
            }
            if (sourceBanner) {
                page.appendChild(sourceBanner.cloneNode(true));
            }

            const table = sourceTable.cloneNode(false);
            const head = sourceTable.querySelector('thead');
            const foot = sourceTable.querySelector('tfoot');
            const body = document.createElement('tbody');
            if (head) table.appendChild(head.cloneNode(true));
            table.appendChild(body);
            if (foot) table.appendChild(foot.cloneNode(true));
            page.appendChild(table);

            if (sourceWatermark) {
                const watermark = sourceWatermark.cloneNode(true);
                watermark.style.display = 'flex';
                watermark.style.position = 'absolute';
                watermark.style.top = '50%';
                watermark.style.left = '50%';
                watermark.style.width = '100%';
                watermark.style.height = '100px';
                watermark.style.transform = 'translate(-50%, -50%) rotate(-30deg)';
                watermark.style.zIndex = '0';
                watermark.style.pointerEvents = 'none';
                watermark.style.alignItems = 'center';
                watermark.style.justifyContent = 'center';
                const watermarkText = watermark.querySelector('.watermark-text');
                if (watermarkText) {
                    watermarkText.style.color = 'rgba(148, 163, 184, 0.05)';
                    watermarkText.style.fontSize = '32px';
                    watermarkText.style.fontWeight = '800';
                }
                page.appendChild(watermark);
            }

            let footer = null;
            if (sourceFooter) {
                footer = sourceFooter.cloneNode(true);
                footer.classList.add('pdf-footer-container');
                footer.style.display = 'flex';
                footer.style.position = 'absolute';
                footer.style.right = '15mm';
                footer.style.bottom = '15mm';
                footer.style.left = '15mm';
                footer.style.width = 'auto';
                footer.style.zIndex = '2';
                footer.style.flexDirection = 'row';
                footer.style.justifyContent = 'space-between';
                footer.style.alignItems = 'center';
                footer.style.gap = '16px';
                footer.style.paddingTop = '8px';
                footer.style.borderTop = '1px solid #e9d5ff';
                footer.style.background = '#ffffff';
                footer.style.direction = 'ltr';
                page.appendChild(footer);
            }

            pagesRoot.appendChild(page);

            /*
             * Reserve the actual footer box plus a safety gap. If adding a
             * row would cross this boundary, remove that row and let the next
             * page start with it intact.
             */
            const pageRect = page.getBoundingClientRect();
            const footerRect = footer?.getBoundingClientRect();
            const footerTop = footerRect
                ? footerRect.top - pageRect.top
                : pageHeight - pagePaddingBottom;
            const safeBottom = Math.min(
                pageHeight - pagePaddingBottom,
                footerTop - footerGap
            );

            let rowsOnPage = 0;
            while (sourceRowIndex < sourceRows.length) {
                const row = sourceRows[sourceRowIndex].cloneNode(true);
                body.appendChild(row);
                const rowBottom = row.getBoundingClientRect().bottom - pageRect.top;

                if (rowsOnPage > 0 && rowBottom > safeBottom) {
                    row.remove();
                    break;
                }

                sourceRowIndex += 1;
                rowsOnPage += 1;
            }

            // Keep a single unusually tall row intact rather than creating an
            // empty page or getting stuck in the pagination loop.
            if (rowsOnPage === 0 && sourceRowIndex < sourceRows.length) {
                body.appendChild(sourceRows[sourceRowIndex].cloneNode(true));
                sourceRowIndex += 1;
            }

            pageParts.push({ page, footer });
            pageIndex += 1;
        }

        const totalPages = pageParts.length;
        pageParts.forEach(({ footer }, index) => {
            const currentPage = footer?.querySelector('.student-print-current-page');
            const totalPage = footer?.querySelector('.student-print-total-pages');
            if (currentPage) currentPage.textContent = String(index + 1);
            if (totalPage) totalPage.textContent = String(totalPages);
        });

        return { pagesRoot, pages: pageParts.map(({ page }) => page) };
    },

    getStudentListPageCanvasOptions(pageId, orientation = 'portrait') {
        const isLandscape = orientation === 'landscape';
        const pageWidth = isLandscape ? 1122 : 794;
        const pageHeight = isLandscape ? 794 : 1122;
        return {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            letterRendering: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: pageWidth,
            windowHeight: pageHeight,
            backgroundColor: '#ffffff',
            onclone: clonedDocument => {
                const clonedPage = clonedDocument.getElementById(pageId);
                if (clonedPage) {
                    clonedPage.style.display = 'block';
                    clonedPage.style.visibility = 'visible';
                    clonedPage.style.opacity = '1';
                    clonedPage.style.position = 'relative';
                    clonedPage.style.left = '0';
                    clonedPage.style.top = '0';
                    clonedPage.style.zIndex = '0';
                    clonedPage.style.width = `${pageWidth}px`;
                    clonedPage.style.height = `${pageHeight}px`;
                    clonedPage.style.minHeight = `${pageHeight}px`;
                    clonedPage.style.maxHeight = `${pageHeight}px`;
                    clonedPage.style.backgroundColor = '#ffffff';
                }
            }
        };
    },

    async saveStudentListPDF(pdfHost, activeView, jsPDFConstructor) {
        const { pagesRoot, pages } = this.createStudentListPDFPages(pdfHost, activeView);
        const isLandscape = activeView.orientation === 'landscape';
        const pageWidthMm = isLandscape ? 297 : 210;
        const pageHeightMm = isLandscape ? 210 : 297;
        const pdf = new jsPDFConstructor({
            unit: 'mm',
            format: 'a4',
            orientation: activeView.orientation,
            compress: true
        });
        try {
            for (let index = 0; index < pages.length; index += 1) {
                const page = pages[index];
                const rect = page.getBoundingClientRect();
                if (!rect.width || !rect.height) {
                    throw new Error('تعذر قياس صفحة قائمة الطلاب قبل إنشاء PDF.');
                }

                // Keep Arabic shaping in a real, attached layout context.
                // html2canvas is sensitive to the font/direction state at
                // the exact moment it measures the page.
                page.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
                page.style.direction = 'rtl';
                page.style.textRendering = 'geometricPrecision';
                page.style.webkitFontSmoothing = 'antialiased';
                if (document.fonts?.ready) {
                    await document.fonts.ready;
                }

                const canvas = await window.html2canvas(
                    page,
                    this.getStudentListPageCanvasOptions(page.id, activeView.orientation)
                );

                if (!canvas.width || !canvas.height) {
                    throw new Error('تم إنشاء لوحة PDF فارغة.');
                }

                if (index > 0) pdf.addPage('a4', activeView.orientation);
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.98),
                    'JPEG',
                    0,
                    0,
                    pageWidthMm,
                    pageHeightMm,
                    undefined,
                    'FAST'
                );
                canvas.width = 0;
                canvas.height = 0;
            }

            pdf.save(this.generateFilename(activeView.type, activeView.exportContext));
        } finally {
            pagesRoot.remove();
        }
    },

    async renderStudentPDFOverlay(
        width,
        height,
        teacherName,
        pageNumber,
        totalPages,
        sourceScale,
        sourcePixelsPerMm,
        marginY,
        footerHeight
    ) {
        await this.waitForArabicFonts();

        const overlay = document.createElement('div');
        overlay.className = 'student-list-pdf-page-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = [
            'position:absolute',
            'left:0',
            'top:0',
            `width:${width}px`,
            `height:${height}px`,
            'display:block',
            'visibility:visible',
            'opacity:0',
            'overflow:hidden',
            'background:transparent',
            'direction:rtl',
            "font-family:'Cairo','Tajawal',Arial,sans-serif",
            'pointer-events:none',
            'z-index:2147483647'
        ].join(';');

        const name = String(teacherName || 'المعلم').trim() || 'المعلم';
        const footerTop = height - Math.round((marginY + footerHeight) * sourcePixelsPerMm);
        const edgePadding = Math.round(5 * sourcePixelsPerMm);

        const watermark = document.createElement('div');
        watermark.style.cssText = [
            'position:absolute',
            'top:50%',
            'left:50%',
            'z-index:0',
            'width:100%',
            'transform:translate(-50%,-50%) rotate(-30deg)',
            'text-align:center',
            'white-space:nowrap',
            'pointer-events:none',
            'direction:rtl',
            'unicode-bidi:plaintext',
            `font-size:${Math.round(32 * sourceScale)}px`,
            'font-weight:800',
            "font-family:'Cairo','Tajawal',Arial,sans-serif",
            'color:rgba(126,34,206,0.05)'
        ].join(';');
        watermark.textContent = `أستاذ / ${name}`;

        const footerLine = document.createElement('div');
        footerLine.style.cssText = [
            'position:absolute',
            `top:${footerTop}px`,
            `left:${Math.round(sourcePixelsPerMm * marginY)}px`,
            `right:${Math.round(sourcePixelsPerMm * marginY)}px`,
            'height:1px',
            'background:#e9d5ff'
        ].join(';');

        const developer = document.createElement('div');
        developer.style.cssText = [
            'position:absolute',
            `left:${edgePadding}px`,
            `top:${footerTop + Math.round(10 * sourcePixelsPerMm)}px`,
            'direction:ltr',
            'text-align:left',
            'white-space:nowrap',
            'color:#6b21a8',
            "font-family:Arial,sans-serif",
            `font-size:${Math.round(10 * sourceScale)}px`,
            'font-weight:700',
            'letter-spacing:1px'
        ].join(';');
        developer.textContent = 'DEVELOPED BY PROGRAMMER MAZEN';

        const badge = document.createElement('div');
        badge.style.cssText = [
            'position:absolute',
            `top:${footerTop + Math.round(4 * sourcePixelsPerMm)}px`,
            `right:${edgePadding}px`,
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'box-sizing:border-box',
            `height:${Math.round(14 * sourceScale)}px`,
            'padding:0 14px',
            'border:1px solid #ddd6fe',
            'border-radius:20px',
            'background:#f3e8ff',
            'color:#6b21a8',
            'direction:rtl',
            'unicode-bidi:plaintext',
            "font-family:'Cairo','Tajawal',Arial,sans-serif",
            `font-size:${Math.round(10 * sourceScale)}px`,
            'font-weight:700',
            'white-space:nowrap'
        ].join(';');
        const pageLabel = document.createElement('span');
        pageLabel.textContent = 'صفحة ';
        const currentPage = document.createElement('strong');
        currentPage.textContent = String(pageNumber);
        const pageSeparator = document.createElement('span');
        pageSeparator.textContent = ' من ';
        const lastPage = document.createElement('strong');
        lastPage.textContent = String(totalPages);
        badge.append(pageLabel, currentPage, pageSeparator, lastPage);

        overlay.append(watermark, footerLine, developer, badge);
        document.body.appendChild(overlay);

        try {
            await new Promise(resolve => requestAnimationFrame(resolve));
            return await window.html2canvas(overlay, {
                scale: 1,
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                backgroundColor: null,
                useCORS: true,
                allowTaint: true,
                letterRendering: false,
                foreignObjectRendering: false,
                logging: false,
                onclone: clonedDocument => {
                    const clonedOverlay = clonedDocument.querySelector('.student-list-pdf-page-overlay');
                    if (clonedOverlay) {
                        clonedOverlay.style.display = 'block';
                        clonedOverlay.style.visibility = 'visible';
                        clonedOverlay.style.opacity = '1';
                        clonedOverlay.style.position = 'absolute';
                        clonedOverlay.style.left = '0';
                        clonedOverlay.style.top = '0';
                        clonedOverlay.style.zIndex = '0';
                        clonedOverlay.style.width = `${width}px`;
                        clonedOverlay.style.height = `${height}px`;
                    }
                }
            });
        } finally {
            overlay.remove();
        }
    },

    async waitForArabicFonts() {
        if (!document.fonts) return;
        await document.fonts.ready;
        await Promise.all([
            document.fonts.load('400 16px Cairo'),
            document.fonts.load('600 16px Cairo'),
            document.fonts.load('700 16px Cairo'),
            document.fonts.load('800 20px Cairo'),
            document.fonts.load('400 16px Tajawal'),
            document.fonts.load('700 16px Tajawal')
        ]);
    },

    async waitForStudentTableReady(tableContainer, activeView = null) {
        // Allow the existing debounced search/render cycle to finish.
        await new Promise(resolve => setTimeout(resolve, 200));

        const tableSelector = activeView?.type === 'nonPayers'
            ? 'table.non-payers-table'
            : activeView?.type === 'groupSessionAttendance'
                ? 'table.group-attendance-archive-table'
            : activeView?.type === 'repeatedAbsence'
                ? 'table.repeated-absence-table'
                : activeView?.type === 'expelledStudents'
                    ? 'table.expelled-students-table'
                : activeView?.type === 'examGrades'
                    ? 'table.exam-grades-table'
                : '.students-data-container table.students-table';
        const deadline = Date.now() + 4000;
        let table = null;
        let previousSignature = '';
        let stableFrames = 0;

        while (Date.now() < deadline) {
            table = tableContainer.querySelector(tableSelector);
            if (table) {
                const rect = table.getBoundingClientRect();
                const rowCount = table.querySelectorAll('tbody tr').length;
                const signature = `${rowCount}:${Math.round(rect.width)}:${Math.round(rect.height)}`;

                if (rowCount > 0 && rect.width > 0 && rect.height > 0 && signature === previousSignature) {
                    stableFrames += 1;
                } else {
                    stableFrames = 0;
                }
                previousSignature = signature;

                if (stableFrames >= 2) break;
            }

            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        if (!table) {
            alert(activeView?.type === 'nonPayers'
                ? 'عذراً، تعذر تجهيز قائمة الممتنعين للتصدير.'
                : activeView?.type === 'groupSessionAttendance'
                    ? 'عذراً، تعذر تجهيز جلسة حضور المجموعات للتصدير.'
                    : activeView?.type === 'repeatedAbsence'
                        ? 'عذراً، تعذر تجهيز تقرير الغياب المتكرر للتصدير.'
                    : activeView?.type === 'examGrades'
                        ? 'عذراً، تعذر تجهيز جدول الدرجات للتصدير.'
                    : 'عذراً، تعذر تجهيز جدول الطلاب للتصدير.');
            return false;
        }

        const rect = table.getBoundingClientRect();
        if (!rect.width || !rect.height || !table.querySelectorAll('tbody tr').length) {
            alert(activeView?.type === 'nonPayers'
                ? 'عذراً، لم تكتمل بيانات قائمة الممتنعين بعد. يرجى المحاولة مرة أخرى.'
                : activeView?.type === 'groupSessionAttendance'
                    ? 'عذراً، لم تكتمل بيانات جلسة الحضور بعد. يرجى المحاولة مرة أخرى.'
                    : activeView?.type === 'repeatedAbsence'
                        ? 'عذراً، لم تكتمل بيانات تقرير الغياب المتكرر بعد. يرجى المحاولة مرة أخرى.'
                    : activeView?.type === 'examGrades'
                        ? 'عذراً، لم تكتمل بيانات جدول الدرجات بعد. يرجى المحاولة مرة أخرى.'
                    : 'عذراً، لم تكتمل بيانات جدول الطلاب بعد. يرجى المحاولة مرة أخرى.');
            return false;
        }

        // Wait for fonts, images, and the final layout paint.
        await this.waitForPDFRender(table);
        return true;
    },

    async waitForPDFRender(root) {
        if (document.fonts?.ready) {
            await document.fonts.ready;
            await Promise.all([
                document.fonts.load('400 16px Cairo'),
                document.fonts.load('600 16px Cairo'),
                document.fonts.load('700 16px Cairo'),
                document.fonts.load('800 20px Cairo'),
                document.fonts.load('900 22px Cairo'),
                document.fonts.load('400 16px Tajawal'),
                document.fonts.load('700 16px Tajawal')
            ]);
        }

        const images = Array.from(root.querySelectorAll('img'));
        await Promise.all(images.map(image => {
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => {
                const finish = () => {
                    image.removeEventListener('load', finish);
                    image.removeEventListener('error', finish);
                    resolve();
                };
                image.addEventListener('load', finish, { once: true });
                image.addEventListener('error', finish, { once: true });
            });
        }));

        await new Promise(resolve => requestAnimationFrame(() => {
            requestAnimationFrame(() => setTimeout(resolve, 200));
        }));
    },

    preparePrintableTable(tableContainer) {
        tableContainer.classList.add('printable-table-area');

        // Re-generate barcodes with high-contrast settings for exports.
        document.querySelectorAll('.student-barcode-svg').forEach(svg => {
            const code = svg.dataset.code;
            if (code && typeof JsBarcode === 'function') {
                JsBarcode(svg, code, {
                    format: "CODE128", width: 2, height: 40, displayValue: false, margin: 10,
                    background: "#ffffff", lineColor: "#000000"
                });
            }
        });
    },

    cleanupPrintableTable(tableContainer) {
        if (!tableContainer) return;

        tableContainer.classList.remove('printable-table-area');
        tableContainer.querySelectorAll('.print-hidden-column').forEach(el => el.classList.remove('print-hidden-column'));

        // Restore screen-view barcodes after the export.
        document.querySelectorAll('.student-barcode-svg').forEach(svg => {
            const code = svg.dataset.code;
            if (code && typeof JsBarcode === 'function') {
                JsBarcode(svg, code, {
                    format: "CODE128", width: 1.2, height: 30, displayValue: false, margin: 0,
                    background: "transparent", lineColor: "var(--text-primary)"
                });
            }
        });
    },

    buildStudentListPDFHost(tableContainer, activeView) {
        const isUnpaidStudentsView = activeView.type === 'nonPayers';
        const isGroupSessionAttendanceView = activeView.type === 'groupSessionAttendance';
        const isRepeatedAbsenceView = activeView.type === 'repeatedAbsence';
        const isExpelledStudentsView = activeView.type === 'expelledStudents';
        const isExamGradesView = activeView.type === 'examGrades';
        const isExamGradesShowAll = isExamGradesView && window.ExamsUI?.activeExamIdx === 'all';
        const isExamGradesSingleView = isExamGradesView && !isExamGradesShowAll;
        const sourceTable = isUnpaidStudentsView
            ? tableContainer.querySelector('table.non-payers-table')
            : isGroupSessionAttendanceView
                ? tableContainer.querySelector('table.group-attendance-archive-table')
                : isRepeatedAbsenceView
                    ? tableContainer.querySelector('table.repeated-absence-table')
                : isExpelledStudentsView
                    ? tableContainer.querySelector('table.expelled-students-table')
                : isExamGradesView
                    ? tableContainer.querySelector('table.exam-grades-table')
                : tableContainer.querySelector('.students-data-container table.students-table');
        if (!sourceTable) {
            alert(isUnpaidStudentsView
                ? 'عذراً، تعذر العثور على قائمة الممتنعين لإنشاء ملف PDF.'
                : isGroupSessionAttendanceView
                    ? 'عذراً، تعذر العثور على جلسة الحضور لإنشاء ملف PDF.'
                : isRepeatedAbsenceView
                    ? 'عذراً، تعذر العثور على تقرير الغياب المتكرر لإنشاء ملف PDF.'
                : isExpelledStudentsView
                    ? 'عذراً، تعذر العثور على قائمة الطلاب المطرودين لإنشاء ملف PDF.'
                : isExamGradesView
                    ? 'عذراً، تعذر العثور على جدول الدرجات لإنشاء ملف PDF.'
                : 'عذراً، تعذر العثور على قائمة الطلاب لإنشاء ملف PDF.');
            return null;
        }

        const isLandscape = activeView?.orientation === 'landscape';
        const pageWidth = isLandscape ? 1122 : 794;
        const pageHeight = isLandscape ? 794 : 1122;
        const host = document.createElement('div');
        host.id = 'pdf-printable-container';
        host.className = 'student-list-pdf-host print-report-container';
        host.dir = 'rtl';
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = [
            'position:absolute',
            'left:0',
            'top:0',
            `width:${pageWidth}px`,
            `min-height:${pageHeight}px`,
            'display:block',
            'visibility:visible',
            'opacity:0',
            'overflow:visible',
            'background:#ffffff',
            'color:#000000',
            'z-index:2147483647',
            'pointer-events:none',
            'direction:rtl',
            'text-align:right',
            'unicode-bidi:embed',
            'font-family:Cairo, Tajawal, Arial, sans-serif',
            'letter-spacing:normal',
            'word-spacing:normal',
            'font-variant-ligatures:normal',
            'text-rendering:geometricPrecision',
            '-webkit-font-smoothing:antialiased'
        ].join(';');
        host.style.setProperty('width', `${pageWidth}px`, 'important');
        host.style.setProperty('min-height', `${pageHeight}px`, 'important');

        const exportDate = new Date();
        const teacherName = window.Auth?.getTeacherName?.() || 'اسم المعلم';
        const stage = window.GlobalStageFilter.getActiveStage();
        const grade = window.GlobalStageFilter.getActiveGrade();
        const subtitleText = this.getSubTitle(stage, grade);
        const dateText = exportDate.toLocaleDateString('ar-EG-u-nu-latn', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeText = window.AppUtils?.formatTime12h
            ? window.AppUtils.formatTime12h(exportDate)
            : exportDate.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
        const groupSession = isGroupSessionAttendanceView
            ? window.GroupAttendanceArchive?.getSelectedSession?.()
            : null;
        const groupReportTitles = isGroupSessionAttendanceView
            ? this.getGroupSessionReportTitles(groupSession)
            : null;
        const examGradesReportTitles = isExamGradesView
            ? this.getExamGradesReportTitles()
            : null;
        const reportDateText = groupSession?.dateLabel || dateText;
        const reportTimeText = groupSession?.timeSlot || timeText;

        const header = document.createElement('header');
        header.className = 'student-list-pdf-header header-box';
        const unpaidReportTitles = isUnpaidStudentsView ? this.getUnpaidReportTitle() : null;
        const brand = document.createElement('div');
        brand.className = 'student-list-pdf-brand';
        const logo = document.createElement('span');
        logo.className = 'student-list-pdf-logo';
        const icon = document.createElement('i');
        icon.className = `fas ${localStorage.getItem('academy_icon_class') || 'fa-graduation-cap'}`;
        logo.appendChild(icon);

        const brandText = document.createElement('div');
        const systemName = document.createElement('strong');
        systemName.textContent = 'نظام إدارة الطلاب';
        const teacher = document.createElement('span');
        teacher.className = 'student-list-pdf-teacher';
        teacher.textContent = `أستاذ / ${teacherName}`;
        brandText.append(systemName, teacher);
        brand.append(logo, brandText);

        const title = document.createElement('h1');
        title.textContent = groupReportTitles?.mainTitle
            || examGradesReportTitles?.mainTitle
            || this.getDocTitle(activeView);
        const subtitle = document.createElement('p');
        subtitle.className = 'student-list-pdf-subtitle';
        subtitle.textContent = subtitleText;
        const meta = document.createElement('div');
        meta.className = 'student-list-pdf-meta info-bar';
        const makeMetaItem = (label, value) => {
            const item = document.createElement('div');
            item.appendChild(document.createTextNode(`${label}: `));
            const strong = document.createElement('strong');
            strong.textContent = value;
            item.appendChild(strong);
            return item;
        };
        meta.append(
            makeMetaItem('المرحلة / الصف', subtitleText.replace(/^المرحلة:\s*/, '')),
            makeMetaItem('التاريخ', reportDateText),
            makeMetaItem('الوقت', reportTimeText)
        );
        header.append(brand, title, subtitle, meta);

        const watermark = document.createElement('div');
        watermark.className = 'watermark-container student-list-pdf-watermark';
        watermark.setAttribute('aria-hidden', 'true');
        const watermarkText = document.createElement('span');
        watermarkText.className = 'watermark-text';
        watermarkText.textContent = `أستاذ / ${teacherName}`;
        watermark.appendChild(watermarkText);

        const sectionBanner = document.createElement('div');
        sectionBanner.className = 'student-list-pdf-section-banner banner';
        if (isUnpaidStudentsView) {
            title.textContent = unpaidReportTitles.mainTitle;

            const bannerTitle = document.createElement('span');
            bannerTitle.className = 'student-list-pdf-banner-title';
            bannerTitle.textContent = unpaidReportTitles.mainTitle;
            sectionBanner.appendChild(bannerTitle);

            if (unpaidReportTitles.subTitle) {
                const filterBadge = document.createElement('span');
                filterBadge.className = 'student-list-pdf-filter-badge badge';
                filterBadge.textContent = unpaidReportTitles.subTitle;
                sectionBanner.appendChild(filterBadge);
            }
        } else if (isGroupSessionAttendanceView) {
            const bannerTitle = document.createElement('span');
            bannerTitle.className = 'student-list-pdf-banner-title';
            bannerTitle.textContent = groupReportTitles.bannerTitle;
            sectionBanner.appendChild(bannerTitle);

            const sessionBadge = document.createElement('span');
            sessionBadge.className = 'student-list-pdf-filter-badge badge';
            sessionBadge.textContent = groupReportTitles.subTitle;
            sectionBanner.appendChild(sessionBadge);
        } else if (isRepeatedAbsenceView) {
            const bannerTitle = document.createElement('span');
            bannerTitle.className = 'student-list-pdf-banner-title';
            bannerTitle.textContent = 'تقرير الغياب المتكرر';
            sectionBanner.appendChild(bannerTitle);

            const absenceBadge = document.createElement('span');
            absenceBadge.className = 'student-list-pdf-filter-badge badge';
            const absencePage = window.RepeatedAbsence;
            const termLabel = absencePage?.activeTerm === 2 ? 'الترم الثاني' : 'الترم الأول';
            const periodLabel = absencePage?.getSelectedPeriodLabel?.() || 'الفترة المحددة';
            absenceBadge.textContent = `${termLabel} | ${periodLabel}`;
            sectionBanner.appendChild(absenceBadge);
        } else if (isExpelledStudentsView) {
            const bannerTitle = document.createElement('span');
            bannerTitle.className = 'student-list-pdf-banner-title';
            bannerTitle.textContent = activeView.title || this.getDocTitle(activeView);
            sectionBanner.appendChild(bannerTitle);

            const filterBadge = document.createElement('span');
            filterBadge.className = 'student-list-pdf-filter-badge badge';
            filterBadge.textContent = activeView.exportContext?.filter === 'manual'
                ? 'المطرودون يدويًا'
                : 'المطرودون تلقائيًا';
            sectionBanner.appendChild(filterBadge);
        } else if (isExamGradesView) {
            const bannerTitle = document.createElement('span');
            bannerTitle.className = 'student-list-pdf-banner-title';
            bannerTitle.textContent = window.ExamsGradesUI?.getViewingNowLabel
                ? window.ExamsGradesUI.getViewingNowLabel()
                : examGradesReportTitles.mainTitle;
            sectionBanner.appendChild(bannerTitle);

            const examBadge = document.createElement('span');
            examBadge.className = 'student-list-pdf-filter-badge badge';
            examBadge.textContent = examGradesReportTitles.subTitle;
            sectionBanner.appendChild(examBadge);
        } else {
            sectionBanner.textContent = `قائمة الطلاب - ${subtitleText.replace(/^المرحلة:\s*/, '')}`;
        }

        const table = document.createElement('table');
        table.className = `print-table data-table student-list-pdf-table${isUnpaidStudentsView ? ' student-list-pdf-unpaid-table' : ''}${isGroupSessionAttendanceView ? ' student-list-pdf-group-session-table' : ''}${isRepeatedAbsenceView ? ' student-list-pdf-repeated-absence-table' : ''}${isExpelledStudentsView ? ' student-list-pdf-expelled-table' : ''}${isExamGradesView ? ' student-list-pdf-exam-grades-table' : ''}${isExamGradesSingleView ? ' student-list-pdf-single-exam-table' : ''}`;
        table.dir = 'rtl';
        const columns = isUnpaidStudentsView
            ? ['م', 'اسم الطالب', 'الأشهر الممتنع عنها', 'أيام التأخير', 'المديونية / الإجراء']
                : isGroupSessionAttendanceView
                    ? ['م', 'اسم الطالب', 'الحالة']
                    : isRepeatedAbsenceView
                        ? ['مسلسل', 'كود الطالب', 'اسم الطالب', 'عدد مرات الغياب']
                    : isExpelledStudentsView
                        ? ['م', 'اسم الطالب', 'كود الطالب', 'سبب / عدد مرات الغياب', 'متبقي للحذف النهائي']
                : isExamGradesView
                    ? isExamGradesSingleView
                        ? this.getSingleExamPDFColumns(sourceTable)
                        : this.getExamGradesPDFColumns(sourceTable, { excludeEvaluation: true })
                : ['م', 'كود الطالب', 'اسم الطالب', 'المرحلة / الصف', 'رقم الهاتف', 'هاتف ولي الأمر'];
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(label => {
            const cell = document.createElement('th');
            cell.textContent = label;
            headerRow.appendChild(cell);
        });
        if (isExamGradesView) {
            const examColumnCount = columns.length;
            const isLeaderboard = sourceTable.querySelector('thead th.col-rank');
            const includesEvaluation = !isExamGradesShowAll;
            const singleExamColumnWidths = [8, 42, 25, 25];
            const serialWidth = 7;
            const rankWidth = isLeaderboard ? 14 : 0;
            const nameWidth = isLeaderboard ? 27 : 23;
            const overallWidth = includesEvaluation ? (isLeaderboard ? 18 : 15) : 0;
            const remainingWidth = 100 - serialWidth - rankWidth - nameWidth - overallWidth;
            const fixedColumns = isLeaderboard ? 3 : 2;
            const examColumnCountForWidth = examColumnCount - fixedColumns - (includesEvaluation ? 1 : 0);
            const examWidth = remainingWidth / Math.max(1, examColumnCountForWidth);
            Array.from(headerRow.children).forEach((cell, index) => {
                if (isExamGradesSingleView && !isLeaderboard) {
                    cell.style.width = `${singleExamColumnWidths[index] || 25}%`;
                    return;
                }
                const width = index === 0
                    ? serialWidth
                    : isLeaderboard && index === 1
                        ? rankWidth
                        : index === (isLeaderboard ? 2 : 1)
                        ? nameWidth
                        : includesEvaluation && index === examColumnCount - 1
                            ? overallWidth
                            : examWidth;
                cell.style.width = `${width}%`;
            });
        }
        thead.appendChild(headerRow);

        const tbody = document.createElement('tbody');
        const sourceRows = Array.from(sourceTable.querySelectorAll('tbody tr'))
            .filter(row => !isExamGradesView
                || (row.classList.contains('exam-grade-row') && row.style.display !== 'none'));
        const rows = isExpelledStudentsView
            ? (activeView.exportContext?.data || []).map((record, index) => {
                const tr = document.createElement('tr');
                const values = [
                    record.originalSerial || record.original_serial || index + 1,
                    record.name || '---',
                    record.originalStudentCode || record.original_student_code || '---',
                    record.expulsion_type === 'manual'
                        ? 'طرد يدويًا'
                        : (record.absenceCount ?? 0),
                    `${record.remainingDays ?? 0} يومًا`
                ];
                values.forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = String(value);
                    if (valueIndex === 1) cell.classList.add('student-list-pdf-arabic-cell');
                    if (valueIndex === 0 || valueIndex === 2 || valueIndex === 3 || valueIndex === 4) {
                        cell.classList.add('student-list-pdf-ltr-cell');
                    }
                    tr.appendChild(cell);
                });
                return tr;
            })
            : sourceRows.map((row, index) => {
            if (isUnpaidStudentsView) {
                const name = row.querySelector('.col-name')?.textContent.trim() || '';
                if (!name) return null;

                const missedMonths = Array.from(row.querySelectorAll('.col-missed .missed-month-badge'))
                    .map(month => month.textContent.trim())
                    .filter(Boolean)
                    .join('، ');
                const overdueDays = row.querySelector('.col-overdue')?.textContent.trim() || '---';
                const debtSummary = row.querySelector('.col-missed .overdue-count')?.textContent.trim() || 'مديونية نشطة';
                const action = row.querySelector('.pay-now-btn-alt')?.textContent.trim() || 'سداد الآن';
                const values = [
                    row.querySelector('.col-serial')?.textContent.trim() || String(index + 1),
                    name,
                    missedMonths || '---',
                    overdueDays,
                    `${debtSummary} / ${action}`
                ];
                const tr = document.createElement('tr');
                values.forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    if (valueIndex === 1 || valueIndex === 2 || valueIndex === 4) {
                        cell.classList.add('student-list-pdf-arabic-cell');
                    }
                    if (valueIndex === 0 || valueIndex === 3) {
                        cell.classList.add('student-list-pdf-ltr-cell');
                    }
                    tr.appendChild(cell);
                });
                return tr;
            }

            if (isGroupSessionAttendanceView) {
                const name = row.querySelector('.archive-student-name')?.textContent.trim() || '';
                if (!name) return null;

                const values = [
                    row.querySelector('.col-serial')?.textContent.trim() || String(index + 1),
                    name,
                    row.querySelector('.archive-student-status')?.textContent.trim() || 'غائب'
                ];
                const tr = document.createElement('tr');
                values.forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    if (valueIndex === 1 || valueIndex === 2) {
                        cell.classList.add('student-list-pdf-arabic-cell');
                    }
                    if (valueIndex === 0) {
                        cell.classList.add('student-list-pdf-ltr-cell');
                    }
                    tr.appendChild(cell);
                });
                return tr;
            }

            if (isRepeatedAbsenceView) {
                const name = row.querySelector('.repeated-student-name')?.textContent.trim() || '';
                if (!name) return null;

                const values = [
                    row.querySelector('.col-serial')?.textContent.trim() || String(index + 1),
                    row.querySelector('.student-code-cell')?.textContent.trim() || '---',
                    name,
                    row.querySelector('.absence-count-badge')?.textContent.trim() || '0'
                ];
                const tr = document.createElement('tr');
                values.forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    if (valueIndex === 2) cell.classList.add('student-list-pdf-arabic-cell');
                    if (valueIndex !== 2) cell.classList.add('student-list-pdf-ltr-cell');
                    tr.appendChild(cell);
                });
                return tr;
            }

            if (isExamGradesView) {
                const sourceCells = Array.from(row.children).filter(cell => cell.tagName === 'TD');
                if (!sourceCells.length) return null;
                const values = isExamGradesSingleView
                    ? this.getSingleExamPDFRowValues(sourceCells)
                    : this.getExamGradesPDFRowValues(sourceCells, { excludeEvaluation: true });
                const tr = document.createElement('tr');
                const isLeaderboard = sourceTable.querySelector('thead th.col-rank');
                values.forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    if ((isLeaderboard ? valueIndex === 2 : valueIndex === 1) || valueIndex === values.length - 1) {
                        cell.classList.add('student-list-pdf-arabic-cell');
                    }
                    if (valueIndex === 0) {
                        cell.classList.add('student-list-pdf-ltr-cell');
                    }
                    tr.appendChild(cell);
                });
                return tr;
            }

            if (row.classList.contains('row-empty')) {
                const tr = document.createElement('tr');
                tr.classList.add('row-empty');
                const serial = row.querySelector('.col-id')?.textContent.trim() || String(index + 1);
                ['', '', '', '', '', ''].forEach((value, valueIndex) => {
                    const cell = document.createElement('td');
                    cell.textContent = valueIndex === 0 ? serial : '';
                    if (valueIndex === 0) cell.classList.add('student-list-pdf-ltr-cell');
                    tr.appendChild(cell);
                });
                return tr;
            }

            const name = row.querySelector('.student-name-cell a')?.textContent.trim()
                || row.querySelector('.student-name-cell')?.textContent.trim()
                || '';
            if (!name || name.startsWith('---')) return null;

            const phones = Array.from(row.querySelectorAll('td.col-phone'))
                .map(cell => cell.textContent.trim() || '---');
            const values = [
                row.querySelector('.col-id')?.textContent.trim() || String(index + 1),
                row.querySelector('.time-pill')?.textContent.trim() || '------',
                name,
                subtitleText.replace(/^المرحلة:\s*/, ''),
                phones[0] || '---',
                phones[1] || '---'
            ];
            const tr = document.createElement('tr');
            values.forEach((value, valueIndex) => {
                const cell = document.createElement('td');
                if (valueIndex === 1) {
                    const codeBadge = document.createElement('span');
                    codeBadge.className = 'student-list-pdf-code-badge';
                    codeBadge.textContent = value;
                    cell.appendChild(codeBadge);
                } else {
                    cell.textContent = value;
                }
                if (valueIndex === 2 || valueIndex === 3) cell.classList.add('student-list-pdf-arabic-cell');
                if (valueIndex === 0 || valueIndex === 1) cell.classList.add('student-list-pdf-ltr-cell');
                if (valueIndex === 4 || valueIndex === 5) cell.classList.add('student-list-pdf-phone-cell');
                tr.appendChild(cell);
            });
            return tr;
        }).filter(Boolean);

        rows.forEach(row => tbody.appendChild(row));
        if (!rows.length) {
            alert('عذراً، لا توجد بيانات طلاب مكتملة لإنشاء ملف PDF.');
            return null;
        }
        table.append(thead, tbody);

        const estimatedPages = Math.max(1, Math.ceil(rows.length / 20));
        const footer = document.createElement('footer');
        footer.className = 'student-list-pdf-footer pdf-footer-container';
        const footerTitle = document.createElement('span');
        footerTitle.className = 'student-list-pdf-developer';
        footerTitle.textContent = 'DEVELOPED BY PROGRAMMER MAZEN';
        const pageLabel = document.createElement('span');
        pageLabel.className = 'student-list-pdf-page-badge';
        pageLabel.innerHTML = `صفحة <span class="student-print-current-page"></span> من <span class="student-print-total-pages">${estimatedPages}</span>`;
        footer.append(footerTitle, pageLabel);

        host.append(header, sectionBanner, watermark, table, footer);
        return host;
    },

    getExamGradesReportTitles() {
        const examsUI = window.ExamsUI;
        const termLabel = examsUI?.currentTerm === 2 ? 'الترم الثاني' : 'الترم الأول';
        const activeExamIdx = examsUI?.activeExamIdx ?? 'all';

        if (activeExamIdx === 'all') {
            return {
                mainTitle: 'كشف درجات الاختبارات والامتحانات',
                subTitle: `التقرير العام لدرجات الامتحانات - ${termLabel}`
            };
        }

        const exam = examsUI?.examColumns?.[activeExamIdx];
        const examName = typeof exam === 'string'
            ? exam
            : exam?.name || `امتحان ${Number(activeExamIdx) + 1}`;
        const hasTermInName = /الترم|ترم/.test(examName);
        const totalScore = exam?.totalScore || 100;
        const selectedFilter = examsUI?.singleExamFilter || 'all';
        const filterLabel = window.ExamsGradesUI?.getSingleExamFilterLabel
            ? window.ExamsGradesUI.getSingleExamFilterLabel(selectedFilter, true)
            : selectedFilter;
        const filterContext = selectedFilter === 'all'
            ? ''
            : ` | التصفية: ${filterLabel}`;
        return {
            mainTitle: 'كشف درجات الاختبارات والامتحانات',
            subTitle: `نتائج درجات: ${examName}${hasTermInName ? '' : ` - ${termLabel}`}${filterContext} | درجة الامتحان: من ${totalScore}`
        };
    },

    getSingleExamPDFColumns(sourceTable) {
        const headerElements = Array.from(sourceTable.querySelectorAll('thead th'));
        const isLeaderboard = headerElements.some(header => header.classList.contains('col-rank'));
        const activeExamIdx = window.ExamsUI?.activeExamIdx;
        const exam = window.ExamsUI?.examColumns?.[activeExamIdx];
        const totalScore = typeof exam === 'object' ? exam?.totalScore || 100 : 100;

        return isLeaderboard
            ? ['م', 'الترتيب', 'اسم الطالب', `درجة الامتحان (من ${totalScore})`, 'تقدير الطالب']
            : ['م', 'اسم الطالب', `درجة الامتحان (من ${totalScore})`, 'تقدير الطالب'];
    },

    getSingleExamPDFRowValues(sourceCells) {
        const isLeaderboard = sourceCells.length >= 5;
        const serialIndex = 0;
        const rankIndex = isLeaderboard ? 1 : -1;
        const nameIndex = isLeaderboard ? 2 : 1;
        const scoreCell = sourceCells.find(cell => cell.classList.contains('exam-grade-value-cell'))
            || sourceCells[isLeaderboard ? 3 : 2];
        const evaluationCell = sourceCells[sourceCells.length - 1];
        const activeExamIdx = window.ExamsUI?.activeExamIdx;
        const exam = window.ExamsUI?.examColumns?.[activeExamIdx];
        const totalScore = typeof exam === 'object' ? exam?.totalScore || 100 : 100;
        const input = scoreCell?.querySelector('input.exam-grade-input');
        const isAbsent = Boolean(
            scoreCell?.querySelector('.grade-absent-badge')
            || evaluationCell?.querySelector('.grade-absent-badge')
        );
        const scoreText = input
            ? `${input.value.trim() || '---'} / ${totalScore}`
            : isAbsent
                ? `غائب (راسب) / ${totalScore}`
                : scoreCell?.textContent?.trim().replace(/\s+/g, ' ') || `--- / ${totalScore}`;
        const evaluationText = evaluationCell?.textContent?.trim().replace(/\s+/g, ' ')
            || (isAbsent ? 'غائب (راسب)' : '---');

        const values = [
            sourceCells[serialIndex]?.textContent?.trim() || '',
            ...(isLeaderboard ? [sourceCells[rankIndex]?.textContent?.trim() || ''] : []),
            sourceCells[nameIndex]?.textContent?.trim() || '',
            scoreText,
            evaluationText
        ];
        return values;
    },

    getExamGradesPDFColumns(sourceTable, { excludeEvaluation = false } = {}) {
        const headerElements = Array.from(sourceTable.querySelectorAll('thead th'));
        const headers = headerElements.map(header => header.textContent.trim().replace(/\s+/g, ' '));
        const isMatrixView = headerElements.some(header => header.querySelector('.finish-exam-header-btn'));
        const isLeaderboard = headerElements.some(header => header.classList.contains('col-rank'));
        const evaluationLabel = isMatrixView ? 'التقدير العام' : 'التقدير';
        if (headers.length >= 3) {
            const normalized = [...headers];
            normalized[0] = 'م';
            if (!isMatrixView && isLeaderboard && normalized.length >= 5) {
                normalized[1] = 'الترتيب';
                normalized[2] = 'اسم الطالب';
                normalized[3] = `درجة الامتحان (من ${window.ExamsUI?.examColumns?.[window.ExamsUI?.activeExamIdx]?.totalScore || 100})`;
                normalized[normalized.length - 1] = evaluationLabel;
            } else if (!isMatrixView && normalized.length === 4) {
                normalized[1] = 'اسم الطالب';
                normalized[2] = `درجة الامتحان (من ${window.ExamsUI?.examColumns?.[window.ExamsUI?.activeExamIdx]?.totalScore || 100})`;
                normalized[normalized.length - 1] = evaluationLabel;
            } else {
                normalized[1] = 'اسم الطالب';
                normalized[normalized.length - 1] = evaluationLabel;
                // The live matrix header also contains the Finish Exam button.
                // Read only its direct exam-name text and the score note so
                // no interactive UI copy can leak into the export.
                headerElements.slice(2, -1).forEach((header, index) => {
                    const examName = Array.from(header.childNodes)
                        .filter(node => node.nodeType === 3)
                        .map(node => node.textContent.trim())
                        .filter(Boolean)
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const scoreNote = header.querySelector('div')?.textContent
                        ?.trim()
                        .replace(/\s+/g, ' ') || '';
                    normalized[index + 2] = [examName, scoreNote]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                });
            }
            return excludeEvaluation ? normalized.slice(0, -1) : normalized;
        }
        const fallback = ['م', 'اسم الطالب', 'درجات الامتحانات', evaluationLabel];
        return excludeEvaluation ? fallback.slice(0, -1) : fallback;
    },

    getExamGradesPDFRowValues(sourceCells, { excludeEvaluation = false } = {}) {
        const values = sourceCells.map(cell => cell.textContent.trim().replace(/\s+/g, ' '));
        const gradeCellIndex = sourceCells.findIndex(cell => cell.classList.contains('exam-grade-value-cell'));
        const activeExamIdx = window.ExamsUI?.activeExamIdx;
        const isSingleExamView = activeExamIdx !== undefined && activeExamIdx !== 'all';
        const gradeInput = gradeCellIndex >= 0
            ? sourceCells[gradeCellIndex].querySelector('input.exam-grade-input')
            : sourceCells[2]?.querySelector('input.exam-grade-input');
        if (gradeInput) {
            const enteredValue = gradeInput.value.trim() || '---';
            const maxValue = gradeCellIndex >= 0
                ? sourceCells[gradeCellIndex].querySelector('span')?.textContent?.trim().replace(/\s+/g, ' ') || ''
                : sourceCells[2].querySelector('span')?.textContent?.trim().replace(/\s+/g, ' ') || '';
            values[gradeCellIndex >= 0 ? gradeCellIndex : 2] = `${enteredValue} ${maxValue}`.trim();
        } else if (isSingleExamView && gradeCellIndex >= 0) {
            const totalScore = window.ExamsUI?.examColumns?.[activeExamIdx]?.totalScore || 100;
            const gradeCell = sourceCells[gradeCellIndex];
            const isAbsent = gradeCell.querySelector('.grade-absent-badge');
            values[gradeCellIndex] = `${isAbsent ? 'غائب (راسب)' : '---'} / ${totalScore}`;
        }
        return excludeEvaluation ? values.slice(0, -1) : values;
    },

    getUnpaidReportTitle() {
        const monthSelect = document.getElementById('nonPayersMonthFilterView');
        const debtTypeSelect = document.getElementById('debtTypeFilter');
        const selectedMonthValue = monthSelect?.value || 'all';
        const selectedMonthText = monthSelect?.options?.[monthSelect.selectedIndex]?.textContent?.trim() || '';
        const isAllMonths = selectedMonthValue === 'all'
            || selectedMonthText.includes('افتراضي')
            || selectedMonthText.includes('كل الممتنعين');

        let mainTitle = 'قائمة الممتنعين عن الدفع - مجمع الشهور';
        if (!isAllMonths) {
            const monthIndex = parseInt(selectedMonthValue, 10);
            const monthName = Number.isInteger(monthIndex) && window.MONTHS?.[monthIndex]
                ? window.MONTHS[monthIndex]
                : selectedMonthText;
            if (monthName) {
                mainTitle = `قائمة الممتنعين عن الدفع - لشهر ${monthName}`;
            }
        }

        const isArrearsOnly = debtTypeSelect?.value === 'overdue_only'
            || debtTypeSelect?.options?.[debtTypeSelect.selectedIndex]?.textContent?.includes('المؤخر');
        const isAdvanceOnly = debtTypeSelect?.value === 'advance_only'
            || debtTypeSelect?.options?.[debtTypeSelect.selectedIndex]?.textContent?.includes('المقدم');

        return {
            mainTitle,
            subTitle: isAdvanceOnly
                ? 'نوع المديونية: المتأخرين عن سداد المقدم فقط'
                : (isArrearsOnly ? 'نوع المديونية: المتأخرين عن سداد المؤخر فقط' : '')
        };
    },

    getGroupSessionReportTitles(session) {
        if (!session) {
            return {
                mainTitle: 'كشف حضور وغياب المجموعة',
                bannerTitle: 'كشف حضور وغياب المجموعة',
                subTitle: 'الجلسة المؤرخة: لا توجد جلسة محددة'
            };
        }

        const statusFilter = window.GroupAttendanceArchive?.statusFilter || 'ALL';
        const titlePrefix = statusFilter === 'ABSENT'
            ? 'كشف قائمة الغياب'
            : statusFilter === 'PRESENT'
                ? 'كشف قائمة الحضور'
                : 'كشف الحضور والغياب';
        const sessionSubTitle = `الجلسة المؤرخة: ${session.dayName} - ${session.dateLabel} | وقت الحصة: ${session.timeSlot}`;

        return {
            mainTitle: `${titlePrefix} - ${session.groupName}`,
            bannerTitle: `${titlePrefix} - ${session.groupName}`,
            subTitle: sessionSubTitle
        };
    },

    mountPrintableTemplate(template, extraClass = '', activeView = null) {
        if (!template) return null;

        const isLandscape = activeView?.orientation === 'landscape';
        const pageWidth = isLandscape ? 1122 : 794;
        const pageHeight = isLandscape ? 794 : 1122;
        const clone = template.cloneNode(true);
        // Keep the canonical id on the element that is actually sent to the
        // browser print engine. The print stylesheet intentionally reveals
        // only #pdf-printable-container.
        clone.id = 'pdf-printable-container';
        clone.classList.add('student-list-pdf-render');
        if (extraClass) clone.classList.add(extraClass);
        clone.style.display = 'block';
        clone.style.position = 'absolute';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.setProperty('width', `${pageWidth}px`, 'important');
        clone.style.setProperty('min-height', `${pageHeight}px`, 'important');
        clone.style.height = 'auto';
        clone.style.zIndex = '2147483647';
        clone.style.visibility = 'visible';
        clone.style.opacity = '0';
        clone.style.backgroundColor = '#ffffff';
        clone.style.direction = 'rtl';
        clone.style.textAlign = 'right';
        clone.style.unicodeBidi = 'embed';
        clone.style.fontFamily = "'Cairo', 'Tajawal', Arial, sans-serif";
        clone.style.letterSpacing = 'normal';
        clone.style.wordSpacing = 'normal';
        clone.style.fontVariantLigatures = 'normal';
        clone.style.textRendering = 'geometricPrecision';
        clone.style.webkitFontSmoothing = 'antialiased';
        document.body.appendChild(clone);
        return clone;
    },

    applySmartColumnHiding(container) {
        const rows = Array.from(container.querySelectorAll('tbody tr'));
        if (rows.length === 0) return;

        // Check Phone, Parent Phone, and Barcode columns (indices vary but usually 4, 5, 6 in Students List)
        const checkIndices = [];
        const headers = container.querySelectorAll('thead th');
        headers.forEach((th, idx) => {
            if (th.textContent.includes('هاتف') || th.textContent.includes('باركود')) {
                checkIndices.push(idx);
            }
        });

        checkIndices.forEach(colIdx => {
            const isEmpty = rows.every(tr => {
                const cell = tr.querySelectorAll('td')[colIdx];
                const text = cell ? cell.textContent.trim() : '';
                return text === '---' || text === '' || (cell && cell.querySelector('.student-barcode-svg') && !cell.querySelector('.student-barcode-svg').dataset.code);
            });

            if (isEmpty) {
                container.querySelectorAll(`thead th:nth-child(${colIdx + 1}), tbody td:nth-child(${colIdx + 1})`).forEach(el => {
                    el.classList.add('print-hidden-column');
                });
            } else {
                container.querySelectorAll(`thead th:nth-child(${colIdx + 1}), tbody td:nth-child(${colIdx + 1})`).forEach(el => {
                    el.classList.remove('print-hidden-column');
                });
            }
        });
    },

    openPrintPreview(tableContainer, activeView) {
        // Show loading then preview
        window.ModalManager.open('printLoadingModal');

        setTimeout(() => {
            let printHost = null;
            if (this.usesCleanTemplate(activeView)) {
                const template = this.buildStudentListPDFHost(tableContainer, activeView);
                if (!template) {
                    window.ModalManager.close('printLoadingModal');
                    return;
                }
                document.body.appendChild(template);
                printHost = this.mountPrintableTemplate(template, 'student-list-print-host', activeView);
                template.remove();
            } else {
                this.preparePrintableTable(tableContainer);
            }

            window.ModalManager.close('printLoadingModal');
            
            // Execute actual print
            this.executePrintProcess(tableContainer, activeView, printHost);
        }, 800);
    },

    async executePrintProcess(tableContainer, activeView, printHost = null) {
        const originalTitle = document.title;
        document.title = this.generateFilename(activeView.type, activeView.exportContext).replace('.pdf', '');
        const isCleanStudentListPrint = Boolean(printHost);

        if (isCleanStudentListPrint) {
            /*
             * The PDF renderer creates fixed A4 pages and rasterizes those
             * pages one by one. Printing the screen DOM here used to produce
             * a different layout because the browser had to paginate a fluid
             * table. Serialize those exact PDF pages into a separate document
             * so both actions consume the same HTML/CSS and page boundaries.
             */
            let pagesRoot = null;
            try {
                const pageSet = this.createStudentListPDFPages(printHost, activeView);
                pagesRoot = pageSet.pagesRoot;
                const pagesMarkup = pageSet.pages.map(page => page.outerHTML).join('');
                const frameStyles = this.getPrintFrameStyles();

                pagesRoot.remove();
                printHost.remove();
                this.cleanupPrintableTable(tableContainer);
                document.title = originalTitle;

                await this.executeDirectPrint(pagesMarkup, activeView, frameStyles);
            } catch (error) {
                if (pagesRoot) pagesRoot.remove();
                if (printHost?.isConnected) printHost.remove();
                this.cleanupPrintableTable(tableContainer);
                document.title = originalTitle;
                alert('تعذر تجهيز الطباعة: ' + (error && error.message ? error.message : error));
            }
            return;
        }

        const style = document.createElement('style');
        style.id = 'print-engine-isolation-style';
        style.innerHTML = `
            @media print {
                html,
                body {
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                @page {
                    size: A4 ${activeView.orientation};
                    margin: 1.5cm;
                }
            }
        `;
        document.head.appendChild(style);

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.removeEventListener('afterprint', cleanup);
            document.title = originalTitle;
            this.cleanupPrintableTable(tableContainer);
            style.remove();
        };

        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
    },

    usesCleanTemplate(activeView) {
        return Boolean(activeView && ['students', 'nonPayers', 'groupSessionAttendance', 'repeatedAbsence', 'expelledStudents', 'examGrades'].includes(activeView.type));
    },

    getPrintFrameStyles() {
        const styles = [];

        // Keep the iframe's cascade in the same order as the live document.
        // Absolute URLs also make relative font/image references resolve
        // correctly from the temporary document.
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (!link.href) return;
            styles.push(`<link rel="stylesheet" href="${link.href}" media="all">`);
        });

        document.querySelectorAll('style').forEach(style => {
            const cssText = style.textContent || '';
            if (cssText) {
                styles.push(`<style>${cssText.replace(/<\/style/gi, '<\\/style')}</style>`);
            }
        });

        return styles.join('');
    },

    async executeDirectPrint(pagesMarkup, activeView, frameStyles = '') {
        const isLandscape = activeView?.orientation === 'landscape';
        const pageWidth = isLandscape ? 1122 : 794;
        const pageHeight = isLandscape ? 794 : 1122;
        const printFrame = document.createElement('iframe');
        printFrame.setAttribute('aria-hidden', 'true');
        printFrame.title = 'طباعة الكشف';
        printFrame.style.cssText = [
            'position:fixed',
            'right:0',
            'bottom:0',
            'width:0',
            'height:0',
            'border:0'
        ].join(';');
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>طباعة الكشف</title>
    ${frameStyles}
    <style>
        /*
         * These are the print-frame invariants. The PDF is drawn at the full
         * A4 bitmap size, so the browser must not add a second page margin or
         * fluidly resize the page container.
         */
        @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'};
            margin: 0;
        }

        html,
        body {
            width: 100%;
            min-width: 0;
            min-height: 0;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            direction: rtl;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body > *:not(#examPrintArea) {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }

        body > #examPrintArea {
            display: block !important;
            width: ${pageWidth}px !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
            opacity: 1 !important;
        }

        body > #examPrintArea > .student-list-pdf-page {
            display: block !important;
            position: relative !important;
            width: ${pageWidth}px !important;
            height: ${pageHeight}px !important;
            min-height: ${pageHeight}px !important;
            max-height: ${pageHeight}px !important;
            margin: 0 !important;
            padding: 20px 20px 45px !important;
            overflow: hidden !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: #fff !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body > #examPrintArea > .student-list-pdf-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }

        body > #examPrintArea,
        body > #examPrintArea * {
            visibility: visible !important;
        }

        /*
         * The application print reset contains broad table rules. These
         * scoped rules are deliberately last so the direct-print frame keeps
         * the same visual contract as the PDF template.
         */
        #examPrintArea .header-box {
            margin-bottom: 15px !important;
            padding: 15px 20px !important;
            border: 2px solid #6b21a8 !important;
            border-radius: 16px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            text-align: center !important;
        }

        #examPrintArea .info-bar {
            display: flex !important;
            justify-content: space-around !important;
            margin-top: 12px !important;
            padding-top: 8px !important;
            border-top: 1px dashed #d8b4fe !important;
            color: #4b5563 !important;
            font-size: 12px !important;
        }

        #examPrintArea .banner {
            margin-bottom: 15px !important;
            padding: 12px !important;
            border-radius: 12px !important;
            background: #6b21a8 !important;
            color: #ffffff !important;
            text-align: center !important;
        }

        #examPrintArea .banner .badge {
            display: inline-block !important;
            margin: 6px auto 0 !important;
            padding: 2px 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            border-radius: 20px !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: #f5f3ff !important;
            font-size: 11px !important;
        }

        #examPrintArea .data-table {
            width: 100% !important;
            margin-top: 10px !important;
            border-collapse: collapse !important;
            border: 1px solid #e9d5ff !important;
            background: #ffffff !important;
            color: #1e293b !important;
        }

        #examPrintArea .data-table th {
            display: table-cell !important;
            padding: 8px !important;
            background: #f3e8ff !important;
            color: #5b21b6 !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            text-align: center !important;
            border-right: 1px solid #e9d5ff !important;
            border-bottom: 2px solid #e9d5ff !important;
        }

        #examPrintArea .data-table td {
            display: table-cell !important;
            padding: 8px !important;
            background: #ffffff !important;
            color: #1e293b !important;
            font-size: 12px !important;
            text-align: center !important;
            border-right: 1px solid #e9d5ff !important;
            border-bottom: 1px solid #f3e8ff !important;
        }

        #examPrintArea .data-table tbody tr:nth-child(even) td {
            background: #ffffff !important;
        }
    </style>
</head>
<body class="exam-direct-print${isLandscape ? ' exam-direct-print-landscape' : ''}">
    <div id="examPrintArea" class="print-only-container student-list-pdf-pages" dir="rtl"></div>
</body>
</html>`);
        frameDoc.close();

        // Populate the dedicated root target after the document exists. This
        // avoids the generic print reset treating the generated pages as
        // unrelated body children and hiding them as blank content.
        const printArea = frameDoc.getElementById('examPrintArea');
        if (!printArea) {
            printFrame.remove();
            throw new Error('تعذر إنشاء حاوية طباعة كشف الدرجات.');
        }
        printArea.innerHTML = pagesMarkup;

        const waitForResources = async () => {
            const stylesheets = Array.from(frameDoc.querySelectorAll('link[rel="stylesheet"]'));
            await Promise.all(stylesheets.map(link => new Promise(resolve => {
                if (link.sheet) {
                    resolve();
                    return;
                }
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    link.removeEventListener('load', finish);
                    link.removeEventListener('error', finish);
                    resolve();
                };
                link.addEventListener('load', finish, { once: true });
                link.addEventListener('error', finish, { once: true });
                setTimeout(finish, 3500);
            })));

            if (frameDoc.fonts?.ready) {
                await frameDoc.fonts.ready;
                await Promise.all([
                    frameDoc.fonts.load('400 16px Cairo'),
                    frameDoc.fonts.load('700 16px Cairo'),
                    frameDoc.fonts.load('800 20px Cairo'),
                    frameDoc.fonts.load('400 16px Tajawal'),
                    frameDoc.fonts.load('700 16px Tajawal')
                ]);
            }

            const images = Array.from(frameDoc.images || []);
            await Promise.all(images.map(image => {
                if (image.complete) return Promise.resolve();
                return new Promise(resolve => {
                    const finish = () => {
                        image.removeEventListener('load', finish);
                        image.removeEventListener('error', finish);
                        resolve();
                    };
                    image.addEventListener('load', finish, { once: true });
                    image.addEventListener('error', finish, { once: true });
                });
            }));

            await new Promise(resolve => {
                printFrame.contentWindow.requestAnimationFrame(() => {
                    printFrame.contentWindow.requestAnimationFrame(() => {
                        setTimeout(resolve, 150);
                    });
                });
            });
        };

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            printFrame.contentWindow.removeEventListener('afterprint', cleanup);
            printFrame.remove();
        };

        try {
            await waitForResources();
            printFrame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            // Some browsers do not dispatch afterprint for a hidden iframe.
            setTimeout(cleanup, 1500);
        } catch (error) {
            cleanup();
            throw error;
        }
    },

    getDocTitle(activeView) {
        switch(activeView.type) {
            case 'students': return "قائمة الطلاب";
            case 'payments': return "سجل تحصيل المصروفات الشهري";
            case 'nonPayers': return "كشف الطلاب الممتنعين عن السداد";
            case 'groupSessionAttendance': return "كشف حضور وغياب المجموعة";
            case 'expelledStudents':
                return activeView.title || "تقرير الطلاب المطرودين";
            case 'repeatedAbsence': return "تقرير الغياب المتكرر";
            case 'reports': return "التحليل المالي السنوي";
            case 'schedule': return "جدول المواعيد والقاعات الأسبوعي";
            case 'examGrades':
            case 'exams': 
                if (window.ExamsUI && window.ExamsUI.activeExamIdx !== 'all') {
                    const exam = window.ExamsUI.examColumns[window.ExamsUI.activeExamIdx];
                    return `كشف درجات: ${typeof exam === 'string' ? exam : exam.name}`;
                }
                return "سجل رصد نتائج الاختبارات الشامل";
            default: return "تقرير رسمي - نظام الإدارة";
        }
    },

    getSubTitle(stage, grade) {
        if (!stage) return "كافة المراحل والصفوف";
        const stageName = window.STUDENT_CONFIG.stageData[stage].name;
        if (!grade) return `المرحلة: ${stageName}`;
        const gradeName = window.STUDENT_CONFIG.gradeNames[stage][grade - 1];
        return `المرحلة: ${stageName} - ${gradeName}`;
    },

    syncInputValues() {
        document.querySelectorAll('input').forEach(input => {
            input.setAttribute('value', input.value);
        });
    },

    calculateSummaryStats(type, stage, grade, students) {
        let stats = {
            totalStudents: students.length,
            financial: "---",
            performance: "---",
            flagged: "0"
        };

        if (type === 'payments' || type === 'nonPayers' || type === 'reports') {
            const realNow = new Date().getMonth();
            const termSettings = window.PaymentsStore.getTermSettings(stage, grade);
            const { currentMonthInfo } = window.PaymentsStore.getCurrentMonthInfo(termSettings.firstTermMonths, termSettings.secondTermMonths);
            const startMonth = currentMonthInfo === 'first' ? termSettings.firstTermStartMonth : termSettings.secondTermStartMonth;
            
            let totalPotential = 0;
            let totalCollected = 0;
            let totalUnpaidStudents = 0;

            students.forEach(s => {
                const info = window.PaymentsStore.getStudentPaymentInfo(
                    stage, grade, s.id, realNow, currentMonthInfo, false, 
                    termSettings.firstTermMonths, termSettings.secondTermMonths, 
                    termSettings.firstTermStartMonth, termSettings.secondTermStartMonth
                );
                
                const fee = window.FinancialManager.getFee(stage, grade, realNow);
                totalPotential += fee;
                if (info.payments[realNow] === 'paid') totalCollected += fee;
                if (info.unpaidCount > 0) totalUnpaidStudents++;
            });

            stats.financial = `${totalCollected} / ${totalPotential} ج.م`;
            stats.flagged = totalUnpaidStudents;
            stats.performance = totalPotential > 0 ? Math.round((totalCollected/totalPotential)*100) + "% تحصيل" : "0%";
        } else if (type === 'exams' || type === 'examGrades') {
            const columns = window.ExamsData.loadExamColumns(stage, grade, 1);
            const grades = window.ExamsData.getGrades(stage, grade, 1);
            let totalScore = 0;
            let count = 0;
            let failedCount = 0;

            students.forEach(s => {
                const sGrades = grades[s.id] || {};
                Object.values(sGrades).forEach(v => {
                    const score = parseFloat(v);
                    if (!isNaN(score)) {
                        totalScore += score;
                        count++;
                        if (score < 25) failedCount++; // Dummy logic for failure
                    }
                });
            });

            stats.performance = count > 0 ? Math.round(totalScore/count) + " درجة (متوسط)" : "---";
            stats.flagged = failedCount;
        }

        return stats;
    },

    getActiveViewInfo() {
        const history = window.Navigation.history;
        const currentPage = history[history.length - 1];
        
        const views = {
            'students': { 
                containerId: 'studentsView', 
                type: 'students', 
                orientation: 'portrait' 
            },
            'payments': { 
                containerId: 'paymentsTableContainer', 
                type: 'payments', 
                orientation: 'landscape' 
            },
            'nonPayers': { 
                containerId: 'nonPayersTableContainerView', 
                type: 'nonPayers', 
                orientation: 'portrait' 
            },
            'groupAttendanceArchive': {
                containerId: 'groupAttendanceArchiveTableContainer',
                type: 'groupSessionAttendance',
                orientation: 'portrait'
            },
            'repeatedAbsence': {
                containerId: 'repeatedAbsenceTableContainer',
                type: 'repeatedAbsence',
                orientation: 'portrait'
            },
            'financialReports': { 
                containerId: 'detailedBreakdownTable', 
                type: 'reports', 
                orientation: 'landscape' 
            },
            'schedule': { 
                containerId: 'scheduleTableContainer', 
                type: 'schedule', 
                orientation: 'landscape' 
            },
            'examGrades': { 
                containerId: 'examGradesTableContainer', 
                type: 'examGrades', 
                orientation: (window.ExamsUI && window.ExamsUI.activeExamIdx === 'all') ? 'landscape' : 'portrait' 
            },
            'exams': { 
                containerId: 'examGradesTableContainer', 
                type: 'exams', 
                orientation: (window.ExamsUI && window.ExamsUI.activeExamIdx === 'all') ? 'landscape' : 'portrait' 
            }
        };

        return views[currentPage] || null;
    },

    /**
     * Build the Arabic filename used by the grades PDF exporter.
     *
     * `selectedFilter` can be either the internal filter key (for example
     * "failed") or the label shown in the filters toolbar. Supporting both
     * forms keeps the filename tied to the actual active view state while
     * still making this helper safe to call from other export entry points.
     */
    generateDynamicPdfFileName(examName, selectedFilter, gradeLevel, term) {
        // Keep compatibility with the previous three-argument helper:
        // (selectedFilter, gradeLevel, term).
        if (arguments.length === 3) {
            term = gradeLevel;
            gradeLevel = selectedFilter;
            selectedFilter = examName;
            examName = 'all';
        }

        const filterLabels = {
            all: 'جميع الطلاب',
            passed: 'الناجحين',
            failed: 'الراسبين',
            excellent: 'الطلاب الممتازين',
            verygood: 'تقدير جيد جداً',
            good: 'تقدير جيد',
            acceptable: 'تقدير مقبول',
            weak: 'الطلاب الضعاف',
            top10: 'الأوائل'
        };

        const filterInput = String(selectedFilter ?? '').trim().replace(/\s+/g, ' ');
        const filterLabelAliases = {
            'عرض الكل': 'all',
            'قائمة الناجحين': 'passed',
            'قائمة الناجحين / اجتياز الاختبار': 'passed',
            'الطلاب الناجحين / اجتياز الاختبار': 'passed',
            'قائمة الراسبين': 'failed',
            'ممتاز': 'excellent',
            'الطلاب الحاصلين على تقدير ممتاز': 'excellent',
            'جيد جداً': 'verygood',
            'الطلاب الحاصلين على تقدير جيد جداً': 'verygood',
            'جيد': 'good',
            'الطلاب الحاصلين على تقدير جيد': 'good',
            'مقبول': 'acceptable',
            'الطلاب الحاصلين على تقدير مقبول': 'acceptable',
            'ضعيف': 'weak',
            'الطلاب الحاصلين على تقدير ضعيف': 'weak',
            'قائمة الأوائل': 'top10',
            'قائمة الأوائل (أفضل 10 طلاب)': 'top10'
        };

        const filterKey = filterLabels[filterInput]
            ? filterInput
            : (filterLabelAliases[filterInput] || 'all');
        const cleanPart = value => String(value ?? '')
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const examInput = String(examName ?? '').trim();
        const cleanExam = cleanPart(!examInput || examInput === 'all'
            ? 'جميع الامتحانات'
            : examInput) || 'جميع الامتحانات';
        const cleanFilter = cleanPart(filterLabels[filterKey] || filterLabels.all) || filterLabels.all;
        const cleanGrade = cleanPart(gradeLevel) || 'الصف الدراسي';
        const termValue = String(term ?? '').trim();
        const termLabel = /2|الثاني/.test(termValue) ? 'الترم الثاني' : 'الترم الأول';

        return `كشف درجات - ${cleanExam} - ${cleanFilter} - ${cleanGrade} - ${cleanPart(termLabel)}.pdf`;
    },

    getGradesPdfExamName() {
        const activeExamIdx = window.ExamsUI?.activeExamIdx;
        if (activeExamIdx === 'all' || activeExamIdx === undefined || activeExamIdx === null) {
            return 'جميع الامتحانات';
        }

        const exam = window.ExamsUI?.examColumns?.[activeExamIdx];
        if (typeof exam === 'string' && exam.trim()) return exam;
        if (exam?.name) return exam.name;

        const examNumber = Number(activeExamIdx);
        return Number.isFinite(examNumber)
            ? `امتحان ${examNumber + 1}`
            : 'الامتحان المختار';
    },

    getGradesPdfGradeLabel() {
        const stage = window.GlobalStageFilter?.getActiveStage?.()
            || window.ExamsUI?.currentStage;
        const grade = window.GlobalStageFilter?.getActiveGrade?.()
            || window.ExamsUI?.currentGrade;
        const stageData = window.STUDENT_CONFIG?.stageData?.[stage];

        if (!stageData) return 'الصف الدراسي';
        if (stageData.isFlat || String(stage).startsWith('custom_')) {
            return stageData.name || 'الصف الدراسي';
        }

        const gradeNames = window.STUDENT_CONFIG?.gradeNames?.[stage] || [];
        return gradeNames[Number(grade) - 1] || (grade ? `الصف ${grade}` : stageData.name);
    },

    generateFilename(type, exportContext = null) {
        const stage = window.GlobalStageFilter.getActiveStage();
        const grade = window.GlobalStageFilter.getActiveGrade();

        if (type === 'examGrades' || type === 'exams') {
            const activeFilter = window.ExamsUI?.activeExamIdx === 'all'
                ? 'all'
                : (window.ExamsUI?.singleExamFilter || 'all');
            const term = window.ExamsUI?.currentTerm;
            return this.generateDynamicPdfFileName(
                this.getGradesPdfExamName(),
                activeFilter,
                this.getGradesPdfGradeLabel(),
                term
            );
        }
        
        let baseName = "";
        switch(type) {
            case 'students': baseName = "قائمة_الطلاب"; break;
            case 'payments': baseName = "سجل_المدفوعات"; break;
            case 'nonPayers': baseName = "كشف_الممتنعين"; break;
            case 'groupSessionAttendance': baseName = "كشف_حضور_المجموعة"; break;
            case 'expelledStudents':
                baseName = exportContext?.filter === 'manual'
                    ? "تقرير_الطلاب_المطرودين_يدويا"
                    : "تقرير_الطلاب_المطرودين_تلقائيا";
                break;
            case 'repeatedAbsence': baseName = "تقرير_الغياب_المتكرر"; break;
            case 'examGrades': baseName = "كشف_درجات_الاختبارات"; break;
            case 'reports': baseName = "التقرير_المالي"; break;
            case 'schedule': baseName = "جدول_المواعيد"; break;
            case 'exams': baseName = "رصد_الدرجات"; break;
            default: baseName = "مستند_نظام_الإدارة";
        }

        let suffix = "";
        if (stage) {
            const stageName = window.STUDENT_CONFIG.stageData[stage].name;
            suffix += `_${stageName}`;
            if (grade) {
                const gradeName = window.STUDENT_CONFIG.gradeNames[stage][grade - 1];
                suffix += `_${gradeName.replace(/ /g, "_")}`;
            }
        } else {
            suffix = "_العام";
        }

        return `${baseName}${suffix}.pdf`;
    }
};

// Initialize the print engine
window.PrintEngine.init();
