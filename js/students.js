window.Students = {
    currentStage: null,
    currentGrade: null,
    searchQuery: '',
    deleteMode: false,
    selectedIds: new Set(),
    editingStudentId: null,

    actions: null,
    deleteManager: null,

    init() {
        // Expose to window for global shortcut access
        window.Students = this;
        
        // Prevent multiple listener attachments if init is called multiple times
        if (this.isInitialized) return;

        this.actions = window.StudentActions;
        this.actions.init(this);

        this.deleteManager = window.StudentDelete;
        this.deleteManager.init(this);

        this.setupModalListeners();
        this.setupSearchListeners();
        this.setupEmptySlotsListeners();
        this.setupScrollToTopButton();
        this.isInitialized = true;
        this.loadStudentsData(); // Load data immediately on first init if global filter is active
    },

    setupSearchListeners() {
        const searchInput = document.getElementById('studentSearchInput');
        const clearBtn = document.getElementById('clearSearch');
        if (!searchInput) return;

        // Debounced search for performance
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            this.searchQuery = e.target.value.trim();
            
            searchTimeout = setTimeout(() => {
                this.loadStudentsData();
            }, 150); // 150ms debounce
        });

        if (clearBtn) {
            clearBtn.onclick = () => {
                clearTimeout(searchTimeout);
                searchInput.value = '';
                this.searchQuery = '';
                this.loadStudentsData();
            };
        }
    },

    setupModalListeners() {
        // Grade Modal
        const gradeModal = document.getElementById('studentGradeModal');
        const closeGradeBtn = document.getElementById('closeStudentGradeModal');
        if (closeGradeBtn) closeGradeBtn.onclick = () => gradeModal.classList.remove('active');
        gradeModal.onclick = (e) => { if (e.target === gradeModal) gradeModal.classList.remove('active'); };

        // Add Student Modal
        const addModal = document.getElementById('addStudentModal');
        const closeAddBtn = document.getElementById('closeAddStudentModal');
        const confirmAddBtn = document.getElementById('confirmAddStudentBtn');
        
        if (closeAddBtn) closeAddBtn.onclick = () => addModal.classList.remove('active');
        addModal.onclick = (e) => { if (e.target === addModal) addModal.classList.remove('active'); };
        
        // save logic moved to StudentFormManager listener
    },

    setupEmptySlotsListeners() {
        const showButton = document.getElementById('showEmptySlotsBtn');
        const modal = document.getElementById('emptySlotsModal');
        const closeButton = document.getElementById('closeEmptySlotsModal');
        if (showButton) showButton.onclick = () => this.openEmptySlotsModal();
        if (closeButton) closeButton.onclick = () => modal?.classList.remove('active');
        if (modal) {
            modal.onclick = event => {
                if (event.target === modal) modal.classList.remove('active');
            };
        }
    },

    setupScrollToTopButton() {
        const scrollTopButton = document.getElementById('scrollToTopBtn');
        if (!scrollTopButton || scrollTopButton.dataset.listenerAttached === 'true') return;

        const updateVisibility = () => {
            scrollTopButton.style.display = window.scrollY > 250 ? 'flex' : 'none';
        };

        scrollTopButton.dataset.listenerAttached = 'true';
        window.addEventListener('scroll', updateVisibility, { passive: true });
        scrollTopButton.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        updateVisibility();
    },

    // removed setupActionListeners() {}
    // removed enterDeleteMode() {}
    // removed exitDeleteMode() {}
    // removed toggleStudentSelection() {}
    // removed updateSelectedCountUI() {}
    // removed confirmDeleteSelected() {}
    // removed openDeleteAllModal() {}
    // removed openAddStudentModal() {}
    // removed saveStudent() {}
    // removed deleteStudent() {}



    loadStudentsData() {
        const dataContainer = document.querySelector('.students-data-container');
        
        // Check global lock
        if (window.GlobalStageFilter.isLocked()) {
            dataContainer.innerHTML = window.GlobalStageFilter.getLockedPlaceholderHTML();
            window.StudentUI.updateStatus(null, null);
            this.updateStudentStats(null, null);
            return;
        }

        // Sync local variables with global filter
        this.currentStage = window.GlobalStageFilter.getActiveStage();
        this.currentGrade = window.GlobalStageFilter.getActiveGrade();

        window.StudentUI.updateStatus(this.currentStage, this.currentGrade);
        this.updateStudentStats(this.currentStage, this.currentGrade);

        let students = window.StudentStore.getStudents(this.currentStage, this.currentGrade)
            .map((student, index) => ({
                ...student,
                originalSerial: window.StudentStore.getSerial(student, index + 1)
            }));

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            let filtered = students.filter(s => {
                const serialMatch = String(s.originalSerial) === query;
                if (!s.name) return serialMatch;
                const nameMatch = String(s.name || '').toLowerCase().includes(query);
                const codeMatch = String(s.studentCode || s.code || '').toLowerCase().includes(query);
                const phoneMatch = (s.phone && s.phone.includes(query)) || (s.parentPhone && s.parentPhone.includes(query));
                return nameMatch || codeMatch || serialMatch || phoneMatch;
            });
            
            filtered.sort((a, b) => {
                const aName = a.name ? a.name.toLowerCase() : '';
                const bName = b.name ? b.name.toLowerCase() : '';
                const aCode = a.studentCode || '';
                const bCode = b.studentCode || '';
                
                const aExact = aName === query || aCode === query || a.originalSerial.toString() === query;
                const bExact = bName === query || bCode === query || b.originalSerial.toString() === query;
                
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;
                return aName.startsWith(query) ? -1 : 1;
            });
            this.renderStudentsTable(filtered, dataContainer, true);
        } else {
            if (students.length === 0) {
                dataContainer.innerHTML = `<div class="placeholder-content"><i class="fas fa-user-friends"></i><p>لا يوجد طلاب مضافين حالياً</p></div>`;
            } else {
                this.renderStudentsTable(students, dataContainer, false);
            }
        }
    },

    renderStudentsTable(students, container, isSearch = false) {
        window.StudentUI.renderTable(students, container, {
            isSearch,
            searchQuery: this.searchQuery,
            onEdit: (s) => this.actions.openAddStudentModal(s),
            onDelete: (id) => this.actions.deleteStudent(id),
            onExpel: (id) => this.manualExpelStudent(id),
            onLink: (student) => this.actions.openLinkStudentModal({
                ...student,
                stage: this.currentStage,
                grade: this.currentGrade
            }),
            deleteMode: this.deleteMode,
            selectedIds: this.selectedIds,
            onToggleSelect: (id, isSelected) => {
                if (typeof isSelected === 'boolean') {
                    this.deleteManager.setStudentSelection(id, isSelected);
                } else {
                    this.deleteManager.toggleStudentSelection(id);
                }
            }
        });
    },

    async manualExpelStudent(studentId) {
        const student = window.StudentStore.getStudents(this.currentStage, this.currentGrade)
            .find(item => String(item.id) === String(studentId));
        if (!student || window.StudentStore.isEmptySlot(student)) return;

        const confirmed = await window.confirm(
            `هل أنت أصلًا مطمئن لطرد الطالب ${student.name} يدويًا؟`
        );
        if (!confirmed) return;

        const record = window.StudentStore.expelStudentManually(
            this.currentStage,
            this.currentGrade,
            studentId
        );
        if (!record) return;

        this.selectedIds.delete(studentId);
        window.notify?.success?.(
            `تم طرد الطالب ${student.name} يدويًا وحفظه في قائمة المطرودين.`
        );
        this.loadStudentsData();
        this.refreshPaymentsIfVisible();
    },

    updateStudentStats(stage, grade) {
        const widget = document.getElementById('studentStatsWidget');
        if (!widget) return;
        if (!stage || !grade) {
            widget.style.display = 'none';
            return;
        }

        const students = window.StudentStore.getStudents(stage, grade);
        const emptySlots = students
            .filter(student => window.StudentStore.isEmptySlot(student))
            .sort((a, b) => window.StudentStore.getSerial(a) - window.StudentStore.getSerial(b));
        const activeCount = students.length - emptySlots.length;
        const format = value => window.AppUtils?.formatNumber
            ? window.AppUtils.formatNumber(value)
            : String(value);

        widget.style.display = 'flex';
        const activeCountEl = document.getElementById('activeStudentsCount');
        const emptyCountEl = document.getElementById('emptySlotsCount');
        if (activeCountEl) activeCountEl.textContent = format(activeCount);
        if (emptyCountEl) emptyCountEl.textContent = format(emptySlots.length);
        widget.dataset.emptySlots = JSON.stringify(emptySlots.map((student, index) =>
            window.StudentStore.getSerial(student, index + 1)
        ));
    },

    openEmptySlotsModal() {
        const modal = document.getElementById('emptySlotsModal');
        const list = document.getElementById('emptySlotsList');
        const summary = document.getElementById('emptySlotsModalSummary');
        if (!modal || !list) return;

        const students = window.StudentStore.getStudents(this.currentStage, this.currentGrade);
        const serials = students
            .filter(student => window.StudentStore.isEmptySlot(student))
            .map((student, index) => window.StudentStore.getSerial(student, index + 1))
            .sort((a, b) => a - b);
        const format = value => window.AppUtils?.formatNumber
            ? window.AppUtils.formatNumber(value)
            : String(value);

        if (summary) {
            summary.textContent = serials.length
                ? `المربعات الخالية: ${serials.length}`
                : 'لا توجد مربعات خالية حالياً';
        }
        list.innerHTML = serials.length
            ? serials.map(serial => `<span class="empty-slot-chip">#${format(serial)}</span>`).join('')
            : '<p class="empty-slots-none">لا توجد أرقام شاغرة لعرضها.</p>';
        modal.classList.add('active');
    },

    refreshPaymentsIfVisible() {
        const paymentsView = document.getElementById('paymentsView');
        const nonPayersView = document.getElementById('nonPayersView');

        // Refresh Non-Payers list if visible
        if (nonPayersView && nonPayersView.style.display !== 'none') {
            if (window.PaymentsModals) {
                window.PaymentsModals.renderNonPayersListView();
            }
        }

        if (!paymentsView || paymentsView.style.display === 'none') return;

        const container = document.getElementById('paymentsTableContainer');
        const previousScroll = container ? container.scrollTop : 0;

        if (window.StudentPayments && window.StudentPayments.parent) {
            window.StudentPayments.renderPaymentsTable();
            if (container) container.scrollTop = previousScroll;
        }
    }

    // removed openAttendanceView() {}
    // removed openPaymentsView() {}
    // removed setupPaymentsListeners() {}
    // removed renderPaymentsTable() {}
};
