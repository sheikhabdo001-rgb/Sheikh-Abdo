// Student Profile Print & PDF Export System
window.ProfilePrint = {
    currentStudent: null,

    // These values are CSS pixels for an A4-sized 96dpi canvas. The paginator
    // deliberately keeps a protected zone at the bottom for the footer.
    PAGE_H: 1122,
    CONTENT_TOP: 40,
    HEADER_H: 290,
    ROW_H: 64,
    TABLE_HEADER_H: 46,
    TITLE_H: 64,
    SUMMARY_H: 72,
    FOOTER_SAFE: 140,

    setStudent(ctx) {
        this.currentStudent = ctx;
    },

    open() {
        const ctx = this.currentStudent;
        if (!ctx || !ctx.student) {
            alert('عذراً، لم يتم العثور على بيانات الطالب للطباعة.');
            return;
        }
        this.selectedScopes = [];
        document.querySelectorAll('#profilePrintModal .profile-scope-checkbox').forEach(input => {
            input.checked = false;
        });
        this.showStep(1);
        window.ModalManager.open('profilePrintModal');
        this.refreshStep1State();
    },

    close() {
        window.ModalManager.close('profilePrintModal');
    },

    init() {
        document.querySelectorAll('#profilePrintModal [data-scope]').forEach(btn => {
            btn.onclick = (event) => {
                this.toggleScope(btn.dataset.scope, event);
                this.refreshStep1State();
            };
        });

        document.querySelectorAll('#profilePrintModal [data-action]').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                const scopes = this.getSelectedScopes();
                this.close();
                setTimeout(() => this.execute(action, scopes), 200);
            };
        });

        const nextBtn = document.getElementById('printStepNext');
        if (nextBtn) nextBtn.onclick = () => this.showStep(2);

        const backBtn = document.getElementById('printStepBack');
        if (backBtn) backBtn.onclick = () => this.showStep(1);
    },

    showStep(step) {
        const s1 = document.getElementById('profilePrintStep1');
        const s2 = document.getElementById('profilePrintStep2');
        if (s1) s1.style.display = step === 1 ? 'flex' : 'none';
        if (s2) s2.style.display = step === 2 ? 'flex' : 'none';
    },

    refreshStep1State() {
        document.querySelectorAll('#profilePrintModal [data-scope]').forEach(btn => {
            const checkbox = btn.querySelector('.profile-scope-checkbox');
            const isSelected = Boolean(checkbox?.checked);
            btn.classList.toggle('selected', isSelected);
        });
        const nextBtn = document.getElementById('printStepNext');
        if (nextBtn) nextBtn.disabled = this.getSelectedScopes().length === 0;
    },

    toggleScope(scope, event) {
        const button = document.querySelector(`#profilePrintModal [data-scope="${scope}"]`);
        const checkbox = button?.querySelector('.profile-scope-checkbox');
        if (!checkbox) return;

        if (!event.target.closest('.profile-scope-checkbox')) {
            checkbox.checked = !checkbox.checked;
        }

        const optionButtons = [...document.querySelectorAll('#profilePrintModal [data-scope]')];
        const allButton = optionButtons.find(item => item.dataset.scope === 'all');
        const allCheckbox = allButton?.querySelector('.profile-scope-checkbox');
        const sectionButtons = optionButtons.filter(item => item.dataset.scope !== 'all');

        if (scope === 'all' && allCheckbox) {
            sectionButtons.forEach(item => {
                const itemCheckbox = item.querySelector('.profile-scope-checkbox');
                if (itemCheckbox) itemCheckbox.checked = allCheckbox.checked;
            });
        } else if (allCheckbox) {
            const allSectionsSelected = sectionButtons.every(item => item.querySelector('.profile-scope-checkbox')?.checked);
            allCheckbox.checked = allSectionsSelected;
        }
    },

    getSelectedScopes() {
        const selected = [...document.querySelectorAll('#profilePrintModal [data-scope] .profile-scope-checkbox:checked')]
            .map(input => input.closest('[data-scope]')?.dataset.scope)
            .filter(Boolean);
        if (selected.includes('all')) return ['attendance', 'finance', 'exams'];
        return ['attendance', 'finance', 'exams'].filter(scope => selected.includes(scope));
    },

    execute(action, scopes) {
        if (action === 'print') {
            this.printReport(scopes);
        } else if (action === 'download') {
            this.downloadPDF(scopes);
        } else if (action === 'both') {
            this.downloadPDF(scopes).then(() => {
                setTimeout(() => this.printReport(scopes), 500);
            });
        }
    },

    normalizeScopes(scopes) {
        if (Array.isArray(scopes)) {
            return ['attendance', 'finance', 'exams'].filter(scope => scopes.includes(scope));
        }
        if (scopes === 'all') return ['attendance', 'finance', 'exams'];
        return scopes && ['attendance', 'finance', 'exams'].includes(scopes) ? [scopes] : [];
    },

    buildFilename(scopes) {
        const scope = this.normalizeScopes(scopes);
        const name = (this.currentStudent && this.currentStudent.student && this.currentStudent.student.name) || 'طالب';
        const labels = {
            attendance: 'سجل الحضور والغياب',
            finance: 'السجل المالي والمدفوعات',
            exams: 'درجات سجل الامتحانات'
        };
        const typeLabel = scope.length === 3
            ? 'الشامل'
            : scope.map(item => labels[item]).join(' + ') || 'التقرير';
        return `كشف تفصيلي للطالب: ${name} - ${typeLabel}.pdf`;
    },

    escapePDFHTML(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    getAttendanceRows() {
        const ctx = this.currentStudent;
        const history = ctx.history || window.AttendanceStore.getStudentHistory(ctx.stage, ctx.grade, ctx.student.id);
        return history.map((h, idx) => {
            const dateObj = new Date(h.timestamp || h.date);
            const date = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const time = this.formatSessionTime(dateObj);
            const present = h.status === 'present';
            return {
                idx: idx + 1,
                date,
                dayName: h.dayName,
                time,
                groupName: h.groupName || '---',
                present,
                statusText: present ? 'حاضر' : 'غائب'
            };
        });
    },

    formatSessionTime(timeInput) {
        if (timeInput === undefined || timeInput === null || timeInput === '') return '';
        let date = timeInput instanceof Date ? timeInput : null;
        if (!date && typeof timeInput === 'string' && timeInput.includes(':')) {
            const [h, m] = timeInput.split(':').map(Number);
            date = new Date();
            date.setHours(h || 0, m || 0, 0, 0);
        }
        if (!date || isNaN(date.getTime())) return '';
        const h24 = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = h24 >= 12 ? 'م' : 'ص';
        const hours = h24 % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
    },

    getFinanceRows() {
        const ctx = this.currentStudent;
        const { stage, grade, student } = ctx;
        const termSettings = window.PaymentsStore.getTermSettings(stage, grade);
        const termMonths = [...termSettings.firstTermMonths, ...termSettings.secondTermMonths].sort((a, b) => a - b);
        const payments = JSON.parse(localStorage.getItem(`student_payments_${stage}_${grade}_${student.id}`) || '{}');
        const transactions = window.FinancialReportsUI?.getStudentTransactions
            ? window.FinancialReportsUI.getStudentTransactions(stage, grade, student.id)
            : [];
        const latestTransactionByMonth = new Map();
        transactions.forEach(transaction => {
            const monthKey = String(transaction.month);
            if (!latestTransactionByMonth.has(monthKey)) {
                latestTransactionByMonth.set(monthKey, transaction);
            }
        });
        const realNow = new Date().getMonth();

        return termMonths
            .map((m) => {
                const isPaid = payments[m] === 'paid';
                const isAbsent = payments[m] === 'absent';
                const latestTransaction = latestTransactionByMonth.get(String(m));
                const isReversal = !isPaid && latestTransaction?.type === 'reversal';
                const fee = window.FinancialManager.getStudentFee({ ...student, stage, grade }, m);
                const isFuture = m > realNow && !isPaid && !isAbsent && !isReversal;
                return { m, isPaid, isAbsent, isReversal, fee, isFuture };
            })
            .filter(row => !row.isFuture)
            .map((row, idx) => {
                const { m, isPaid, isAbsent, isReversal, fee } = row;

                let statusText = 'غير مدفوع';
                let paidAmount = 0;
                let remaining = fee;

                if (isPaid) {
                    statusText = 'تم السداد';
                    paidAmount = fee;
                    remaining = 0;
                } else if (isReversal) {
                    statusText = 'تم التراجع عن السداد';
                } else if (isAbsent) {
                    statusText = 'غياب شهر';
                    remaining = 0;
                }

                return {
                    idx: idx + 1,
                    month: window.MONTHS[m],
                    fee,
                    paidAmount,
                    remaining,
                    statusText,
                    isPaid,
                    isReversal
                };
            });
    },

    getFinanceActivityRows() {
        const ctx = this.currentStudent;
        if (!ctx || !ctx.student) return [];

        const { stage, grade, student } = ctx;
        const ledgerTransactions = window.FinancialReportsUI?.getStudentTransactions
            ? window.FinancialReportsUI.getStudentTransactions(stage, grade, student.id)
            : [];
        const profileTransactions = [
            ...(Array.isArray(ctx.activityLog) ? ctx.activityLog : []),
            ...(Array.isArray(student.activityLog) ? student.activityLog : []),
            ...(Array.isArray(student.transactions) ? student.transactions : []),
            ...ledgerTransactions
        ];
        const uniqueTransactions = new Map();

        profileTransactions.forEach(transaction => {
            if (!transaction || typeof transaction !== 'object') return;

            const dateTime = transaction.dateTime ||
                transaction.timestamp ||
                transaction.createdAt ||
                transaction.created_at ||
                transaction.date ||
                null;
            const monthIndex = Number(transaction.month);
            const month = transaction.monthName ||
                (Number.isInteger(monthIndex) && window.MONTHS?.[monthIndex]) ||
                transaction.month ||
                '---';
            const isReversal = transaction.type === 'reversal' ||
                transaction.type === 'refund' ||
                transaction.paymentType === 'reversal' ||
                transaction.action === 'PAYMENT_REVERSAL' ||
                /reversal|refund|تراجع|إلغاء/i.test(String(transaction.status || transaction.statusText || ''));
            const rawAmount = Number(
                transaction.amount ??
                transaction.amountPaid ??
                transaction.advancePayment ??
                0
            ) || 0;
            const amount = isReversal ? -Math.abs(rawAmount) : rawAmount;
            const statusText = transaction.statusText ||
                (isReversal ? 'تم التراجع عن السداد' : 'تم السداد');
            const details = transaction.description ||
                transaction.details ||
                transaction.notes ||
                (isReversal
                    ? `تراجع عن سداد شهر ${month}`
                    : `سداد شهر ${month}`);
            const identity = transaction.id ||
                transaction.transactionKey ||
                `${dateTime || ''}|${month}|${amount}|${details}`;

            if (!uniqueTransactions.has(identity)) {
                uniqueTransactions.set(identity, {
                    dateTime,
                    month,
                    amount,
                    statusText,
                    details,
                    isReversal,
                    timestamp: dateTime ? new Date(dateTime).getTime() : 0
                });
            }
        });

        return Array.from(uniqueTransactions.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((transaction, index) => ({
                ...transaction,
                idx: index + 1,
                dateTimeLabel: transaction.dateTime
                    ? this.formatActivityDateTime(transaction.dateTime)
                    : '---'
            }));
    },

    formatActivityDateTime(dateTime) {
        const date = new Date(dateTime);
        if (Number.isNaN(date.getTime())) return String(dateTime || '---');
        return `${date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })} ${date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`;
    },

    getExamRows() {
        const ctx = this.currentStudent;
        if (!ctx || !window.ProfileUI || !window.ProfileUI.getExamLedgerRows) return [];
        return window.ProfileUI.getExamLedgerRows(ctx.student.id, ctx.stage, ctx.grade);
    },

    headerMetaHTML() {
        const ctx = this.currentStudent;
        const { student, stageName, gradeName } = ctx;
        const joinDateValue = student.createdAt ? window.AppUtils.formatFullDateTime(student.createdAt) : 'غير مسجل';
        const joinDate = student.createdAt
            ? `<span style="direction:ltr;display:inline-block;unicode-bidi:embed;white-space:nowrap;">${joinDateValue}</span>`
            : joinDateValue;
        const cell = 'padding:8px 10px;border-bottom:1px dashed #ece7f5;font-size:12px;line-height:1.55;vertical-align:middle;letter-spacing:0;word-spacing:normal;';
        const label = 'color:#6b7280;font-weight:800;white-space:nowrap;';
        const value = 'color:#111827;font-weight:800;';
        return `
            <div class="rpt-header">
                <table style="width:100%;direction:rtl;text-align:right;border-collapse:collapse;margin-bottom:8px;letter-spacing:0;word-spacing:normal;">
                    <tr>
                        <td colspan="4" style="text-align:center;font-size:22px;font-weight:900;color:#6d28d9;padding:10px 0 12px;border-bottom:2px solid #edd9ff;line-height:1.45;letter-spacing:0;word-spacing:normal;">كشف&nbsp;تفصيلي&nbsp;للطالب:&nbsp;<span style="color:#4c1d95;">${student.name}</span></td>
                    </tr>
                    <tr>
                        <td style="width:18%;${cell}"><span style="${label}">اسم&nbsp;الطالب:</span></td>
                        <td style="width:32%;${cell}"><span style="${value}">${student.name}</span></td>
                        <td style="width:18%;${cell}"><span style="${label}">المرحلة&nbsp;/&nbsp;الصف:</span></td>
                        <td style="width:32%;${cell}"><span style="${value}">${stageName}&nbsp;-&nbsp;${gradeName}</span></td>
                    </tr>
                    <tr>
                        <td style="width:18%;${cell}"><span style="${label}">كود&nbsp;الطالب:</span></td>
                        <td style="width:32%;${cell}"><span style="${value}">${student.studentCode || '------'}</span></td>
                        <td style="width:18%;${cell}"><span style="${label}">هاتف&nbsp;الطالب:</span></td>
                        <td style="width:32%;${cell}"><span style="${value}">${student.phone || '---'}</span></td>
                    </tr>
                    <tr>
                        <td style="width:18%;${cell}"><span style="${label}">هاتف&nbsp;ولي&nbsp;الأمر:</span></td>
                        <td style="width:32%;${cell}"><span style="${value}">${student.parentPhone || '---'}</span></td>
                        <td style="width:18%;${cell}"><span style="${label}">تاريخ&nbsp;الانضمام:</span></td>
                        <td style="width:32%;${cell}direction:ltr;text-align:right;"><span style="${value}">${joinDate}</span></td>
                    </tr>
                </table>
            </div>`;
    },

    buildPages(scopes) {
        const selectedScopes = this.normalizeScopes(scopes);
        const includeAttendance = selectedScopes.includes('attendance');
        const includeFinance = selectedScopes.includes('finance');
        const includeExams = selectedScopes.includes('exams');
        const attRows = includeAttendance ? this.getAttendanceRows() : [];
        const finRows = includeFinance ? this.getFinanceRows() : [];
        const examRows = includeExams ? this.getExamRows() : [];

        const PAGE_H = this.PAGE_H;
        const CONTENT_TOP = this.CONTENT_TOP;
        const HEADER_H = this.HEADER_H;
        const ROW_H = this.ROW_H;
        const TABLE_HEADER_H = this.TABLE_HEADER_H;
        const TITLE_H = this.TITLE_H;
        const SUMMARY_H = this.SUMMARY_H;
        const FOOTER_SAFE = this.FOOTER_SAFE;
        const CONTENT_LIMIT = PAGE_H - FOOTER_SAFE;

        let pages = [];
        let cur = null;
        const newPage = (withHeader) => {
            // Every page, including continuation pages, starts below the
            // printable top margin. The old paginator started at 0 here,
            // overestimating the available height by the top margin.
            cur = { used: withHeader ? HEADER_H : CONTENT_TOP, blocks: [] };
            pages.push(cur);
        };
        newPage(true);
        cur.blocks.push(this.headerMetaHTML());

        let curTable = null;
        const closeTable = () => {
            if (curTable) {
                curTable.html.push('</tbody>', '</table>');
                cur.blocks.push(curTable.html.join(''));
                curTable = null;
            }
        };
        const openTable = (headers, cls, colgroup) => {
            curTable = {
                cls,
                colgroup,
                html: ['<table class="rpt-table ' + cls + '">', colgroup, `<thead><tr>${headers}</tr></thead>`, '<tbody>']
            };
        };
        const addRow = (headersHtml, rowHtml, rowHeight = ROW_H) => {
            if (cur.used + rowHeight > CONTENT_LIMIT) {
                const tableClass = curTable.cls;
                const tableColgroup = curTable.colgroup;
                closeTable();
                newPage(false);
                openTable(headersHtml, tableClass, tableColgroup);
                cur.used += TABLE_HEADER_H;
            }
            curTable.html.push(rowHtml);
            cur.used += rowHeight;
        };
        const addSummary = (html, h) => {
            if (cur.used + h > CONTENT_LIMIT) newPage(false);
            cur.blocks.push(html);
            cur.used += h;
        };
        const addTableSection = ({
            title,
            headers,
            cls,
            colgroup,
            rows,
            emptyText,
            summary,
            rowHeight = ROW_H
        }) => {
            // Keep the section heading, table heading, and at least one row
            // together. This is the important preflight that prevents a
            // section from starting in the footer zone.
            const firstBlockHeight = TITLE_H + TABLE_HEADER_H + (rows.length ? rowHeight : 0);
            if (cur.used + firstBlockHeight > CONTENT_LIMIT) newPage(false);

            cur.blocks.push(`<div class="pdf-section rpt-section-title">${title}</div>`);
            cur.used += TITLE_H;
            openTable(headers, `pdf-table ${cls}`, colgroup);
            cur.used += TABLE_HEADER_H;

            if (rows.length === 0) {
                curTable.html.push(`<tr><td colspan="${headers.match(/<th/g).length}" class="rpt-empty">${emptyText}</td></tr>`);
            } else {
                rows.forEach(row => addRow(headers, row, rowHeight));
            }
            closeTable();
            if (summary) addSummary(summary.html, summary.height);
        };

        const ATT_HEADERS = `
            <th>م</th><th>تاريخ الجلسة</th><th>اليوم</th><th>الوقت</th><th>اسم المجموعة / الحصة</th><th>الحالة</th>`;
        const ATT_COLGROUP = `
            <colgroup><col style="width:6%"><col style="width:20%"><col style="width:13%"><col style="width:13%"><col style="width:34%"><col style="width:14%"></colgroup>`;
        const FIN_HEADERS = `
            <th>م</th><th>الشهر المستحق</th><th>قيمة الاشتراك</th><th>المبلغ المدفوع</th><th>المتبقي / المستحقات</th><th>حالة السداد</th>`;
        const FIN_COLGROUP = `
            <colgroup><col style="width:6%"><col style="width:20%"><col style="width:18%"><col style="width:18%"><col style="width:20%"><col style="width:18%"></colgroup>`;
        const EXAM_HEADERS = `
            <th>م</th><th>اسم الامتحان</th><th>درجة الطالب</th><th>تقدير الطالب</th><th>حالة الامتحان</th>`;
        const EXAM_COLGROUP = `
            <colgroup><col style="width:7%"><col style="width:31%"><col style="width:20%"><col style="width:22%"><col style="width:20%"></colgroup>`;
        const ACTIVITY_HEADERS = `
            <th>م</th><th>التاريخ والوقت</th><th>الشهر</th><th>المبلغ</th><th>الحالة</th><th>التفاصيل</th>`;
        const ACTIVITY_COLGROUP = `
            <colgroup><col style="width:6%"><col style="width:20%"><col style="width:15%"><col style="width:14%"><col style="width:18%"><col style="width:27%"></colgroup>`;

        if (includeAttendance) {
            const presentCount = attRows.filter(r => r.present).length;
            const absentCount = attRows.filter(r => !r.present).length;
            addTableSection({
                title: 'سجل الحضور والغياب',
                headers: ATT_HEADERS,
                cls: 'rpt-att-table',
                colgroup: ATT_COLGROUP,
                rows: attRows.map(r => `
                    <tr>
                        <td>${r.idx}</td><td>${r.date}</td><td>${r.dayName}</td><td class="rpt-time">${r.time}</td>
                        <td>${r.groupName}</td>
                        <td><span class="rpt-badge ${r.present ? 'ok' : 'no'}">${r.statusText}</span></td>
                    </tr>`),
                emptyText: 'لا توجد سجلات حضور',
                summary: { html: this.attendanceSummaryHTML(presentCount, absentCount), height: SUMMARY_H }
            });
        }

        if (includeFinance) {
            const totalDebt = finRows.reduce((sum, r) => sum + (r.remaining || 0), 0);
            addTableSection({
                title: 'السجل المالي والمدفوعات',
                headers: FIN_HEADERS,
                cls: 'rpt-fin-table',
                colgroup: FIN_COLGROUP,
                rows: finRows.map(r => `
                    <tr>
                        <td>${r.idx}</td><td>${r.month}</td><td>${r.fee} ج.م</td>
                        <td>${r.paidAmount} ج.م</td><td>${r.remaining} ج.م</td>
                        <td><span class="rpt-badge ${r.isPaid ? 'ok' : 'no'}">${r.statusText}</span></td>
                    </tr>`),
                emptyText: 'لا توجد سجلات مالية',
                summary: { html: this.debtSummaryHTML(totalDebt), height: SUMMARY_H }
            });

            const activityRows = this.getFinanceActivityRows();
            addTableSection({
                title: 'سجل الحركة المالية والعمليات',
                headers: ACTIVITY_HEADERS,
                cls: 'rpt-activity-table',
                colgroup: ACTIVITY_COLGROUP,
                rows: activityRows.map(row => `
                    <tr>
                        <td>${this.escapePDFHTML(row.idx)}</td>
                        <td class="rpt-activity-date">${this.escapePDFHTML(row.dateTimeLabel)}</td>
                        <td>${this.escapePDFHTML(row.month)}</td>
                        <td class="rpt-activity-amount ${row.isReversal ? 'negative' : 'positive'}">
                            ${this.escapePDFHTML(row.amount)} ج.م
                        </td>
                        <td>
                            <span class="rpt-badge ${row.isReversal ? 'reversal' : 'paid'}">
                                ${this.escapePDFHTML(row.statusText)}
                            </span>
                        </td>
                        <td class="rpt-activity-details">${this.escapePDFHTML(row.details)}</td>
                    </tr>`),
                emptyText: 'لا توجد حركات مالية',
                rowHeight: 72
            });
        }

        if (includeExams) {
            const examPresent = examRows.filter(r => r.present).length;
            const examAbsent = examRows.filter(r => !r.present).length;
            addTableSection({
                title: 'درجات سجل الامتحانات',
                headers: EXAM_HEADERS,
                cls: 'rpt-exam-table',
                colgroup: EXAM_COLGROUP,
                rows: examRows.map(r => `
                    <tr>
                        <td>${r.idx}</td>
                        <td>${r.title}<small class="rpt-term-label">الترم ${r.term === 1 ? 'الأول' : 'الثاني'}</small></td>
                        <td class="rpt-score" dir="ltr">${r.score} / ${r.maxScore}</td>
                        <td><span class="rpt-badge ${r.assessmentClass === 'est-absent' ? 'no' : 'assessment'}">${r.assessment}</span></td>
                        <td><span class="rpt-badge ${r.present ? 'ok' : 'no'}">${r.present ? 'حاضر' : 'غائب'}</span></td>
                    </tr>`),
                emptyText: 'لا توجد سجلات امتحانات',
                summary: { html: this.examSummaryHTML(examPresent, examAbsent), height: SUMMARY_H }
            });
        }

        // Wrap pages with watermark + footer
        const teacherName = window.Auth.getTeacherName();
        const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        return pages.map((pg, idx) => `
            <div class="report-page" style="break-after: page; page-break-after: always;">
                <div class="page-content">
                    ${pg.blocks.join('')}
                </div>
                <div class="rpt-watermark">
                    <span>${teacherName}</span>
                    <span>${teacherName}</span>
                    <span>${teacherName}</span>
                </div>
                <div class="rpt-footer">
                    <span>Programmer Mazen</span>
                    <span class="rpt-doc-meta">${today}</span>
                </div>
            </div>`).join('');
    },

    buildBodyHTML(scopes) {
        return `<div class="report-doc pdf-print-container" dir="rtl">${this.buildPages(scopes)}</div>`;
    },

    attendanceSummaryHTML(presentCount, absentCount) {
        return `
            <div class="rpt-att-summary">
                <div class="rpt-sum-card present"><span>عدد&nbsp;أيام&nbsp;الحضور:</span><strong>${presentCount}&nbsp;يوم</strong></div>
                <div class="rpt-sum-card absent"><span>عدد&nbsp;أيام&nbsp;الغياب:</span><strong>${absentCount}&nbsp;يوم</strong></div>
            </div>`;
    },

    debtSummaryHTML(totalDebt) {
        return `
            <div class="rpt-debt-card">إجمالي&nbsp;المديونية&nbsp;المستحقة:&nbsp;<strong>${totalDebt}&nbsp;ج.م</strong></div>`;
    },

    examSummaryHTML(presentCount, absentCount) {
        return `
            <div class="rpt-att-summary">
                <div class="rpt-sum-card present"><span>الامتحانات&nbsp;الحاضرة:</span><strong>${presentCount}&nbsp;امتحان</strong></div>
                <div class="rpt-sum-card absent"><span>الامتحانات&nbsp;الغائبة:</span><strong>${absentCount}&nbsp;امتحان</strong></div>
            </div>`;
    },

    buildStandaloneHTML(scopes) {
        return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${this.buildFilename(scopes).replace('.pdf', '')}</title>
<style>${this.REPORT_CSS}</style>
</head>
<body>${this.buildBodyHTML(scopes)}</body>
</html>`;
    },

    buildPDFTableHTML({ headers, rows, emptyText }) {
        const body = rows.length
            ? rows.join('')
            : `<tr><td colspan="${headers.match(/<th\b/g)?.length || 1}" class="pdf-export-empty">${this.escapePDFHTML(emptyText)}</td></tr>`;

        return `
            <table class="pdf-export-table" dir="rtl">
                <thead><tr>${headers}</tr></thead>
                <tbody>${body}</tbody>
            </table>`;
    },

    buildPDFStudentData(scopes) {
        const ctx = this.currentStudent;
        const { student, stageName, gradeName } = ctx;
        const selectedScopes = this.normalizeScopes(scopes);
        const includeAttendance = selectedScopes.includes('attendance');
        const includeFinance = selectedScopes.includes('finance');
        const includeExams = selectedScopes.includes('exams');
        const attRows = includeAttendance ? this.getAttendanceRows() : [];
        const finRows = includeFinance ? this.getFinanceRows() : [];
        const activityRows = includeFinance ? this.getFinanceActivityRows() : [];
        const examRows = includeExams ? this.getExamRows() : [];
        const esc = value => this.escapePDFHTML(value);

        const attendanceHeaders = `
            <th>م</th><th>تاريخ الجلسة</th><th>اليوم</th><th>الوقت</th><th>اسم المجموعة / الحصة</th><th>الحالة</th>`;
        const financialHeaders = `
            <th>م</th><th>الشهر المستحق</th><th>قيمة الاشتراك</th><th>المبلغ المدفوع</th><th>المتبقي / المستحقات</th><th>حالة السداد</th>`;
        const activityHeaders = `
            <th>م</th><th>التاريخ والوقت</th><th>الشهر</th><th>المبلغ</th><th>الحالة</th><th>التفاصيل</th>`;
        const examHeaders = `
            <th>م</th><th>اسم الامتحان</th><th>درجة الطالب</th><th>تقدير الطالب</th><th>حالة الامتحان</th>`;

        const attendanceRows = attRows.map(row => `
            <tr>
                <td>${esc(row.idx)}</td><td>${esc(row.date)}</td><td>${esc(row.dayName)}</td>
                <td class="pdf-export-ltr">${esc(row.time)}</td><td>${esc(row.groupName)}</td>
                <td><span class="pdf-export-badge ${row.present ? 'is-present' : 'is-absent'}">${esc(row.statusText)}</span></td>
            </tr>`);
        const financialRows = finRows.map(row => `
            <tr>
                <td>${esc(row.idx)}</td><td>${esc(row.month)}</td><td>${esc(row.fee)} ج.م</td>
                <td>${esc(row.paidAmount)} ج.م</td><td>${esc(row.remaining)} ج.م</td>
                <td><span class="pdf-export-badge ${row.isPaid ? 'is-present' : 'is-absent'}">${esc(row.statusText)}</span></td>
            </tr>`);
        const activityRowsHTML = activityRows.map(row => `
            <tr class="pdf-export-activity-row">
                <td>${esc(row.idx)}</td>
                <td class="pdf-export-ltr">${esc(row.dateTimeLabel)}</td>
                <td>${esc(row.month)}</td>
                <td class="${row.isReversal ? 'pdf-export-activity-negative' : 'pdf-export-activity-positive'}">
                    ${esc(row.amount)} ج.م
                </td>
                <td><span class="pdf-export-badge ${row.isReversal ? 'is-reversal' : 'is-payment'}">${esc(row.statusText)}</span></td>
                <td>${esc(row.details)}</td>
            </tr>`);
        const examRowsHTML = examRows.map(row => `
            <tr>
                <td>${esc(row.idx)}</td><td>${esc(row.title)}<small class="pdf-export-term">الترم ${row.term === 1 ? 'الأول' : 'الثاني'}</small></td>
                <td class="pdf-export-ltr">${esc(row.score)} / ${esc(row.maxScore)}</td>
                <td><span class="pdf-export-badge ${row.assessmentClass === 'est-absent' ? 'is-absent' : 'is-assessment'}">${esc(row.assessment)}</span></td>
                <td><span class="pdf-export-badge ${row.present ? 'is-present' : 'is-absent'}">${row.present ? 'حاضر' : 'غائب'}</span></td>
            </tr>`);

        const joinDate = student.createdAt
            ? window.AppUtils.formatFullDateTime(student.createdAt)
            : 'غير مسجل';
        const section = (title, tableHTML) => `
            <div class="pdf-export-section-title">${title}</div>
            ${tableHTML}`;

        return {
            name: student.name || 'طالب',
            grade: `${stageName || ''} - ${gradeName || ''}`.replace(/^ - | - $/g, ''),
            code: student.studentCode || '------',
            phone: student.phone || '---',
            parentPhone: student.parentPhone || '---',
            joinDate,
            attendanceTableHTML: section(
                'سجل الحضور والغياب',
                this.buildPDFTableHTML({
                    headers: attendanceHeaders,
                    rows: attendanceRows,
                    emptyText: 'لا توجد سجلات حضور'
                })
            ),
            financialTableHTML: section(
                'السجل المالي والمدفوعات',
                this.buildPDFTableHTML({
                    headers: financialHeaders,
                    rows: financialRows,
                    emptyText: 'لا توجد سجلات مالية'
                })
            ),
            financialActivityTableHTML: section(
                'سجل الحركة المالية والعمليات',
                this.buildPDFTableHTML({
                    headers: activityHeaders,
                    rows: activityRowsHTML,
                    emptyText: 'لا توجد حركات مالية'
                })
            ),
            examTableHTML: section(
                'درجات سجل الامتحانات',
                this.buildPDFTableHTML({
                    headers: examHeaders,
                    rows: examRowsHTML,
                    emptyText: 'لا توجد سجلات امتحانات'
                })
            ),
            includeAttendance,
            includeFinancial: includeFinance,
            includeExams
        };
    },

    async generateStudentPDFLegacy(studentData) {
        // This template is deliberately independent from the screen and print
        // DOM. In particular, it has no fixed-height page wrapper and no
        // page-break-before/page-break-after rules.
        const printElement = document.createElement('div');
        printElement.id = 'printable-student-report';
        printElement.className = 'pdf-export-root';
        printElement.style.display = 'block';
        printElement.style.position = 'fixed';
        printElement.style.left = '-9999px';
        printElement.style.top = '0';
        printElement.style.width = '794px';
        printElement.style.height = 'auto';
        printElement.style.minHeight = '0';
        printElement.style.padding = '20px';
        printElement.style.boxSizing = 'border-box';
        printElement.style.overflow = 'visible';
        printElement.style.backgroundColor = '#ffffff';
        printElement.style.direction = 'rtl';
        printElement.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
        printElement.style.color = '#000000';

        const sections = [
            studentData.includeAttendance ? studentData.attendanceTableHTML : '',
            studentData.includeFinancial ? studentData.financialTableHTML : '',
            studentData.includeFinancial ? studentData.financialActivityTableHTML : '',
            studentData.includeExams ? studentData.examTableHTML : ''
        ].join('');
        const name = this.escapePDFHTML(studentData.name);
        const grade = this.escapePDFHTML(studentData.grade);
        const code = this.escapePDFHTML(studentData.code);
        const phone = this.escapePDFHTML(studentData.phone);
        const parentPhone = this.escapePDFHTML(studentData.parentPhone);
        const joinDate = this.escapePDFHTML(studentData.joinDate);

        printElement.innerHTML = `
            <style>
                .pdf-export-root, .pdf-export-root * { box-sizing: border-box; }
                .pdf-export-root .pdf-export-section-title {
                    background: #8b5cf6; color: #fff; text-align: center;
                    font-weight: 700; padding: 6px; border-radius: 4px;
                    font-size: 14px; margin: 15px 0 6px; line-height: 1.5;
                    break-after: avoid; page-break-after: avoid;
                }
                .pdf-export-root .pdf-export-section-title:first-child { margin-top: 0; }
                .pdf-export-root .pdf-export-table {
                    width: 100%; border-collapse: collapse; direction: rtl;
                    text-align: right; font-size: 12px; color: #000;
                    background: #fff; table-layout: fixed;
                }
                .pdf-export-root .pdf-export-table th,
                .pdf-export-root .pdf-export-table td {
                    border: 1px solid #d8d8d8; padding: 6px 5px;
                    vertical-align: middle; overflow-wrap: anywhere;
                }
                .pdf-export-root .pdf-export-table th {
                    background: #f0e8ff; color: #4c1d95;
                    font-weight: 700; text-align: center;
                }
                .pdf-export-root .pdf-export-table td { text-align: center; }
                .pdf-export-root .pdf-export-table tbody tr:nth-child(even) {
                    background: #faf8ff;
                }
                .pdf-export-root .pdf-export-table thead {
                    display: table-header-group;
                }
                .pdf-export-root .pdf-export-table tr {
                    break-inside: avoid; page-break-inside: avoid;
                }
                .pdf-export-root .pdf-export-empty {
                    color: #777; text-align: center; padding: 12px;
                }
                .pdf-export-root .pdf-export-ltr {
                    direction: ltr; unicode-bidi: embed; white-space: nowrap;
                }
                .pdf-export-root .pdf-export-badge {
                    display: inline-block; padding: 2px 8px; border-radius: 12px;
                    font-weight: 700; white-space: nowrap;
                }
                .pdf-export-root .pdf-export-badge.is-present {
                    background: #dcfce7; color: #166534;
                }
                .pdf-export-root .pdf-export-badge.is-absent {
                    background: #fee2e2; color: #991b1b;
                }
                .pdf-export-root .pdf-export-badge.is-payment {
                    background: #dcfce7; color: #14532d;
                    border: 1px solid #86efac;
                }
                .pdf-export-root .pdf-export-badge.is-reversal {
                    background: #fee2e2; color: #7f1d1d;
                    border: 1px solid #fca5a5;
                }
                .pdf-export-root .pdf-export-activity-row {
                    break-inside: avoid; page-break-inside: avoid;
                }
                .pdf-export-root .pdf-export-activity-positive {
                    color: #14532d; font-weight: 800; direction: ltr;
                }
                .pdf-export-root .pdf-export-activity-negative {
                    color: #991b1b; font-weight: 800; direction: ltr;
                }
                .pdf-export-root .pdf-export-badge.is-assessment {
                    background: #ede9fe; color: #6d28d9;
                }
                .pdf-export-root .pdf-export-term {
                    display: block; color: #777; font-size: 10px; margin-top: 2px;
                }
            </style>
            <div style="width:100%;position:relative;">
                <div style="border:2px solid #8b5cf6;border-radius:10px;padding:12px;margin-bottom:15px;break-inside:avoid;page-break-inside:avoid;">
                    <h3 style="text-align:center;color:#6d28d9;margin:0 0 10px 0;font-size:18px;line-height:1.5;">
                        كشف&nbsp;تفصيلي&nbsp;للطالب:&nbsp;${name}
                    </h3>
                    <table style="width:100%;font-size:12px;border-collapse:collapse;direction:rtl;text-align:right;">
                        <tr>
                            <td style="font-weight:bold;width:15%;padding:4px;">اسم&nbsp;الطالب:</td>
                            <td style="width:35%;padding:4px;">${name}</td>
                            <td style="font-weight:bold;width:18%;padding:4px;">المرحلة&nbsp;/&nbsp;الصف:</td>
                            <td style="width:32%;padding:4px;">${grade}</td>
                        </tr>
                        <tr>
                            <td style="font-weight:bold;padding:4px;">كود&nbsp;الطالب:</td>
                            <td style="padding:4px;">${code}</td>
                            <td style="font-weight:bold;padding:4px;">هاتف&nbsp;الطالب:</td>
                            <td style="padding:4px;">${phone}</td>
                        </tr>
                        <tr>
                            <td style="font-weight:bold;padding:4px;">هاتف&nbsp;ولي&nbsp;الأمر:</td>
                            <td style="padding:4px;">${parentPhone}</td>
                            <td style="font-weight:bold;padding:4px;">تاريخ&nbsp;الانضمام:</td>
                            <td style="padding:4px;direction:ltr;text-align:right;">${joinDate}</td>
                        </tr>
                    </table>
                </div>
                ${sections}
                <div style="margin-top:20px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#777;display:flex;justify-content:space-between;direction:ltr;">
                    <span>Programmer Mazen</span>
                    <span>${new Date().toLocaleDateString('ar-EG')}</span>
                </div>
            </div>`;

        // Clone the fully-built template so the source can never be affected
        // by html2canvas's layout work or by the cleanup that follows export.
        const clone = printElement.cloneNode(true);
        clone.id = 'printable-student-report-export';
        clone.classList.remove('print-only-hidden', 'd-none', 'print-only');
        clone.style.display = 'block';
        clone.style.position = 'fixed';
        // Keep the clone inside the layout tree. A far-negative position can
        // produce a zero/blank canvas in some html2canvas/browser versions.
        // The negative stacking level keeps it behind the visible app.
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.zIndex = '-9999';
        clone.style.width = '794px';
        clone.style.height = 'auto';
        clone.style.minHeight = '0';
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        clone.style.backgroundColor = '#ffffff';
        clone.style.direction = 'rtl';
        clone.style.visibility = 'visible';
        document.body.appendChild(clone);

        try {
            // Fonts and layout must settle while the clone is still mounted
            // and visible to the renderer.
            await this.waitForPDFFonts();
            await new Promise(resolve => setTimeout(resolve, 300));

            if (typeof window.html2canvas !== 'function') {
                throw new Error('مكتبة رسم صفحات PDF غير محملة.');
            }
            const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
            if (typeof jsPDFConstructor !== 'function') {
                throw new Error('مكتبة إنشاء PDF غير محملة.');
            }

            const canvas = await window.html2canvas(clone, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                logging: false,
                letterRendering: false,
                foreignObjectRendering: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794,
                onclone: clonedDocument => {
                    const clonedElement = clonedDocument.getElementById(
                        'printable-student-report-export'
                    );
                    if (!clonedElement) return;
                    clonedElement.style.display = 'block';
                    clonedElement.style.visibility = 'visible';
                    clonedElement.style.opacity = '1';
                    clonedElement.style.position = 'absolute';
                    clonedElement.style.left = '0';
                    clonedElement.style.top = '0';
                    clonedElement.style.zIndex = '0';
                    clonedElement.style.direction = 'rtl';
                    clonedElement.style.fontFamily =
                        "'Cairo', 'Tajawal', Arial, sans-serif";
                    clonedElement.style.letterSpacing = 'normal';
                    clonedElement.style.wordSpacing = 'normal';
                }
            });

            const pdf = new jsPDFConstructor({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });
            const pageWidthMm = 210;
            const pageHeightMm = 297;
            const sourcePageHeight = Math.max(
                1,
                Math.floor(canvas.width * pageHeightMm / pageWidthMm)
            );
            let offsetY = 0;
            let pageIndex = 0;

            while (offsetY < canvas.height) {
                const sliceHeight = Math.min(
                    sourcePageHeight,
                    canvas.height - offsetY
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
                    offsetY,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                if (pageIndex > 0) pdf.addPage('a4', 'portrait');
                pdf.addImage(
                    pageCanvas.toDataURL('image/jpeg', 0.98),
                    'JPEG',
                    0,
                    0,
                    pageWidthMm,
                    sliceHeight * pageWidthMm / canvas.width,
                    undefined,
                    'FAST'
                );
                pageCanvas.width = 0;
                pageCanvas.height = 0;
                offsetY += sliceHeight;
                pageIndex += 1;
            }

            pdf.save(`كشف_تفصيلي_${studentData.name}.pdf`);
        } finally {
            clone.remove();
        }
    },

    makePDFPrintHost(scope) {
        const host = document.createElement('div');
        host.id = 'printable-student-report';
        host.style.position = 'absolute';
        host.style.left = '0';
        host.style.top = '0';
        host.style.width = '794px';
        host.style.height = 'auto';
        host.style.minHeight = '0';
        host.style.display = 'block';
        host.style.visibility = 'visible';
        host.style.overflow = 'visible';
        host.style.opacity = '0';
        host.style.pointerEvents = 'none';
        host.style.zIndex = '2147483647';
        host.style.backgroundColor = '#ffffff';
        host.style.direction = 'rtl';
        host.style.fontFamily = "'Cairo', 'Tajawal', Arial, sans-serif";
        host.style.color = '#000000';
        host.innerHTML = `<style>${this.REPORT_CSS}</style>${this.buildBodyHTML(scope)}`;
        document.body.appendChild(host);
        return host;
    },

    async waitForPDFImages(root) {
        const images = Array.from(root.querySelectorAll('img'));
        await Promise.all(images.map(image => {
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => {
                const done = () => {
                    image.removeEventListener('load', done);
                    image.removeEventListener('error', done);
                    resolve();
                };
                image.addEventListener('load', done, { once: true });
                image.addEventListener('error', done, { once: true });
            });
        }));
    },

    async generateStudentPDF(scope) {
        if (typeof window.html2canvas !== 'function') {
            throw new Error('مكتبة رسم صفحات PDF غير محملة.');
        }
        const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF
            ? window.jspdf.jsPDF
            : window.jsPDF;
        if (typeof jsPDFConstructor !== 'function') {
            throw new Error('مكتبة إنشاء PDF غير محملة.');
        }

        // Use the exact same report markup/CSS as the working print preview.
        // Each fixed report-page is captured separately so a text-based
        // HTML-to-PDF page-break parser cannot alter the Arabic layout.
        const host = this.makePDFPrintHost(scope);
        try {
            await this.waitForPDFFonts();
            await this.waitForPDFImages(host);
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(() => setTimeout(resolve, 300));
            }));

            const reportPages = Array.from(host.querySelectorAll('.report-page'));
            if (!reportPages.length) {
                throw new Error('لم يتم العثور على صفحات التقرير بعد اكتمال الرسم.');
            }

            const pdf = new jsPDFConstructor({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });

            for (let index = 0; index < reportPages.length; index += 1) {
                const page = reportPages[index];
                const rect = page.getBoundingClientRect();
                if (!rect.width || !rect.height) {
                    throw new Error('تعذر قياس صفحة التقرير قبل إنشاء PDF.');
                }

                const canvas = await window.html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    letterRendering: false,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: 794,
                    windowHeight: 1122,
                    onclone: clonedDocument => {
                        // The source host stays visually out of the way. Make
                        // its cloned copy fully visible before html2canvas
                        // computes the page bitmap.
                        const clonedHost = clonedDocument.getElementById('printable-student-report');
                        if (clonedHost) {
                            clonedHost.style.opacity = '1';
                            clonedHost.style.visibility = 'visible';
                            clonedHost.style.display = 'block';
                            clonedHost.style.position = 'absolute';
                            clonedHost.style.left = '0';
                            clonedHost.style.top = '0';
                            clonedHost.style.zIndex = '0';
                        }
                    }
                });

                if (!canvas.width || !canvas.height) {
                    throw new Error('تم إنشاء لوحة PDF فارغة.');
                }

                if (index > 0) pdf.addPage('a4', 'portrait');
                const imageData = canvas.toDataURL('image/jpeg', 0.98);
                pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }

            pdf.save(this.buildFilename(scope));
        } finally {
            host.remove();
        }
    },

    async waitForPDFFonts() {
        // html2canvas measures Arabic glyphs synchronously. Do not let it see
        // the fallback font, even briefly, while the PDF template is mounted.
        if (!document.fonts) return;

        await document.fonts.ready;
        await Promise.all([
            document.fonts.load('400 16px Cairo'),
            document.fonts.load('700 16px Cairo'),
            document.fonts.load('800 16px Cairo'),
            document.fonts.load('900 22px Cairo'),
            document.fonts.load('400 16px Tajawal'),
            document.fonts.load('700 16px Tajawal')
        ]);
    },

    async downloadPDF(scope) {
        try {
            await this.generateStudentPDF(scope);
        } catch (e) {
            alert('تعذر تنزيل PDF: ' + (e && e.message ? e.message : e));
        }
    },

    printReport(scope) {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.title = 'طباعة التقرير';
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(this.buildStandaloneHTML(scope));
        doc.close();

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            iframe.contentWindow.removeEventListener('afterprint', cleanup);
            iframe.remove();
        };

        const waitForPrintResources = async () => {
            if (doc.fonts?.ready) {
                await doc.fonts.ready;
                await Promise.all([
                    doc.fonts.load('400 16px Cairo'),
                    doc.fonts.load('700 16px Cairo'),
                    doc.fonts.load('800 20px Cairo'),
                    doc.fonts.load('400 16px Tajawal'),
                    doc.fonts.load('700 16px Tajawal')
                ]);
            }

            const images = Array.from(doc.images || []);
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
                iframe.contentWindow.requestAnimationFrame(() => {
                    iframe.contentWindow.requestAnimationFrame(resolve);
                });
            });
        };

        waitForPrintResources().then(() => {
            iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true });
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            // Fallback for browsers that omit afterprint on a hidden frame.
            setTimeout(cleanup, 1500);
        }).catch(() => {
            cleanup();
        });
    },

    REPORT_CSS: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;700&display=swap');
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #ffffff; }
        body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif; color: #1e1e2f; direction: rtl; }
        @page { size: A4 portrait; margin: 0; }

        .report-doc {
            width: 794px;
            background: #ffffff;
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: embed;
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important;
        }

        /* Stable RTL typography rules for the hidden html2canvas template. */
        .pdf-print-container {
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            font-variant-ligatures: normal !important;
        }
        .pdf-print-container .rpt-table thead th {
            white-space: nowrap !important;
            word-spacing: 4px !important;
        }
        .pdf-print-container .rpt-time {
            direction: ltr !important;
            unicode-bidi: embed !important;
            white-space: nowrap !important;
        }

        /* Avoid flex/grid measurement differences in html2canvas. */
        .pdf-print-container .grid-box,
        .pdf-print-container .header-card {
            display: table !important;
            width: 100% !important;
        }

        .report-page {
            position: relative;
            width: 794px;
            height: 1122px;
            overflow: hidden;
            background: #ffffff;
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important;
        }

        .page-content {
            position: relative;
            z-index: 2;
            height: 100%;
            overflow: hidden;
            padding: 40px 38px 140px;
        }

        /* Pagination contract used by canvas PDF export and browser printing. */
        .pdf-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin-bottom: 20px !important;
        }
        .pdf-table {
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        .pdf-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .force-page-break {
            page-break-before: always !important;
            break-before: always !important;
        }

        /* ── Header ── */
        .rpt-header {
            border: 2px solid #9333ea;
            border-radius: 14px;
            padding: 16px 18px 12px;
            background: linear-gradient(135deg, #faf5ff, #ffffff);
            margin-bottom: 18px;
        }
        .rpt-title {
            font-size: 22px; font-weight: 900; color: #6d28d9; text-align: center;
            border-bottom: 2px solid #edd9ff; padding-bottom: 10px; margin-bottom: 12px;
            line-height: 1.45; letter-spacing: normal; word-spacing: normal;
        }
        .rpt-meta-grid { border-collapse: separate; border-spacing: 0 6px; table-layout: fixed; }
        .rpt-meta {
            width: 50%; vertical-align: middle; font-size: 12px; line-height: 1.55;
            padding: 4px 12px; border-bottom: 1px dashed #ece7f5;
        }
        .rpt-meta .k { color: #6b7280; font-weight: 700; white-space: nowrap; margin-inline-end: 8px; }
        .rpt-meta .v { color: #111827; font-weight: 800; }

        /* ── Sections ── */
        .rpt-section-title {
            font-size: 15px; font-weight: 800; color: #ffffff; background: #9333ea;
            padding: 8px 14px; border-radius: 8px; margin-bottom: 20px !important;
            line-height: 1.6; letter-spacing: normal; word-spacing: 4px;
        }

        /* ── Tables ── */
        .rpt-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: separate !important;
            border-spacing: 0 !important;
            direction: rtl !important;
            text-align: right !important;
            font-size: 11.5px;
            line-height: 1.55;
            letter-spacing: 0 !important;
            word-spacing: normal;
            page-break-inside: avoid;
        }
        .rpt-table col { width: auto; }
        .rpt-table thead {
            display: table-header-group;
        }
        .rpt-table thead th {
            background: #f3e8ff; color: #5b21b6; font-weight: 800; padding: 8px 6px;
            border: 1px solid #e2d8f2; text-align: center; vertical-align: middle;
            line-height: 1.6; white-space: nowrap; word-spacing: 4px; overflow-wrap: normal;
            letter-spacing: 0; box-sizing: border-box;
        }
        .rpt-table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .rpt-table tbody td {
            padding: 8px 6px; border: 1px solid #e6e4ee; text-align: center; color: #1e1e2f;
            line-height: 1.6; vertical-align: middle; white-space: normal; word-spacing: normal;
            overflow-wrap: normal; overflow: hidden; box-sizing: border-box;
            letter-spacing: 0; unicode-bidi: plaintext;
        }
        .rpt-table td.rpt-time {
            direction: ltr; unicode-bidi: embed; white-space: nowrap;
        }
        .rpt-table tbody tr:nth-child(even) { background: #faf8ff; }
        .rpt-badge {
            display: inline-block; padding: 3px 12px; border-radius: 20px; font-weight: 800; font-size: 10.5px;
            white-space: nowrap; vertical-align: middle; box-sizing: border-box;
            letter-spacing: 0; word-spacing: normal; line-height: 1.4;
        }
        .rpt-badge.ok { background: #d1fae5; color: #047857; }
        .rpt-badge.no { background: #fee2e2; color: #b91c1c; }
        .rpt-activity-table {
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        .rpt-activity-table tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .rpt-activity-table .rpt-activity-date {
            direction: ltr;
            unicode-bidi: embed;
            white-space: nowrap;
            font-size: 10px;
        }
        .rpt-activity-table .rpt-activity-amount {
            direction: ltr;
            unicode-bidi: embed;
            font-weight: 900;
            white-space: nowrap;
        }
        .rpt-activity-table .rpt-activity-amount.positive { color: #14532d; }
        .rpt-activity-table .rpt-activity-amount.negative { color: #991b1b; }
        .rpt-activity-table .rpt-activity-details {
            overflow-wrap: anywhere !important;
            word-break: break-word;
        }
        .rpt-activity-table .rpt-badge.paid {
            background: #dcfce7;
            border: 1px solid #86efac;
            color: #14532d;
        }
        .rpt-activity-table .rpt-badge.reversal {
            background: #fee2e2;
            border: 1px solid #fca5a5;
            color: #7f1d1d;
        }
        .rpt-badge.assessment { background: #ede9fe; color: #6d28d9; }
        .rpt-score { direction: ltr !important; white-space: nowrap; font-weight: 800; }
        .rpt-term-label {
            display: block;
            color: #6b7280;
            font-size: 9px;
            font-weight: 700;
            margin-top: 2px;
        }
        .rpt-empty { text-align: center; color: #9aa3af; padding: 14px; font-weight: 700; }

        /* ── Summary Cards ── */
        .rpt-att-summary {
            display: table !important;
            width: 100% !important;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 20px;
            letter-spacing: normal; word-spacing: normal;
        }
        .rpt-att-summary .rpt-sum-card {
            display: table-cell;
            width: 50%;
            padding: 10px;
            text-align: center;
            border-radius: 6px;
            font-weight: 800;
            font-size: 13px;
            line-height: 1.6;
            letter-spacing: normal; word-spacing: normal;
        }
        .rpt-att-summary .rpt-sum-card.present {
            background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;
        }
        .rpt-att-summary .rpt-sum-card.absent {
            background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
        }
        .rpt-att-summary .rpt-sum-card span { display: block; }
        .rpt-att-summary .rpt-sum-card strong { display: block; font-size: 14px; }
        .rpt-debt-card {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 10px;
            text-align: center;
            border-radius: 6px;
            font-weight: 800;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 20px;
            letter-spacing: normal; word-spacing: normal;
        }

        /* ── Watermark ── */
        .rpt-watermark {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;
            display: block; text-align: center; padding-top: 120px;
            pointer-events: none; overflow: hidden;
        }
        .rpt-watermark span {
            display: block; white-space: nowrap; margin: 90px 0;
            font-size: 74px; font-weight: 900; color: rgba(120, 80, 200, 0.10);
            transform: rotate(-45deg);
        }

        /* ── Footer ── */
        .rpt-footer {
            position: absolute; left: 0; right: 0; bottom: 28px; z-index: 3;
            display: table; width: 100%; table-layout: fixed;
            min-height: 24px;
            padding: 5px 38px 0;
            font-size: 10px; color: #888888; font-weight: 700;
            border-top: 1px solid #eee;
        }
        .rpt-footer > span { display: table-cell; vertical-align: middle; }
        .rpt-doc-meta { font-size: 9.5px; color: #aaa; font-weight: 600; text-align: left; }

        @media print {
            body { padding: 0; }
            .report-page { page-break-after: always; break-after: page; }
            .rpt-activity-table tbody tr {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
    `
};
