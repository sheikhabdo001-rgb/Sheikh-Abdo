window.makeElementDraggable = function makeElementDraggable(elmnt) {
    if (!elmnt || elmnt.dataset.draggableBound === 'true') return;
    elmnt.dataset.draggableBound = 'true';

    let pos1 = 0;
    let pos2 = 0;
    let pos3 = 0;
    let pos4 = 0;

    elmnt.onmousedown = dragMouseDown;
    elmnt.ontouchstart = dragMouseDown;

    function dragMouseDown(event) {
        if (event.target?.tagName === 'BUTTON' || event.target?.closest?.('button')) return;

        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        pos3 = clientX;
        pos4 = clientY;
        elmnt.classList.add('is-dragging');

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement;
        document.ontouchcancel = closeDragElement;
        document.ontouchmove = elementDrag;
    }

    function elementDrag(event) {
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;

        elmnt.style.setProperty('top', `${elmnt.offsetTop - pos2}px`, 'important');
        elmnt.style.setProperty('left', `${elmnt.offsetLeft - pos1}px`, 'important');
        if (event.touches) event.preventDefault();
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchcancel = null;
        document.ontouchmove = null;
        elmnt.classList.remove('is-dragging');
    }
};

window.StudentDelete = {
    parent: null,

    init(parent) {
        this.parent = parent;
        this.ensureSelectionFloatingBox();
        this.setupListeners();
    },

    ensureSelectionFloatingBox() {
        const floatingBox = document.getElementById('floatingDeleteConfirm')
            || document.querySelector('.selection-floating-box');
        if (!floatingBox) return null;

        // Detach it from #studentsView so table/content wrappers cannot clip
        // or create a competing stacking context around the action bar.
        if (floatingBox.parentElement !== document.body) {
            document.body.appendChild(floatingBox);
        }
        window.makeElementDraggable(floatingBox);
        return floatingBox;
    },

    setupListeners() {
        document.getElementById('btnDeleteSelection')?.addEventListener('click', () => {
            document.getElementById('deleteSubmenu').classList.remove('active');
            this.enterDeleteMode();
        });

        document.getElementById('btnDeleteAll')?.addEventListener('click', () => {
            document.getElementById('deleteSubmenu').classList.remove('active');
            this.openDeleteAllModal();
        });

        document.getElementById('cancelSelectionBtn')?.addEventListener('click', () => this.exitDeleteMode());
        document.getElementById('confirmDeleteSelectionBtn')?.addEventListener('click', () => this.confirmDeleteSelected());
    },

    async deleteStudent(studentId) {
        const confirmed = await window.confirm('هل أنت متأكد من حذف هذا الطالب نهائياً؟ سيتم حذف بياناته من الموقع وقاعدة البيانات.');
        if (!confirmed) return;
        const student = window.StudentStore
            .getStudents(this.parent.currentStage, this.parent.currentGrade)
            .find(item => String(item.id) === String(studentId));
        if (!student || window.StudentStore.isEmptySlot(student)) return;

        try {
            await window.StudentStore.hardDeleteStudentData(
                this.parent.currentStage,
                this.parent.currentGrade,
                student,
                { keepSlot: true }
            );
        } catch (error) {
            window.notify?.error('تعذر حذف الطالب من قاعدة البيانات');
            return;
        }
        this.parent.loadStudentsData();
        this.parent.refreshPaymentsIfVisible();
    },

    enterDeleteMode() {
        this.parent.deleteMode = true;
        this.parent.selectedIds.clear();
        document.getElementById('floatingDeleteConfirm').style.display = 'flex';
        this.updateSelectedCountUI();
        this.parent.loadStudentsData();
    },

    exitDeleteMode() {
        this.parent.deleteMode = false;
        this.parent.selectedIds.clear();
        document.getElementById('floatingDeleteConfirm').style.display = 'none';
        this.parent.loadStudentsData();
        this.parent.refreshPaymentsIfVisible();
    },

    toggleStudentSelection(studentId) {
        const student = window.StudentStore
            .getStudents(this.parent.currentStage, this.parent.currentGrade)
            .find(item => String(item.id) === String(studentId));
        if (!student || window.StudentStore.isEmptySlot(student)) return;

        this.setStudentSelection(studentId, !this.parent.selectedIds.has(studentId));
    },

    setStudentSelection(studentId, isSelected) {
        const student = window.StudentStore
            .getStudents(this.parent.currentStage, this.parent.currentGrade)
            .find(item => String(item.id) === String(studentId));
        if (!student || window.StudentStore.isEmptySlot(student)) return;

        if (isSelected) this.parent.selectedIds.add(studentId);
        else this.parent.selectedIds.delete(studentId);
        this.updateSelectedCountUI();
        this.parent.loadStudentsData();
    },

    updateSelectedCountUI() {
        // Re-assert the body attachment whenever selection state changes.
        // StudentUI can safely replace the table subtree without affecting
        // this independent floating element.
        const floatingBox = this.ensureSelectionFloatingBox();
        if (floatingBox && this.parent.deleteMode) {
            floatingBox.style.display = 'flex';
        }
        const count = this.parent.selectedIds.size;
        document.getElementById('selectedCountText').textContent = `عدد الطلاب المحددين: ${count}`;
        const confirmBtn = document.getElementById('confirmDeleteSelectionBtn');
        confirmBtn.disabled = count === 0;
        confirmBtn.style.opacity = count === 0 ? '0.5' : '1';
    },

    async confirmDeleteSelected() {
        if (this.parent.selectedIds.size === 0) return;
        if (!await window.confirm(`هل أنت متأكد من حذف بيانات ${this.parent.selectedIds.size} طلاب نهائياً؟`)) return;

        const students = window.StudentStore.getStudents(this.parent.currentStage, this.parent.currentGrade);
        try {
            for (const student of students.filter(item =>
                this.parent.selectedIds.has(item.id) && !window.StudentStore.isEmptySlot(item)
            )) {
                await window.StudentStore.hardDeleteStudentData(
                    this.parent.currentStage,
                    this.parent.currentGrade,
                    student,
                    { keepSlot: true }
                );
            }
        } catch (error) {
            window.notify?.error('تعذر حذف بعض الطلاب من قاعدة البيانات');
            return;
        }
        this.exitDeleteMode();
    },

    openDeleteAllModal() {
        const modal = document.getElementById('deleteAllModal');
        if (!modal) return;
        modal.classList.add('active');
        
        const closeBtn = document.getElementById('closeDeleteAllModal');
        const cancelBtn = document.getElementById('cancelDeleteAllBtn');
        const confirmBtn = document.getElementById('confirmDeleteAllBtn');

        closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
        cancelBtn?.addEventListener('click', () => modal.classList.remove('active'));
        confirmBtn?.addEventListener('click', async () => {
            try {
                await window.StudentStore.clearStudents(
                    this.parent.currentStage,
                    this.parent.currentGrade
                );
            } catch (error) {
                window.notify?.error('تعذر حذف الطلاب من قاعدة البيانات');
                return;
            }
            modal.classList.remove('active');
            this.parent.loadStudentsData();
            this.parent.refreshPaymentsIfVisible();
        });
    }
};
