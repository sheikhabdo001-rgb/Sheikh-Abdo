// Student Codes cards view
window.StudentCodes = {
    searchQuery: '',
    selectionMode: false,
    selectedStudentIds: new Set(),
    visibleStudents: [],
    pendingPrintMode: null,
    pendingPrintableIds: [],

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[character]));
    },

    getStageLabel(stage, stageData, gradeName) {
        const standardStageNames = {
            primary: 'الابتدائية',
            preparatory: 'الإعدادية',
            secondary: 'الثانوية'
        };
        const stageLabel = standardStageNames[stage]
            ? `المرحلة ${standardStageNames[stage]}`
            : (stageData?.name || stage);
        const gradeLabel = stageData?.isFlat || stage.startsWith('custom_')
            ? ''
            : `الصف ${gradeName || 'عام'}`;

        return [stageLabel, gradeLabel].filter(Boolean).join(' - ');
    },

    getFilterContext() {
        const activeStage = window.GlobalStageFilter?.getActiveStage?.() || null;
        const activeGrade = window.GlobalStageFilter?.getActiveGrade?.() ?? null;
        const stageData = activeStage
            ? window.STUDENT_CONFIG?.stageData?.[activeStage]
            : null;
        const gradeNames = activeStage
            ? (window.STUDENT_CONFIG?.gradeNames?.[activeStage] || [])
            : [];
        const isFlatStage = Boolean(
            stageData?.isFlat
            || activeStage?.startsWith('custom_')
        );

        if (activeStage && activeGrade && !isFlatStage) {
            return {
                stage: activeStage,
                grade: activeGrade,
                title: `كروت الصف: ${gradeNames[activeGrade - 1] || `صف ${activeGrade}`}`
            };
        }

        if (activeStage) {
            return {
                stage: activeStage,
                grade: null,
                title: `كروت المرحلة: ${stageData?.name || activeStage}`
            };
        }

        return {
            stage: null,
            grade: null,
            title: 'كروت جميع الطلاب'
        };
    },

    getPrintableTitle(filterContext = this.getFilterContext()) {
        if (filterContext.stage && filterContext.grade) {
            const gradeNames = window.STUDENT_CONFIG?.gradeNames?.[filterContext.stage] || [];
            const gradeName = gradeNames[filterContext.grade - 1] || `صف ${filterContext.grade}`;
            return `أكواد الصف: الصف ${gradeName}`;
        }

        if (filterContext.stage) {
            const stageName = window.STUDENT_CONFIG?.stageData?.[filterContext.stage]?.name
                || filterContext.stage;
            return `أكواد المرحلة: ${stageName}`;
        }

        return 'أكواد جميع الطلاب';
    },

    getPrintMetadata(filterContext = this.getFilterContext()) {
        const stageData = filterContext.stage
            ? window.STUDENT_CONFIG?.stageData?.[filterContext.stage]
            : null;
        const gradeNames = filterContext.stage
            ? (window.STUDENT_CONFIG?.gradeNames?.[filterContext.stage] || [])
            : [];
        const standardStageNames = {
            primary: 'الابتدائية',
            preparatory: 'الإعدادية',
            secondary: 'الثانوية'
        };
        const rawStageName = stageData?.name || filterContext.stage || 'جميع المراحل';
        const stageName = filterContext.stage
            ? (standardStageNames[filterContext.stage]
                ? `المرحلة ${standardStageNames[filterContext.stage]}`
                : rawStageName)
            : 'جميع المراحل';
        const gradeName = filterContext.stage && filterContext.grade
            ? (gradeNames[Number(filterContext.grade) - 1] || `الصف ${filterContext.grade}`)
            : 'جميع الصفوف';
        const now = new Date();
        const date = [
            String(now.getDate()).padStart(2, '0'),
            String(now.getMonth() + 1).padStart(2, '0'),
            now.getFullYear()
        ].join('/');

        return {
            stageName,
            gradeName,
            academicYear: `${now.getFullYear()} / ${now.getFullYear() + 1}`,
            teacherName: window.Auth?.getTeacherName?.() || 'المعلم',
            date
        };
    },

    buildPrintCover(metadata) {
        const esc = value => this.escapeHtml(value);

        return `
            <section
                class="student-codes-print-page pdf-cover-page cover-page"
                data-page-index="0"
                aria-label="صفحة الغلاف"
            >
                <div class="cover-card">
                    <h1>أكواد تسجيل الحضور والغياب والمدفوعات الشهرية</h1>
                    <p class="meta-line">
                        الخاصة بالمرحلة/ <b>${esc(metadata.stageName)}</b>
                        والصف/ <b>${esc(metadata.gradeName)}</b>
                        للعام الدراسي/ <b dir="ltr">${metadata.academicYear}</b>
                    </p>
                    <p class="teacher-name">
                        أ/ <b>${esc(metadata.teacherName)}</b>
                    </p>
                    <p class="export-date">
                        تم التصدير بتاريخ: <b dir="ltr">${metadata.date}</b>
                    </p>
                    <div class="dev-badge">
                        تم التطوير بواسطة البشمهندس مازن /
                        Developed by Eng. Mazen — Programmer Mazen
                    </div>
                </div>
            </section>
        `;
    },

    renderPrintPages(students = this.visibleStudents, printableIds = null, teacherName = null) {
        const pagesRoot = document.getElementById('studentCodesPrintPages');

        const printableSet = printableIds
            ? new Set(Array.from(printableIds, id => String(id)))
            : null;
        const selectedStudents = (students || []).filter(student => (
            !printableSet || printableSet.has(String(student.cardId))
        ));
        const metadata = this.getPrintMetadata();
        const gridPageCount = Math.ceil(selectedStudents.length / 9);
        const resolvedTeacherName = teacherName || metadata.teacherName;
        const pages = [];

        if (!selectedStudents.length) {
            if (pagesRoot) {
                pagesRoot.innerHTML = '';
                pagesRoot.dataset.pageCount = '0';
            }
            return '';
        }

        for (let pageIndex = 0; pageIndex < gridPageCount; pageIndex++) {
            const pageStudents = selectedStudents.slice(
                pageIndex * 9,
                pageIndex * 9 + 9
            );
            const cards = pageStudents.map((student, cardIndex) => (
                this.renderCard(
                    student,
                    pageIndex * 9 + cardIndex,
                    resolvedTeacherName,
                    { print: true }
                )
            )).join('');

            pages.push(`
                <section
                    class="student-codes-print-page pdf-grid-page grid-page"
                    data-page-index="${pageIndex + 1}"
                    aria-label="صفحة ${pageIndex + 2}"
                >
                    <div class="barcode-grid-container barcode-grid-3x3">
                        ${cards}
                    </div>
                </section>
            `);
        }

        const gridPagesHtml = pages.join('');
        if (pagesRoot) {
            pagesRoot.innerHTML = this.buildPrintCover(metadata) + gridPagesHtml;
            pagesRoot.dataset.pageCount = String(gridPageCount + 1);
            this.renderBarcodes(pagesRoot);
        }
        return gridPagesHtml;
    },

    collectStudents() {
        if (!window.StudentStore || !window.STUDENT_CONFIG) return [];

        const students = [];
        const stageData = window.STUDENT_CONFIG.stageData || {};
        const gradeNames = window.STUDENT_CONFIG.gradeNames || {};

        Object.keys(stageData).forEach(stage => {
            const names = gradeNames[stage] || ['عام'];
            const gradeCount = Math.max(1, names.length);

            for (let grade = 1; grade <= gradeCount; grade++) {
                const gradeStudents = window.StudentStore.getStudents(stage, grade) || [];
                gradeStudents.forEach((student, studentIndex) => {
                    if (!student || !String(student.name || '').trim()) return;

                    students.push({
                        ...student,
                        cardId: String(
                            student.id
                            ?? student.studentId
                            ?? `${stage}_${grade}_${student.serialNo ?? studentIndex}`
                        ),
                        stage,
                        grade,
                        stageLabel: this.getStageLabel(stage, stageData[stage], names[grade - 1])
                    });
                });
            }
        });

        return students;
    },

    getFilteredStudents(studentsList, selectedStage, selectedGrade, searchQuery) {
        const query = String(searchQuery || '').trim().toLocaleLowerCase();

        return studentsList.filter(student => {
            const matchesGrade = !selectedStage
                || (
                    student.stage === selectedStage
                    && (selectedGrade === null || student.grade === selectedGrade)
                );
            const studentName = String(student.name || '').toLocaleLowerCase();
            const studentCode = String(student.studentCode || student.code || '').toLocaleLowerCase();
            const matchesSearch = !query
                || studentName.includes(query)
                || studentCode.includes(query);

            return matchesGrade && matchesSearch;
        });
    },

    bindSearchInput() {
        const input = document.getElementById('studentCodesSearchInput');
        if (!input || input.dataset.bound === 'true') return;

        input.value = this.searchQuery;
        input.addEventListener('input', event => {
            this.searchQuery = event.target.value;
            this.render();
        });
        input.dataset.bound = 'true';
    },

    closePrintMenu() {
        const menu = document.getElementById('studentCodesPrintMenu');
        const button = document.getElementById('studentCodesPrintBtn');
        if (menu) menu.hidden = true;
        if (button) button.setAttribute('aria-expanded', 'false');
    },

    togglePrintMenu() {
        const menu = document.getElementById('studentCodesPrintMenu');
        const button = document.getElementById('studentCodesPrintBtn');
        if (!menu) return;

        menu.hidden = !menu.hidden;
        if (button) button.setAttribute('aria-expanded', String(!menu.hidden));
    },

    bindControls() {
        const printButton = document.getElementById('studentCodesPrintBtn');
        const printMenu = document.getElementById('studentCodesPrintMenu');
        const selectionBar = document.getElementById('studentCodesSelectionBar');
        const grid = document.getElementById('studentCodesGrid');

        if (printButton && printButton.dataset.bound !== 'true') {
            printButton.addEventListener('click', event => {
                event.stopPropagation();
                this.togglePrintMenu();
            });
            printButton.dataset.bound = 'true';
        }

        if (printMenu && printMenu.dataset.bound !== 'true') {
            printMenu.addEventListener('click', event => {
                const actionButton = event.target.closest('[data-student-codes-print-action]');
                if (!actionButton) return;

                this.closePrintMenu();
                if (actionButton.dataset.studentCodesPrintAction === 'selected') {
                    this.enableSelectionMode();
                } else {
                    this.printAll();
                }
            });
            printMenu.dataset.bound = 'true';
        }

        if (selectionBar && selectionBar.dataset.bound !== 'true') {
            selectionBar.addEventListener('click', event => {
                if (event.target.closest('#studentCodesSelectAllBtn')) {
                    this.selectAllVisible();
                } else if (event.target.closest('#studentCodesDeselectAllBtn')) {
                    this.deselectAll();
                } else if (event.target.closest('#studentCodesConfirmPrintBtn')) {
                    this.printSelected();
                } else if (event.target.closest('#studentCodesCancelSelectionBtn')) {
                    this.exitSelectionMode();
                }
            });
            selectionBar.dataset.bound = 'true';
        }

        if (grid && grid.dataset.bound !== 'true') {
            grid.addEventListener('click', event => {
                if (!this.selectionMode) return;
                if (event.target.closest('input, label, button, a')) return;

                const card = event.target.closest('.student-code-card[data-student-id]');
                if (card) this.toggleCardSelection(card.dataset.studentId);
            });

            grid.addEventListener('change', event => {
                const checkbox = event.target.closest('.student-code-selection-input');
                if (checkbox) {
                    this.setCardSelection(checkbox.dataset.studentId, checkbox.checked);
                }
            });
            grid.dataset.bound = 'true';
        }

        if (document.body.dataset.studentCodesPrintControlsBound !== 'true') {
            document.addEventListener('click', event => {
                if (!event.target.closest('.student-codes-print-controls')) {
                    this.closePrintMenu();
                }
            });
            document.body.dataset.studentCodesPrintControlsBound = 'true';
        }
    },

    enableSelectionMode() {
        this.selectionMode = true;
        this.selectedStudentIds.clear();
        this.render();
    },

    exitSelectionMode(options = {}) {
        this.selectionMode = false;
        this.selectedStudentIds.clear();
        this.closePrintMenu();
        if (options.render !== false) this.render();
        else this.updateSelectionBar();
    },

    setCardSelection(studentId, isSelected) {
        const id = String(studentId);
        if (isSelected) this.selectedStudentIds.add(id);
        else this.selectedStudentIds.delete(id);
        this.updateCardSelectionState(id);
        this.updateSelectionBar();
    },

    toggleCardSelection(studentId) {
        const id = String(studentId);
        this.setCardSelection(id, !this.selectedStudentIds.has(id));
    },

    updateCardSelectionState(studentId) {
        const grid = document.getElementById('studentCodesGrid');
        if (!grid) return;

        const card = Array.from(grid.querySelectorAll('.student-code-card[data-student-id]'))
            .find(element => element.dataset.studentId === String(studentId));
        if (!card) return;

        const isSelected = this.selectedStudentIds.has(String(studentId));
        card.classList.toggle('selected-for-print', isSelected);
        card.setAttribute('aria-selected', String(isSelected));
        const checkbox = card.querySelector('.student-code-selection-input');
        if (checkbox) checkbox.checked = isSelected;
    },

    selectAllVisible() {
        this.visibleStudents.forEach(student => {
            this.selectedStudentIds.add(String(student.cardId));
            this.updateCardSelectionState(student.cardId);
        });
        this.updateSelectionBar();
    },

    deselectAll() {
        this.selectedStudentIds.clear();
        this.visibleStudents.forEach(student => this.updateCardSelectionState(student.cardId));
        this.updateSelectionBar();
    },

    updateSelectionBar() {
        const bar = document.getElementById('studentCodesSelectionBar');
        const count = document.getElementById('studentCodesSelectionCount');
        const selectAllButton = document.getElementById('studentCodesSelectAllBtn');
        const deselectAllButton = document.getElementById('studentCodesDeselectAllBtn');
        const confirmButton = document.getElementById('studentCodesConfirmPrintBtn');
        if (!bar) return;

        bar.hidden = !this.selectionMode;
        const selectedCount = this.selectedStudentIds.size;
        const visibleCount = this.visibleStudents.length;

        if (count) count.textContent = `تم تحديد ${selectedCount} كروت`;
        if (selectAllButton) selectAllButton.disabled = !visibleCount || selectedCount === visibleCount;
        if (deselectAllButton) deselectAllButton.disabled = selectedCount === 0;
        if (confirmButton) {
            confirmButton.disabled = selectedCount === 0;
            const label = confirmButton.querySelector('span');
            if (label) label.textContent = `تأكيد الطباعة (${selectedCount})`;
        }
    },

    async triggerPrint(mode = 'all', printableIds = null) {
        const requestedIds = printableIds == null
            ? this.visibleStudents.map(student => student.cardId)
            : printableIds;
        const printableSet = new Set(Array.from(requestedIds, id => String(id)));
        const printableStudents = this.visibleStudents.filter(student =>
            printableSet.has(String(student.cardId))
        );
        if (!printableStudents.length) {
            alert('لا توجد بطاقات متاحة للطباعة.');
            return false;
        }

        const metadata = this.getPrintMetadata();
        const coverHtml = this.buildPrintCover(metadata);
        // renderPrintPages returns only the 3x3 grid pages. It also refreshes
        // the legacy in-view pages used by the PDF exporter.
        const gridPagesHtml = this.renderPrintPages(
            printableStudents,
            printableSet,
            metadata.teacherName
        );

        let printArea = document.getElementById('student-codes-print-wrapper');
        if (!printArea) {
            printArea = document.createElement('div');
            printArea.id = 'student-codes-print-wrapper';
            document.body.appendChild(printArea);
        }

        // Keep the native-print source outside the app's view/container
        // hierarchy. This prevents hidden view ancestors from blanking pages
        // after the first one in the browser print renderer.
        printArea.innerHTML = coverHtml + gridPagesHtml;
        this.renderBarcodes(printArea);

        const originalTitle = document.title;
        const grid = document.getElementById('studentCodesGrid');
        document.body.classList.add('student-codes-print-mode', `printing-${mode}`);
        document.title = document.getElementById('studentCodesTitle')?.textContent || 'أكواد الطلاب';

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            document.body.classList.remove('student-codes-print-mode', 'printing-all', 'printing-selected');
            document.title = originalTitle;
            printArea.remove();
            if (grid) {
                grid.querySelectorAll('.student-code-card[data-student-id]').forEach(card => {
                    card.classList.toggle('selected-for-print', this.selectedStudentIds.has(card.dataset.studentId));
                });
            }
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup, { once: true });
        try {
            // Allow layout, fonts, and SVG barcodes to paint before the native
            // print renderer snapshots the document.
            await new Promise(resolve => setTimeout(resolve, 300));
            if (typeof window.print !== 'function') {
                throw new Error('ميزة الطباعة غير متاحة في هذا المتصفح.');
            }
            window.print();
        } catch (error) {
            cleanup();
            return false;
        }
        return true;
    },

    // Compatibility entry point retained for callers from earlier revisions.
    async handlePrint(mode = 'all', printableIds = null) {
        return this.triggerPrint(mode, printableIds);
    },

    preparePrintState(mode, printableIds) {
        const grid = document.getElementById('studentCodesGrid');
        if (!grid) return false;

        const printableSet = new Set(printableIds.map(String));
        grid.querySelectorAll('.student-code-card[data-student-id]').forEach(card => {
            card.classList.toggle('selected-for-print', printableSet.has(card.dataset.studentId));
        });

        return this.triggerPrint(mode, printableIds);
    },

    openExportOptions(mode, printableIds) {
        this.pendingPrintMode = mode;
        this.pendingPrintableIds = printableIds.map(String);

        if (window.PrintEngine?.openExportMethodModal) {
            window.PrintEngine.openExportMethodModal('student-codes');
        } else {
            this.printPending();
        }
    },

    printPending() {
        const ids = this.pendingPrintableIds.length
            ? this.pendingPrintableIds
            : this.visibleStudents.map(student => student.cardId);
        if (!ids.length) {
            alert('لا توجد بطاقات متاحة للطباعة.');
            return false;
        }
        return this.preparePrintState(this.pendingPrintMode || 'all', ids);
    },

    renderBarcodes(root) {
        if (!root || typeof JsBarcode !== 'function') return;

        root.querySelectorAll('.student-code-barcode[data-code]').forEach(svg => {
            try {
                svg.innerHTML = '';
                JsBarcode(svg, svg.dataset.code, {
                    format: 'CODE128',
                    width: 1.4,          /* Reduced width to prevent content overlap */
                    height: 38,         /* Reduced height to stop overlapping text */
                    displayValue: true,
                    fontSize: 12,
                    fontOptions: 'bold',
                    margin: 2,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
            } catch (error) {
                svg.textContent = 'تعذر إنشاء الباركود';
            }
        });
    },

    async waitForBarcodeRender(root) {
        if (!root) return;

        // JsBarcode is scheduled in requestAnimationFrame after the cards are
        // injected. Give the browser two paint passes plus a small settling
        // window before html2canvas clones the SVGs.
        await new Promise(resolve => requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        }));
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    },

    async downloadPendingPDF() {
        const originalElement = document.getElementById('printable-student-codes');
        const sourceGrid = originalElement?.querySelector('.student-codes-grid-printable');

        if (!originalElement || !sourceGrid) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        await this.waitForBarcodeRender(sourceGrid);

        const printableTitle = this.getPrintableTitle();
        const titleHeader = originalElement.querySelector('.print-grade-title');
        const titleSpan = originalElement.querySelector(
            '#studentCodesPrintableGradeTitle'
        );
        if (titleSpan) {
            titleSpan.textContent = printableTitle;
        } else if (titleHeader) {
            titleHeader.textContent = printableTitle;
        }

        if (
            window.PrintEngine
            && typeof window.PrintEngine.downloadCurrentView === 'function'
        ) {
            return await window.PrintEngine.downloadCurrentView('student-codes');
        }

        if (typeof window.generateStandardPDF === 'function') {
            const filename = printableTitle
                .replace(/[\\/:*?"<>|]/g, '-')
                .trim();
            return await window.generateStandardPDF(
                originalElement,
                filename || 'أكواد الطلاب'
            );
        }

        alert('محرك تصدير PDF الموحد غير متاح.');
        return false;
    },

    // Retained as a compatibility reference for older revisions. The active
    // export path above delegates to PrintEngine.downloadCurrentView().
    async downloadPendingPDFLegacy() {
        const originalElement = document.getElementById('printable-student-codes');
        const sourceGrid = originalElement?.querySelector('.student-codes-grid-printable');
        const ids = this.pendingPrintableIds.length
            ? new Set(this.pendingPrintableIds.map(String))
            : new Set(this.visibleStudents.map(student => String(student.cardId)));

        if (!originalElement || !sourceGrid || !ids.size) {
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        // Open synchronously during the user gesture so popup blockers do not
        // reject the native print window after the async render wait.
        const printWindow = window.open(
            '',
            '_blank',
            'width=900,height=700'
        );

        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتنزيل ملف الـ PDF.');
            return false;
        }

        await this.waitForBarcodeRender(sourceGrid);

        const visibleCards = Array.from(
            sourceGrid.querySelectorAll('.student-code-card[data-student-id]')
        );
        if (!visibleCards.some(card => ids.has(String(card.dataset.studentId)))) {
            printWindow.close();
            alert('لا توجد بطاقات متاحة لتنزيلها.');
            return false;
        }

        const printableTitle = this.getPrintableTitle();
        const clone = originalElement.cloneNode(true);

        const cloneHeader = clone.querySelector('.student-codes-print-header');
        if (cloneHeader) {
            cloneHeader.style.display = 'block';
            cloneHeader.style.visibility = 'visible';
            const cloneTitle = cloneHeader.querySelector('.print-grade-title');
            if (cloneTitle) cloneTitle.textContent = printableTitle;
        }

        const cloneGrid = clone.querySelector('.student-codes-grid-printable');
        clone.querySelectorAll('.student-code-card[data-student-id]').forEach(card => {
            if (!ids.has(String(card.dataset.studentId))) {
                card.remove();
                return;
            }
        });

        if (cloneGrid) {
            cloneGrid.style.display = 'grid';
            cloneGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            cloneGrid.style.gap = '12px';
            cloneGrid.style.width = '100%';
            cloneGrid.style.padding = '10px';
            cloneGrid.style.backgroundColor = '#ffffff';
        }

        // Re-render barcodes in the cloned structure before transferring it.
        this.renderBarcodes(clone);
        await this.waitForBarcodeRender(clone);

        const stylesHTML = Array.from(
            document.querySelectorAll('link[rel="stylesheet"], style')
        )
            .map(style => style.outerHTML)
            .join('\n');

        const safeTitle = this.escapeHtml(printableTitle);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>${safeTitle}</title>
                ${stylesHTML}
                <style>
                    html,
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        min-height: 0 !important;
                    }

                    body {
                        padding: 15px !important;
                        margin: 0 !important;
                    }

                    body > #printable-student-codes {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        overflow: visible !important;
                    }

                    body > #printable-student-codes,
                    body > #printable-student-codes * {
                        visibility: visible !important;
                    }

                    .student-codes-print-header {
                        display: block !important;
                        visibility: visible !important;
                        margin-bottom: 5mm !important;
                    }

                    .student-codes-print-header .print-grade-title {
                        color: #000000 !important;
                        font-size: 20pt !important;
                        font-weight: 900 !important;
                        text-align: center !important;
                    }

                    .student-codes-print-header .header-divider {
                        height: 1px !important;
                        margin: 0 !important;
                        border: 0 !important;
                        background: #000000 !important;
                    }

                    .student-codes-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 12px !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                    }

                    .student-code-card {
                        display: flex !important;
                        min-height: 0 !important;
                        height: auto !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        border: 1px solid #000000 !important;
                        box-shadow: none !important;
                        transform: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .student-code-card::before,
                    .student-code-selection-control {
                        display: none !important;
                    }

                    .student-code-app-title,
                    .student-code-teacher,
                    .student-code-label,
                    .student-code-value,
                    .student-code-student-name,
                    .student-code-card-footer,
                    .student-code-badge,
                    .student-code-badge b {
                        color: #000000 !important;
                    }

                    .student-code-barcode-container {
                        background: #ffffff !important;
                        border: 1px solid #000000 !important;
                    }

                    .student-code-barcode {
                        display: block !important;
                        visibility: visible !important;
                        max-width: 100% !important;
                    }

                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                        }

                        body {
                            padding: 0 !important;
                        }

                        body > * {
                            display: none !important;
                        }

                        body > #printable-student-codes {
                            display: block !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div id="printable-student-codes">
                    ${clone.innerHTML}
                </div>
                <script>
                    window.onload = function () {
                        setTimeout(function () {
                            window.focus();
                            window.print();
                        }, 300);
                    };

                    window.onafterprint = function () {
                        setTimeout(function () {
                            window.close();
                        }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
        return true;
    },

    printAll() {
        if (!this.visibleStudents.length) {
            alert('لا توجد بطاقات متاحة للطباعة.');
            return;
        }
        this.openExportOptions('all', this.visibleStudents.map(student => student.cardId));
    },

    printSelected() {
        if (!this.selectedStudentIds.size) {
            alert('يرجى تحديد بطاقة واحدة على الأقل للطباعة.');
            return;
        }
        this.openExportOptions('selected', Array.from(this.selectedStudentIds));
    },

    renderCard(student, index, teacherName, options = {}) {
        const isPrintCard = options.print === true;
        const name = this.escapeHtml(student.name || '---');
        const code = String(student.studentCode || student.code || '').trim();
        const safeCode = this.escapeHtml(code);
        const safeTeacherName = this.escapeHtml(teacherName || 'المعلم');
        const cardId = String(student.cardId);
        const safeCardId = this.escapeHtml(cardId);
        const serialNumber = student.serialNo ?? index + 1;
        const serial = window.AppUtils?.formatNumber
            ? window.AppUtils.formatNumber(serialNumber)
            : String(serialNumber);
        const barcode = code
            ? `<svg class="student-code-barcode" data-code="${safeCode}" aria-label="باركود ${safeCode}"></svg>`
            : `<div class="student-code-barcode-missing">لا يوجد باركود</div>`;

        return `
            <article
                class="student-code-card barcode-card ${this.selectionMode ? 'is-selection-mode' : ''} ${this.selectedStudentIds.has(cardId) ? 'selected-for-print' : ''}"
                data-student-id="${safeCardId}"
                aria-selected="${this.selectedStudentIds.has(cardId) ? 'true' : 'false'}"
            >
                ${this.selectionMode && !isPrintCard ? `
                    <label class="student-code-selection-control">
                        <input
                            class="student-code-selection-input"
                            type="checkbox"
                            data-student-id="${safeCardId}"
                            ${this.selectedStudentIds.has(cardId) ? 'checked' : ''}
                            aria-label="تحديد بطاقة ${name}"
                        >
                        <span class="student-code-selection-check"><i class="fas fa-check"></i></span>
                        <span class="student-code-selection-label">تحديد</span>
                    </label>
                ` : ''}
                <div class="student-code-card-content">
                    <header class="student-code-card-header">
                        <div class="student-code-branding">
                            <span class="student-code-app-title">نظام إدارة الطلاب</span>
                            <span class="student-code-teacher">أستاذ / ${safeTeacherName}</span>
                        </div>
                        <div class="student-code-logo" aria-hidden="true">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                    </header>

                    <div class="student-code-divider"></div>

                    <div class="student-code-body">
                        <div class="student-code-info-row">
                            <span class="student-code-label">المسلسل</span>
                            <strong class="student-code-value student-code-serial">#${serial}</strong>
                        </div>
                        <div class="student-code-info-row student-code-name-row">
                            <span class="student-code-label">اسم الطالب</span>
                            <strong class="student-code-value student-code-student-name">${name}</strong>
                        </div>
                        <div class="student-code-info-row">
                            <span class="student-code-label">المرحلة والصف</span>
                            <strong class="student-code-value">${this.escapeHtml(student.stageLabel)}</strong>
                        </div>
                    </div>
                </div>

                <div class="student-code-barcode-container">
                    <span class="student-code-badge">
                        <span>كود الطالب</span>
                        <b dir="ltr">${safeCode || 'غير متاح'}</b>
                    </span>
                    ${barcode}
                </div>

                <footer class="student-code-card-footer">DEVELOPED BY MAZEN</footer>
            </article>
        `;
    },

    render() {
        const grid = document.getElementById('studentCodesGrid');
        const count = document.getElementById('studentCodesCount');
        const title = document.getElementById('studentCodesTitle');
        if (!grid) return;

        this.bindControls();
        this.bindSearchInput();

        const filterContext = this.getFilterContext();
        const allStudents = this.collectStudents();
        const students = this.getFilteredStudents(
            allStudents,
            filterContext.stage,
            filterContext.grade,
            this.searchQuery
        );
        const visibleIds = new Set(students.map(student => String(student.cardId)));
        this.selectedStudentIds = new Set(
            Array.from(this.selectedStudentIds).filter(id => visibleIds.has(String(id)))
        );
        this.visibleStudents = students;

        if (title) title.textContent = filterContext.title;
        const printableTitle = document.getElementById('studentCodesPrintableGradeTitle');
        if (printableTitle) {
            printableTitle.textContent = this.getPrintableTitle(filterContext);
        }
        if (count) {
            count.textContent = window.AppUtils?.formatNumber
                ? window.AppUtils.formatNumber(students.length)
                : String(students.length);
        }

        if (!students.length) {
            grid.innerHTML = `
                <div class="student-codes-empty">
                    <div class="student-codes-empty-icon"><i class="fas fa-magnifying-glass"></i></div>
                    <h2>${allStudents.length ? 'لا توجد نتائج مطابقة' : 'لا توجد بطاقات بعد'}</h2>
                    <p>${allStudents.length
                        ? 'جرّب تغيير نص البحث أو اختيار صف آخر.'
                        : 'أضف الطلاب أولاً لتظهر بطاقاتهم وأكوادهم هنا.'}</p>
                </div>
            `;
            this.renderPrintPages([]);
            this.updateSelectionBar();
            return;
        }

        const teacherName = window.Auth?.getTeacherName?.() || 'المعلم';
        grid.innerHTML = students
            .map((student, index) => this.renderCard(student, index, teacherName))
            .join('');
        this.renderPrintPages(students, null, teacherName);

        if (typeof JsBarcode === 'function') {
            requestAnimationFrame(() => {
                this.renderBarcodes(grid);
            });
        }
        this.updateSelectionBar();
    }
};
