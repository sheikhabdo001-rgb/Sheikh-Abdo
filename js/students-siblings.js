/**
 * Logic for managing sibling/relative rows within the student registration form
 */
window.StudentSiblings = {
    siblingsList: [],

    addSiblingRow() {
        this.siblingsList.push({
            name: '',
            stage: '',
            grade: null,
            studentId: null,
            studentCode: '',
            generatedCode: '',
            generatedSerial: null,
            dualStage: null,
            customFees: null
        });
        this.renderSiblingsSection();
    },

    removeSiblingRow(idx) {
        this.siblingsList.splice(idx, 1);
        this.renderSiblingsSection();
    },

    updateSiblingField(idx, field, value) {
        if (!this.siblingsList[idx]) return;
        
        // Handle value sanitization for numeric fields
        const sanitizedValue = (field === 'grade') ? (parseInt(value) || null) : value;
        this.siblingsList[idx][field] = sanitizedValue;
        
        if (field === 'stage' || field === 'grade') {
            if (field === 'stage') {
                // Dedicated/custom stages have one implicit grade and should
                // reveal the student-code selector immediately after stage.
                this.siblingsList[idx].grade = this.isDedicatedStage(value) ? 1 : null;
            }

            // A code is only valid for the stage/grade it was selected from.
            this.siblingsList[idx].studentId = null;
            this.siblingsList[idx].studentCode = '';
            this.siblingsList[idx].generatedCode = '';
            this.siblingsList[idx].generatedSerial = null;
            this.renderSiblingsSection();
        }
    },

    isDedicatedStage(stage) {
        const stageData = window.STUDENT_CONFIG?.stageData?.[stage];
        return Boolean(stageData?.isFlat || String(stage || '').startsWith('custom_'));
    },

    /**
     * Return registered students matching the selected relative stage and
     * grade. Dedicated stages use their implicit grade (1).
     */
    getStudentsByStageAndGrade(stage, grade) {
        if (!stage) return [];

        const isDedicated = this.isDedicatedStage(stage);
        const effectiveGrade = isDedicated ? 1 : Number(grade);
        if (!effectiveGrade || !window.StudentStore?.getStudents) return [];

        return window.StudentStore
            .getStudents(stage, effectiveGrade)
            .filter(student => student?.name)
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
    },

    getStudentsCountByGrade(stage, grade) {
        return this.getStudentsByStageAndGrade(stage, grade).length;
    },

    getDBStudentCount(stage, grade) {
        return this.getStudentsCountByGrade(stage, grade);
    },

    getPrimarySelection() {
        const primaryStageSelect = typeof document !== 'undefined'
            ? document.getElementById('primary-stage-select')
            : null;
        const primaryGradeSelect = typeof document !== 'undefined'
            ? document.getElementById('primary-grade-select')
            : null;
        const parent = window.StudentFormManager?.parent || window.Students;

        return {
            stage: primaryStageSelect?.value || parent?.currentStage || '',
            grade: primaryGradeSelect?.value || parent?.currentGrade || null
        };
    },

    getEffectiveGrade(stage, grade) {
        if (this.isDedicatedStage(stage)) return 1;
        const gradeText = String(grade ?? '');
        const gradeFromId = gradeText.match(/_(\d+)$/);
        return Number(gradeFromId ? gradeFromId[1] : grade);
    },

    getPrimarySerial(stage, grade) {
        const effectiveGrade = this.getEffectiveGrade(stage, grade);
        return window.StudentStore.getNextAvailableSerial(stage, effectiveGrade);
    },

    generateUniqueStudentCode() {
        const pendingCodes = new Set(
            this.siblingsList
                .map(sibling => sibling.generatedCode || sibling.studentCode)
                .filter(Boolean)
                .map(code => String(code))
        );
        let code = window.StudentCodeSystem.generate();
        while (pendingCodes.has(String(code))) {
            code = window.StudentCodeSystem.generate();
        }
        return String(code);
    },

    getNextRelativeSerial(stage, grade, currentIndex = null) {
        return this.getNextFormSerial(stage, grade, currentIndex);
    },

    /**
     * Resolve a serial in the context of the active add-student form.
     * Existing empty slots are reserved first; the primary student and
     * preceding new relative rows reserve serials before anything is saved.
     */
    getNextFormSerial(stage, grade, currentRowIndex = null) {
        const effectiveGrade = this.getEffectiveGrade(stage, grade);
        const students = window.StudentStore.getStudents(stage, effectiveGrade);
        const reservedSerials = new Set();
        const primary = this.getPrimarySelection();
        const isEditing = Boolean(window.StudentFormManager?.parent?.editingStudentId);

        if (
            !isEditing
            &&
            primary.stage === stage
            && this.getEffectiveGrade(primary.stage, primary.grade) === effectiveGrade
        ) {
            reservedSerials.add(window.StudentStore.getNextAvailableSerial(
                stage,
                effectiveGrade,
                students,
                reservedSerials
            ));
        }

        this.siblingsList
            .filter((sibling, index) =>
                currentRowIndex === null || index < currentRowIndex
            )
            .filter(sibling => {
                if (!sibling || sibling.studentId || sibling.stage !== stage) return false;
                const siblingGrade = this.getEffectiveGrade(stage, sibling.grade);
                return siblingGrade === effectiveGrade;
            })
            .forEach(() => {
                reservedSerials.add(window.StudentStore.getNextAvailableSerial(
                    stage,
                    effectiveGrade,
                    students,
                    reservedSerials
                ));
            });

        return window.StudentStore.getNextAvailableSerial(
            stage,
            effectiveGrade,
            students,
            reservedSerials
        );
    },

    getSelectedStudent(sibling) {
        if (!sibling?.stage) return null;

        const students = this.getStudentsByStageAndGrade(sibling.stage, sibling.grade);
        const selectedId = sibling.studentId == null ? '' : String(sibling.studentId);
        const selectedCode = String(sibling.studentCode || '').trim();

        return students.find(student =>
            (selectedId && String(student.id) === selectedId)
            || (selectedCode && String(student.studentCode || student.code || '').trim() === selectedCode)
        ) || null;
    },

    updateRelativeStudent(idx, studentId) {
        const sibling = this.siblingsList[idx];
        if (!sibling) return;

        const student = this.getStudentsByStageAndGrade(sibling.stage, sibling.grade)
            .find(item => String(item.id) === String(studentId));

        if (!student) {
            sibling.studentId = null;
            sibling.studentCode = '';
            sibling.generatedCode = this.generateUniqueStudentCode();
            sibling.generatedSerial = this.getNextRelativeSerial(sibling.stage, sibling.grade, idx);
            this.renderSiblingsSection();
            return;
        }

        sibling.studentId = student.id;
        sibling.studentCode = String(student.studentCode || student.code || '');
        const students = this.getStudentsByStageAndGrade(sibling.stage, sibling.grade);
        sibling.generatedCode = sibling.studentCode;
        sibling.generatedSerial = window.StudentStore.getSerial(
            student,
            students.findIndex(item => String(item.id) === String(student.id)) + 1
        );
        sibling.name = student.name || sibling.name;
        this.renderSiblingsSection();
    },

    updateRelativeStudentCode(idx, value) {
        const sibling = this.siblingsList[idx];
        if (!sibling) return;

        sibling.studentId = null;
        sibling.studentCode = String(value || '').trim();
        sibling.generatedCode = sibling.studentCode;
        sibling.generatedSerial = this.getNextRelativeSerial(sibling.stage, sibling.grade, idx);

        // Keep typing responsive by avoiding a full row render. Clear the
        // registered-student selection so the two controls cannot disagree.
        const row = document.querySelector(`[data-sibling-index="${idx}"]`);
        const select = row?.querySelector('.relative-student-select');
        if (select) select.value = '';
        if (row) {
            const codeBadge = row.querySelector('.relative-student-code');
            const effectiveCode = sibling.studentCode || sibling.generatedCode || '------';
            if (codeBadge) codeBadge.textContent = effectiveCode;
            row.dataset.generatedCode = effectiveCode === '------' ? '' : effectiveCode;
        }
    },

    /**
     * Update the dynamic student-code control for a relative row.
     * Kept as a public method as the row can also be refreshed by external UI
     * code after stage/grade settings change.
     */
    handleRelativeStageGradeChange(rowElement, forcedIndex = null) {
        if (!rowElement) return;

        const stageSelect = rowElement.querySelector('.relative-stage-select');
        const gradeSelect = rowElement.querySelector('.relative-grade-select');
        const codeWrapper = rowElement.querySelector('.relative-student-code-wrapper');
        const studentSelect = rowElement.querySelector('.relative-student-select');
        const infoContainer = rowElement.querySelector('.relative-generated-info');
        const serialElement = rowElement.querySelector('.relative-serial-num');
        const codeElement = rowElement.querySelector('.relative-student-code');
        const codeInput = rowElement.querySelector('.relative-student-code-input');
        if (!stageSelect || !gradeSelect || !codeWrapper || !studentSelect) return;

        const stageVal = stageSelect.value;
        const isDedicated = this.isDedicatedStage(stageVal);
        const gradeVal = isDedicated ? 1 : Number(gradeSelect.value);
        const shouldShowCode = Boolean(stageVal && (isDedicated || gradeVal));

        codeWrapper.style.display = shouldShowCode ? 'block' : 'none';
        if (infoContainer) infoContainer.style.display = shouldShowCode ? 'flex' : 'none';
        if (!shouldShowCode) {
            studentSelect.innerHTML = '<option value="">اختر المرحلة والصف أولاً</option>';
            return;
        }

        const idx = forcedIndex === null
            ? Number(rowElement.dataset.siblingIndex)
            : forcedIndex;
        const sibling = this.siblingsList[idx];
        const students = this.getStudentsByStageAndGrade(stageVal, gradeVal);
        if (sibling && !sibling.generatedCode) {
            sibling.generatedCode = this.generateUniqueStudentCode();
        }
        if (sibling && !sibling.studentId) {
            sibling.generatedSerial = this.getNextFormSerial(stageVal, gradeVal, idx);
        }
        const effectiveCode = String(sibling?.studentCode || sibling?.generatedCode || '').trim();
        const effectiveSerial = sibling?.generatedSerial || this.getNextRelativeSerial(stageVal, gradeVal, idx);
        rowElement.dataset.generatedCode = effectiveCode;
        rowElement.dataset.generatedSerial = String(effectiveSerial);
        if (serialElement) serialElement.textContent = `#${effectiveSerial}`;
        if (codeElement) codeElement.textContent = effectiveCode || '------';
        if (codeInput && document.activeElement !== codeInput) codeInput.value = effectiveCode;
        const selectedId = sibling?.studentId == null ? '' : String(sibling.studentId);
        const selectedCode = effectiveCode;

        studentSelect.innerHTML = [
            '<option value="">اختر الطالب المسجل (اختياري)</option>',
            ...students.map(student => {
                const code = String(student.studentCode || student.code || '').trim();
                const isSelected = selectedId
                    ? String(student.id) === selectedId
                    : Boolean(selectedCode && code === selectedCode);
                return `<option value="${this.escapeHtml(student.id)}" data-code="${this.escapeHtml(code)}" ${isSelected ? 'selected' : ''}>${this.escapeHtml(student.name)}${code ? ` (${this.escapeHtml(code)})` : ''}</option>`;
            })
        ].join('');
    },

    updatePrimarySerialBadge() {
        const { stage, grade } = this.getPrimarySelection();
        const serialElement = typeof document !== 'undefined'
            ? document.getElementById('assignedSerialNumber')
            : null;
        if (!serialElement || !stage || !this.getEffectiveGrade(stage, grade)) return;
        serialElement.textContent = `#${this.getPrimarySerial(stage, grade)}`;
    },

    updateRelativeSerialBadge(rowElement, index) {
        this.handleRelativeStageGradeChange(rowElement, index);
    },

    refreshAllFormSerials() {
        this.updatePrimarySerialBadge();
        const container = typeof document !== 'undefined'
            ? document.getElementById('siblingsContainer')
            : null;
        container?.querySelectorAll('.relative-card').forEach((row, index) => {
            this.updateRelativeSerialBadge(row, index);
        });
    },

    bindFormSerialListeners() {
        if (typeof document === 'undefined' || document.body?.dataset.formSerialsBound === 'true') {
            return;
        }
        document.addEventListener('change', event => {
            if (event.target?.matches?.(
                '#primary-stage-select, #primary-grade-select, ' +
                '#siblingsContainer .relative-stage-select, #siblingsContainer .relative-grade-select'
            )) {
                this.refreshAllFormSerials();
            }
        });
        if (document.body) document.body.dataset.formSerialsBound = 'true';
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

    updateSiblingDualReg(idx, selectionData) {
        if (!this.siblingsList[idx]) return;
        this.siblingsList[idx].dualStage = selectionData;
        this.renderSiblingsSection();
        
        // Add success feedback animation to the specific sibling button
        setTimeout(() => {
            const btns = document.querySelectorAll('#siblingsContainer .choose-grades-btn');
            const targetBtn = Array.from(btns).find(b => b.innerText.includes('تم الربط') && b.onclick.toString().includes(`index = ${idx}`));
            if (targetBtn) {
                targetBtn.classList.add('payment-success-pulse');
                setTimeout(() => targetBtn.classList.remove('payment-success-pulse'), 600);
            }
        }, 50);
    },

    clearSiblingDualReg(idx) {
        if (!this.siblingsList[idx]) return;
        this.siblingsList[idx].dualStage = null;
        this.renderSiblingsSection();
    },

    updateSiblingCustomFee(idx, fees) {
        if (!this.siblingsList[idx]) return;
        this.siblingsList[idx].customFees = fees;
        this.renderSiblingsSection();
    },

    clearSiblingCustomFee(idx) {
        if (!this.siblingsList[idx]) return;
        this.siblingsList[idx].customFees = null;
        this.renderSiblingsSection();
    },

    renderSiblingsSection() {
        const container = document.getElementById('siblingsContainer');
        if (!container) return;
        const stages = window.Auth.getSelectedStages();
        const selectedGrades = window.Auth.getSelectedGrades();

        container.innerHTML = this.siblingsList.map((sibling, idx) => {
            const isDedicatedStage = this.isDedicatedStage(sibling.stage);
            const gradeOptions = sibling.stage
                ? (isDedicatedStage ? [1] : (selectedGrades[sibling.stage] || []))
                : [];
            const hasDual = !!sibling.dualStage;
            const hasCustomFee = !!sibling.customFees;
            const shouldShowCode = Boolean(
                sibling.stage && (isDedicatedStage || sibling.grade)
            );

            const dualBadgeHtml = hasDual ? `
                <div style="margin-bottom:15px; padding:8px 15px; background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:10px; font-size:0.8rem; color:#10b981; font-weight:800; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-link"></i>
                    <span>مسار إضافي: <strong>${sibling.dualStage.label}</strong></span>
                    <button type="button" onclick="window.StudentSiblings.clearSiblingDualReg(${idx})" style="margin-right:auto; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times-circle"></i></button>
                </div>
            ` : '';

            const feeBadgeHtml = hasCustomFee ? `
                <div style="margin-bottom:8px; padding:8px 15px; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px; font-size:0.8rem; color:#f59e0b; font-weight:800; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-coins"></i>
                    <span>تم تطبيق سعر مخصص للقريب</span>
                    <button type="button" onclick="window.StudentSiblings.clearSiblingCustomFee(${idx})" style="margin-right:auto; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times-circle"></i></button>
                </div>
            ` : '';

            return `
                <div class="relative-card" data-relative-index="${idx}" data-sibling-index="${idx}" style="padding:1rem; margin-bottom:0.75rem; background:rgba(147,51,234,0.08); border-radius:16px; border:1px solid rgba(147,51,234,0.25);">
                    <div class="relative-card-header" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <span class="relative-title" style="color:#c084fc; font-weight:800; font-size:0.9rem;"><i class="fas fa-user-friends" style="margin-left:5px;"></i>قريب ${idx + 1}</span>
                        <div class="relative-generated-info" style="display:${shouldShowCode ? 'flex' : 'none'}; gap:8px; align-items:center; flex-wrap:wrap;">
                            <span class="badge serial-badge" style="background:#1e1b4b; color:#a855f7; padding:4px 8px; border-radius:6px; font-size:0.74rem; font-weight:800;">
                                مسلسل: <strong class="relative-serial-num">#${sibling.generatedSerial || '--'}</strong>
                            </span>
                            <span class="badge code-badge" style="background:#064e3b; color:#34d399; padding:4px 8px; border-radius:6px; font-size:0.74rem; font-weight:800;">
                                كود الطالب: <strong class="relative-student-code">${this.escapeHtml(sibling.studentCode || sibling.generatedCode || '------')}</strong>
                            </span>
                        </div>
                        <div style="display:flex; gap:8px; margin-right:auto;">
                            <button type="button" 
                                    onclick="event.preventDefault(); event.stopPropagation(); if(${hasDual}) window.StudentSiblings.clearSiblingDualReg(${idx}); else window.MultiRegistrationUI.open('sibling', '${sibling.stage || ''}', ${sibling.grade || 'null'}, ${idx})" 
                                    class="choose-grades-btn"
                                    style="height:44px; background:${hasDual ? 'rgba(16,185,129,0.15)' : 'rgba(147,51,234,0.1)'}; border:1px solid ${hasDual ? '#10b981' : '#9333ea'}; padding:0 12px; color:${hasDual ? '#10b981' : '#c084fc'}; font-size:0.75rem; font-weight:800; border-radius:10px; display:flex; align-items:center; gap:6px;">
                                <i class="fas ${hasDual ? 'fa-check-double' : 'fa-plus-circle'}"></i> 
                                <span>${hasDual ? 'تم الربط' : 'تسجيل مزدوج +'}</span>
                            </button>
                            <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.CustomFeeUI.open('sibling', ${idx})" 
                                    class="choose-grades-btn"
                                    style="height:44px; background:${hasCustomFee ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.05)'}; border:1px solid ${hasCustomFee ? '#10b981' : '#f59e0b'}; padding:0 12px; color:${hasCustomFee ? '#10b981' : '#f59e0b'}; font-size:0.75rem; font-weight:800; border-radius:10px; display:flex; align-items:center; gap:6px;">
                                <i class="fas ${hasCustomFee ? 'fa-coins' : 'fa-tags'}"></i> 
                                <span>${hasCustomFee ? 'سعر مخصص' : 'تخصيص سعر'}</span>
                            </button>
                            <button type="button" onclick="window.StudentSiblings.removeSiblingRow(${idx})" style="background:rgba(239,68,68,0.12);border:none;border-radius:10px;padding:5px 12px;color:#ef4444;cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    ${feeBadgeHtml}
                    ${dualBadgeHtml}
                    <div style="position:relative; margin-bottom:7px;">
                        <i class="fas fa-user" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--text-secondary);"></i>
                        <input type="text" class="relative-name-input" placeholder="اسم القريب بالكامل" value="${this.escapeHtml(sibling.name)}"
                               oninput="window.StudentSiblings.updateSiblingField(${idx}, 'name', this.value)"
                               style="width:100%;padding:10px 40px 10px 12px;border:1px solid rgba(147,51,234,0.2);border-radius:10px;background:rgba(15,15,25,0.6);color:#b4b4d3;font-family:Cairo,sans-serif;box-sizing:border-box;">
                    </div>
                    <select class="relative-stage-select" onchange="window.StudentSiblings.updateSiblingField(${idx}, 'stage', this.value)"
                            style="width:100%;padding:9px 12px;margin-bottom:7px;background:rgba(15,15,25,0.7);border:1px solid rgba(147,51,234,0.2);border-radius:10px;color:#b4b4d3;font-family:Cairo,sans-serif;">
                        <option value="">-- اختر المرحلة --</option>
                        ${stages.map(s => `<option value="${this.escapeHtml(s)}" ${sibling.stage === s ? 'selected' : ''}>${this.escapeHtml(window.STUDENT_CONFIG.stageData[s].name)}</option>`).join('')}
                    </select>
                    <select class="relative-grade-select" onchange="window.StudentSiblings.updateSiblingField(${idx}, 'grade', parseInt(this.value))"
                            style="width:100%;padding:9px 12px;margin-bottom:7px;background:rgba(15,15,25,0.7);border:1px solid rgba(147,51,234,0.2);border-radius:10px;color:#b4b4d3;font-family:Cairo,sans-serif;${isDedicatedStage ? 'display:none;' : ''}"
                            ${!sibling.stage || isDedicatedStage ? 'disabled' : ''}>
                        <option value="">-- اختر الصف --</option>
                        ${gradeOptions.map(g => {
                            const gName = (window.STUDENT_CONFIG.gradeNames[sibling.stage] || [])[g - 1] || `الصف ${g}`;
                            return `<option value="${g}" ${sibling.grade === g ? 'selected' : ''}>${this.escapeHtml(gName)}</option>`;
                        }).join('')}
                    </select>
                    <div class="relative-student-code-wrapper" style="display:${shouldShowCode ? 'block' : 'none'}; margin-top:4px; padding:10px; border:1px solid rgba(16,185,129,0.28); border-radius:10px; background:rgba(16,185,129,0.06);">
                        <label style="display:block; margin-bottom:6px; color:#6ee7b7; font-size:0.78rem; font-weight:800;">
                            <i class="fas fa-id-card" style="margin-left:4px;"></i> كود الطالب
                        </label>
                        <select class="relative-student-select"
                                onchange="window.StudentSiblings.updateRelativeStudent(${idx}, this.value)"
                                style="width:100%;padding:9px 12px;margin-bottom:7px;background:rgba(15,15,25,0.78);border:1px solid rgba(16,185,129,0.28);border-radius:10px;color:#b4b4d3;font-family:Cairo,sans-serif;">
                            <option value="">اختر الطالب المسجل (اختياري)</option>
                            ${this.getStudentsByStageAndGrade(sibling.stage, sibling.grade).map(student => {
                                const code = String(student.studentCode || student.code || '').trim();
                                const selected = sibling.studentId != null
                                    ? String(student.id) === String(sibling.studentId)
                                    : Boolean(sibling.studentCode && code === String(sibling.studentCode).trim());
                                return `<option value="${this.escapeHtml(student.id)}" data-code="${this.escapeHtml(code)}" ${selected ? 'selected' : ''}>${this.escapeHtml(student.name)}${code ? ` (${this.escapeHtml(code)})` : ''}</option>`;
                            }).join('')}
                        </select>
                        <input type="text" class="relative-student-code-input"
                               value="${this.escapeHtml(sibling.studentCode || '')}"
                               oninput="window.StudentSiblings.updateRelativeStudentCode(${idx}, this.value)"
                               placeholder="أو أدخل كود الطالب يدويًا"
                               inputmode="numeric"
                               style="width:100%;padding:9px 12px;box-sizing:border-box;background:rgba(15,15,25,0.7);border:1px solid rgba(16,185,129,0.22);border-radius:10px;color:#b4b4d3;font-family:Cairo,sans-serif;">
                    </div>
                </div>
            `;
        }).join('');

        this.refreshAllFormSerials();
    },

    clear() {
        this.siblingsList = [];
    }
};

// Keep a small global hook for integrations that update a row outside the
// inline change handlers used by this form.
window.handleRelativeStageGradeChange = rowElement =>
    window.StudentSiblings.handleRelativeStageGradeChange(rowElement);
window.onRelativeGradeChange = window.handleRelativeStageGradeChange;
window.getNextFormSerial = (stage, grade, currentRowIndex = null) =>
    window.StudentSiblings.getNextFormSerial(stage, grade, currentRowIndex);
window.refreshAllFormSerials = () => window.StudentSiblings.refreshAllFormSerials();
window.StudentSiblings.bindFormSerialListeners();
