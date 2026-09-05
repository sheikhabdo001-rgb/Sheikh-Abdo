/**
 * Student Form Manager
 * Handles the logic for Add/Edit student modal, including validation,
 * multi-registration, sibling link creation, and custom pricing state.
 */
window.StudentFormManager = {
    parent: null,
    mainStudentDualReg: null,
    mainStudentCustomFees: null,
    quickAddKeyHandler: null,

    init(parent) {
        this.parent = parent;
        this.setupListeners();
    },

    setupListeners() {
        const confirmAddBtn = document.getElementById('confirmAddStudentBtn');
        if (confirmAddBtn) {
            confirmAddBtn.onclick = () => this.saveStudent();
        }
    },

    clearQuickAddShortcut() {
        if (this.quickAddKeyHandler) {
            document.removeEventListener('keydown', this.quickAddKeyHandler);
            this.quickAddKeyHandler = null;
        }
    },

    armQuickAddShortcut() {
        this.clearQuickAddShortcut();

        this.quickAddKeyHandler = (e) => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            e.stopPropagation();
            this.clearQuickAddShortcut();

            // Treat Enter as the confirmation action as well, then open a
            // clean form for the next student.
            window.NotificationSystem?.handleAction(true);
            this.openAddStudentModal();
        };

        document.addEventListener('keydown', this.quickAddKeyHandler);
    },

    resetForNewStudent() {
        const modal = document.getElementById('addStudentModal');
        if (modal) {
            modal.querySelectorAll('input, textarea').forEach(field => {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = false;
                } else {
                    field.value = '';
                }
            });
            modal.querySelectorAll('select').forEach(field => {
                field.selectedIndex = 0;
            });
        }

        this.mainStudentDualReg = null;
        this.mainStudentCustomFees = null;
        window.StudentSiblings?.clear();

        const siblingsContainer = document.getElementById('siblingsContainer');
        if (siblingsContainer) siblingsContainer.innerHTML = '';
    },

    handleAddStudentSuccess() {
        window.notify.success('تمت إضافة الطالب بنجاح');
        this.armQuickAddShortcut();
    },

    updateCustomFeeBadge() {
        const badge = document.getElementById('mainCustomFeeBadge');
        const clearBtn = document.getElementById('clearMainCustomFee');
        const btn = document.getElementById('mainCustomFeeBtn');

        if (this.mainStudentCustomFees) {
            if (badge) badge.style.display = 'flex';
            if (clearBtn) {
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.mainStudentCustomFees = null;
                    this.updateCustomFeeBadge();
                };
            }
            if (btn) {
                btn.innerHTML = '<i class="fas fa-coins"></i> <span>سعر مخصص</span>';
                btn.style.borderColor = '#10b981';
                btn.style.background = 'rgba(16, 185, 129, 0.15)';
                btn.style.color = '#10b981';
            }
        } else {
            if (badge) badge.style.display = 'none';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-tags"></i> <span>تخصيص سعر</span>';
                btn.style.borderColor = '#f59e0b';
                btn.style.background = 'rgba(245, 158, 11, 0.05)';
                btn.style.color = '#f59e0b';
            }
        }
    },

    updateDualRegBadge() {
        const badge = document.getElementById('mainDualRegBadge');
        const labelEl = document.getElementById('mainDualRegLabel');
        const clearBtn = document.getElementById('clearMainDualReg');
        const btn = document.getElementById('mainDualRegBtn');
        
        if (this.mainStudentDualReg) {
            if (badge) badge.style.display = 'flex';
            if (labelEl) labelEl.textContent = this.mainStudentDualReg.label;
            if (clearBtn) {
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.mainStudentDualReg = null;
                    this.updateDualRegBadge();
                };
            }
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check-double"></i> <span>تم الربط</span>';
                btn.style.borderColor = '#10b981';
                btn.style.background = 'rgba(16, 185, 129, 0.15)';
                btn.style.color = '#10b981';
                btn.classList.add('payment-success-pulse');
                setTimeout(() => btn.classList.remove('payment-success-pulse'), 600);
            }
        } else {
            if (badge) badge.style.display = 'none';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> <span>تسجيل مزدوج +</span>';
                btn.style.borderColor = '#9333ea';
                btn.style.background = 'rgba(147, 51, 234, 0.1)';
                btn.style.color = '#c084fc';
            }
        }
    },

    openAddStudentModal(studentToEdit = null) {
        this.clearQuickAddShortcut();

        const modal = document.getElementById('addStudentModal');
        const titleEl = document.getElementById('addStudentModalTitle');
        const nameInput = document.getElementById('newStudentName');
        const phoneInput = document.getElementById('newStudentPhone');
        const parentPhoneInput = document.getElementById('newParentPhone');
        const serialDisplay = document.getElementById('assignedSerialNumber');
        const codeDisplay = document.getElementById('assignedStudentCode');
        const warning = document.getElementById('duplicateWarning');
        
        if (warning) warning.classList.remove('show');

        const students = window.StudentStore.getStudents(this.parent.currentStage, this.parent.currentGrade);

        if (studentToEdit) {
            this.parent.editingStudentId = studentToEdit.id;
            this.currentStudentCode = studentToEdit.studentCode;
            if (titleEl) titleEl.textContent = 'تعديل بيانات الطالب';
            if (nameInput) nameInput.value = studentToEdit.name || '';
            if (phoneInput) phoneInput.value = studentToEdit.phone || '';
            if (parentPhoneInput) parentPhoneInput.value = studentToEdit.parentPhone || '';
            const currentIndex = students.findIndex(s => s.id === studentToEdit.id);
            if (serialDisplay) {
                serialDisplay.textContent = `#${window.StudentStore.getSerial(studentToEdit, currentIndex + 1)}`;
            }
            if (codeDisplay) codeDisplay.textContent = this.currentStudentCode || '------';
        } else {
            this.resetForNewStudent();
            this.parent.editingStudentId = null;
            this.currentStudentCode = window.StudentCodeSystem.generate();
            if (titleEl) titleEl.textContent = 'إضافة طالب جديد';
            const nextSerial = window.StudentSiblings?.getPrimarySerial?.(
                this.parent.currentStage,
                this.parent.currentGrade
            ) || window.StudentStore.getNextAvailableSerial(
                this.parent.currentStage,
                this.parent.currentGrade,
                students
            );
            if (serialDisplay) serialDisplay.textContent = `#${nextSerial}`;
            if (codeDisplay) codeDisplay.textContent = this.currentStudentCode;
        }

        // Setup sync for name/phone during edit/add if they were just scanned or typed? 
        // No, current logic is fine.
        if (studentToEdit && studentToEdit.isDualRegistered) {
            this.mainStudentDualReg = {
                stage: studentToEdit.dualStageId,
                grade: 1, // Fallback for flat stages
                label: studentToEdit.dualStage
            };
        } else {
            this.mainStudentDualReg = null;
        }
        
        this.updateDualRegBadge();
        const mainDualBtn = document.getElementById('mainDualRegBtn');
        if (mainDualBtn) {
            mainDualBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (this.mainStudentDualReg) {
                    this.mainStudentDualReg = null;
                    this.updateDualRegBadge();
                    window.notify.info('تم إلغاء التسجيل المزدوج للطالب');
                } else {
                    window.MultiRegistrationUI.open('main', this.parent.currentStage, this.parent.currentGrade);
                }
            };
            mainDualBtn.style.display = 'flex'; // Always show
        }

        // Custom Fee Logic - unified for Add/Edit
        this.mainStudentCustomFees = studentToEdit ? { base: studentToEdit.customBaseFee, stage: studentToEdit.customStageFee } : null;
        if (this.mainStudentCustomFees && !this.mainStudentCustomFees.base && !this.mainStudentCustomFees.stage) this.mainStudentCustomFees = null;
        this.updateCustomFeeBadge();
        const mainFeeBtn = document.getElementById('mainCustomFeeBtn');
        if (mainFeeBtn) {
            mainFeeBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                window.CustomFeeUI.open('main');
            };
        }

        // Reset siblings; show section for both Add and Edit
        window.StudentSiblings.clear();
        const siblingsSection = document.getElementById('siblingsSection');
        if (siblingsSection) siblingsSection.style.display = 'block';
        
        // If editing, we could theoretically load existing siblings here, 
        // but for safety and simplicity, the user can add NEW siblings even during edit.
        window.StudentSiblings.renderSiblingsSection();

        const addSiblingBtn = document.getElementById('addSiblingBtn');
        if (addSiblingBtn) addSiblingBtn.onclick = () => window.StudentSiblings.addSiblingRow();

        if (modal) modal.classList.add('active');
        if (nameInput) {
            setTimeout(() => {
                if (!modal?.classList.contains('active')) return;
                nameInput.focus();
                if (studentToEdit) {
                    nameInput.select();
                }
            }, 100);

            nameInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.saveStudent();
                }
            };
        }
    },

    saveStudent() {
        const nameInput = document.getElementById('newStudentName');
        const phoneInput = document.getElementById('newStudentPhone');
        const parentPhoneInput = document.getElementById('newParentPhone');
        const isEditing = this.parent.editingStudentId !== null;
        
        const name = nameInput?.value.trim();
        const phone = phoneInput?.value.trim();
        const parentPhone = parentPhoneInput?.value.trim();
        
        if (!name) {
            alert('يرجى إدخال اسم الطالب');
            return;
        }

        let students = window.StudentStore.getStudents(this.parent.currentStage, this.parent.currentGrade);
        const isDuplicate = students.some(s => s.name && s.name.toLowerCase() === name.toLowerCase() && s.id !== this.parent.editingStudentId);
        
        if (isDuplicate) {
            window.notify.error('هذا الاسم موجود بالفعل في القائمة لهذا الصف!');
            return;
        }

        let linkId = null;
        if (isEditing) {
            const existing = students.find(s => s.id === this.parent.editingStudentId);
            if (existing) linkId = existing.link_id || null;
        }

        if (this.mainStudentDualReg && !linkId) {
            linkId = `lnk_${Date.now()}`;
        }

        const validSiblings = window.StudentSiblings.siblingsList.filter(s =>
            String(s.name || '').trim() && s.stage && s.grade
        );
        const mainStudentId = isEditing
            ? this.parent.editingStudentId
            : Date.now();
        const existingMain = isEditing
            ? students.find(s => s.id === this.parent.editingStudentId)
            : null;
        const primarySerial = isEditing
            ? window.StudentStore.getSerial(existingMain)
            : window.StudentStore.getNextAvailableSerial(
                this.parent.currentStage,
                this.parent.currentGrade,
                students
            );

        // Reserve an id for every new relative before saving the main record,
        // so the primary student can keep explicit relativeStudentIds links.
        const relativeRecords = validSiblings.map((sibling, index) => {
            const existing = window.StudentSiblings.getSelectedStudent(sibling);
            return {
                sibling,
                existing,
                index,
                id: existing?.id ?? (Date.now() + 100000 + (index * 1000) + Math.floor(Math.random() * 999))
            };
        });
        const relativeStudentIds = [...new Set(relativeRecords.map(record => record.id))];

        // A manually entered code may belong to an already registered
        // student even when the user did not choose the dropdown option.
        // Resolve it before saving so the existing record is linked instead
        // of creating a duplicate student.
        const duplicateManualCode = validSiblings.find(sibling => {
            const code = String(sibling.studentCode || '').trim();
            return code
                && !window.StudentSiblings.getSelectedStudent(sibling)
                && window.StudentCodeSystem.isCodeUsed(code);
        });
        if (duplicateManualCode) {
            window.notify.error('كود الطالب المدخل مستخدم بالفعل؛ اختر الطالب من القائمة.');
            return;
        }

        const selectedSiblingRecords = relativeRecords
            .map(record => record.existing)
            .filter(Boolean);
        let familyGroupId = null;

        if (isEditing) {
            const existing = students.find(s => s.id === this.parent.editingStudentId);
            if (existing) familyGroupId = existing.family_group_id || null;
        }
        if (!familyGroupId) {
            familyGroupId = selectedSiblingRecords.find(student => student.family_group_id)?.family_group_id || null;
        }
        if (validSiblings.length > 0 && !familyGroupId) {
            familyGroupId = `fam_${Date.now()}`;
        }
        const mergedRelativeIds = [...new Set([
            ...(Array.isArray(existingMain?.relativeStudentIds) ? existingMain.relativeStudentIds : []),
            ...relativeStudentIds
        ])];

        if (isEditing) {
            students = students.map(s => s.id === this.parent.editingStudentId
                ? { ...s, name, phone, parentPhone, 
                    studentCode: s.studentCode || this.currentStudentCode,
                    code: s.code || this.currentStudentCode,
                    is_empty_slot: false,
                    isEmptySlot: false,
                    is_deleted: false,
                    customBaseFee: this.mainStudentCustomFees?.base || null,
                    customStageFee: this.mainStudentCustomFees?.stage || null,
                    relativeStudentIds: mergedRelativeIds,
                    ...(familyGroupId ? { family_group_id: familyGroupId } : {}),
                    ...(linkId ? { link_id: linkId } : {}) }
                : s);
        } else {
            const studentData = {
                id: mainStudentId, name, phone, parentPhone,
                studentCode: this.currentStudentCode,
                code: this.currentStudentCode,
                serialNumber: primarySerial,
                serialNo: primarySerial,
                serial_number: primarySerial,
                is_empty_slot: false,
                isEmptySlot: false,
                is_deleted: false,
                createdAt: new Date().toISOString(),
                relativeStudentIds: mergedRelativeIds,
                customBaseFee: this.mainStudentCustomFees?.base || null,
                customStageFee: this.mainStudentCustomFees?.stage || null,
                ...(familyGroupId ? { family_group_id: familyGroupId } : {}),
                ...(linkId ? { link_id: linkId } : {})
            };
            const emptySlotIndex = window.StudentStore.findSlotIndex(students, primarySerial);
            if (emptySlotIndex !== -1) {
                students[emptySlotIndex] = { ...students[emptySlotIndex], ...studentData, updatedAt: new Date().toISOString() };
            } else {
                students.push(studentData);
            }
        }
        window.StudentStore.saveStudents(this.parent.currentStage, this.parent.currentGrade, students);

        if (this.mainStudentDualReg && linkId) {
            const sId = this.mainStudentDualReg.stage;
            const gIdx = this.mainStudentDualReg.grade;
            
            let targetStudents = window.StudentStore.getStudents(sId, gIdx);
            const targetSerial = window.StudentStore.getNextAvailableSerial(sId, gIdx, targetStudents);
            const newData = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name, phone, parentPhone,
                studentCode: this.currentStudentCode,
                code: this.currentStudentCode,
                serialNumber: targetSerial,
                serialNo: targetSerial,
                serial_number: targetSerial,
                is_empty_slot: false,
                isEmptySlot: false,
                is_deleted: false,
                createdAt: new Date().toISOString(),
                link_id: linkId,
                dualStage: this.mainStudentDualReg.label,
                isDualRegistered: true,
                dualStageId: sId,
                customBaseFee: this.mainStudentCustomFees?.base || null,
                customStageFee: this.mainStudentCustomFees?.stage || null,
                relativeStudentIds: mergedRelativeIds,
                ...(familyGroupId ? { family_group_id: familyGroupId } : {})
            };
            
            const emptyIdx = window.StudentStore.findSlotIndex(targetStudents, targetSerial);
            if (emptyIdx !== -1) targetStudents[emptyIdx] = { ...targetStudents[emptyIdx], ...newData };
            else targetStudents.push(newData);
            
            window.StudentStore.saveStudents(sId, gIdx, targetStudents);
            window.notify.success(`تم تسجيل الطالب في "${this.mainStudentDualReg.label}" بنجاح`);
        }

        if (validSiblings.length > 0 && familyGroupId) {
            relativeRecords.forEach(({ sibling: sib, existing: existingSibling, id: relativeId, index }) => {
                let sibStudents = window.StudentStore.getStudents(sib.stage, sib.grade);

                if (existingSibling) {
                    // The selected code identifies an existing student. Add
                    // that record to the family without inserting a second
                    // copy with the same name/code.
                    const linkedStudents = sibStudents.map(student =>
                        String(student.id) === String(existingSibling.id)
                            ? {
                                ...student,
                                family_group_id: familyGroupId,
                                isRelativeRecord: true,
                                relativeOfStudentId: mainStudentId
                            }
                            : student
                    );
                    window.StudentStore.saveStudents(sib.stage, sib.grade, linkedStudents);
                    return;
                }

                let sibLinkId = sib.dualStage ? `lnk_sib_${Date.now()}_${Math.floor(Math.random()*1000)}` : null;

                const sibCode = String(sib.studentCode || sib.generatedCode || '').trim()
                    || window.StudentSiblings.generateUniqueStudentCode();
                const sibSerial = window.StudentStore.getNextAvailableSerial(
                    sib.stage,
                    sib.grade,
                    sibStudents
                );
                const sibData = {
                    id: relativeId,
                    name: sib.name.trim(), phone: '', parentPhone,
                    studentCode: sibCode,
                    code: sibCode,
                    serialNumber: sibSerial,
                    serialNo: sibSerial,
                    serial_number: sibSerial,
                    is_empty_slot: false,
                    isEmptySlot: false,
                    is_deleted: false,
                    createdAt: new Date().toISOString(),
                    family_group_id: familyGroupId,
                    isRelativeRecord: true,
                    relativeOfStudentId: mainStudentId,
                    isDualRegistered: !!sib.dualStage,
                    dualStageId: sib.dualStage ? sib.dualStage.stage : null,
                    customBaseFee: sib.customFees?.base || null,
                    customStageFee: sib.customFees?.stage || null,
                    ...(sibLinkId ? { link_id: sibLinkId } : {})
                };
                const emptySlot = window.StudentStore.findSlotIndex(sibStudents, sibSerial);
                if (emptySlot !== -1) sibStudents[emptySlot] = { ...sibStudents[emptySlot], ...sibData };
                else sibStudents.push(sibData);
                window.StudentStore.saveStudents(sib.stage, sib.grade, sibStudents);

                if (sib.dualStage && sibLinkId) {
                    let targetSibStudents = window.StudentStore.getStudents(sib.dualStage.stage, sib.dualStage.grade);
                    const sibDualData = {
                        ...sibData,
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        link_id: sibLinkId,
                        dualStage: sib.dualStage.label,
                        isDualRegistered: true
                    };
                    const dualSerial = window.StudentStore.getNextAvailableSerial(
                        sib.dualStage.stage,
                        sib.dualStage.grade,
                        targetSibStudents
                    );
                    sibDualData.serialNumber = dualSerial;
                    sibDualData.serialNo = dualSerial;
                    sibDualData.serial_number = dualSerial;
                    const emptyIdx = window.StudentStore.findSlotIndex(targetSibStudents, dualSerial);
                    if (emptyIdx !== -1) targetSibStudents[emptyIdx] = { ...targetSibStudents[emptyIdx], ...sibDualData };
                    else targetSibStudents.push(sibDualData);
                    window.StudentStore.saveStudents(sib.dualStage.stage, sib.dualStage.grade, targetSibStudents);
                }
            });
            window.notify.success(`تم ربط ${validSiblings.length} قريب/أخ بنفس العائلة`);
        }

        window.StudentSiblings.clear();
        const modal = document.getElementById('addStudentModal');
        if (modal) modal.classList.remove('active');
        
        this.parent.loadStudentsData();
        this.parent.refreshPaymentsIfVisible();

        if (!isEditing) {
            this.handleAddStudentSuccess();
        }
    }
};
