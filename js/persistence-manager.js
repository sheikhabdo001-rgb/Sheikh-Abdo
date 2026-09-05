window.PersistenceManager = {
    INIT_KEY: 'app_data_initialized',

    init() {
        if (localStorage.getItem(this.INIT_KEY) === 'true') {
            this.hydrateFromStorage();
            return;
        }
        localStorage.setItem(this.INIT_KEY, 'true');
    },

    hydrateFromStorage() {
        window.FinancialData.load();
        if (window.AuthUI && window.AuthUI.checkLoginState) {
            window.AuthUI.checkLoginState();
        }
    },

    initializeTeacherData() {
        if (!window.TenantStore?.getCurrentTeacherId()) return;
        window.FinancialData.load();
    },

    loadDefaultData() {
        this.initStudents();
        this.initGroups();
        this.initPaymentConfig();
        this.initAttendanceHistory();
        window.FinancialData.load();
    },

    initStudents() {
        const stages = ['primary', 'preparatory', 'secondary'];
        const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
        const sampleNames = {
            primary: ['أحمد علي', 'محمود حسن', 'سارة محمد', 'عمر خالد', 'نور أحمد', 'مريم عبدالله'],
            preparatory: ['يوسف إبراهيم', 'لينا عادل', 'مصطفى كريم', 'حبيبة سامي', 'علي عمر', 'جنى محمود'],
            secondary: ['خالد ناصر', 'سلمى جمال', 'أحمد فتحي', 'رنا حسن', 'محمد ياسر', 'دينا شريف']
        };

        stages.forEach(stage => {
            for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                const key = `students_${stage}_${grade}`;
                if (localStorage.getItem(key)) continue;

                const names = sampleNames[stage] || [];
                const students = names.map((name, idx) => {
                    const code = Math.floor(100000 + Math.random() * 899999).toString();
                    return {
                        id: Date.now() + idx + (stage.charCodeAt(0) * grade * 100),
                        name: name,
                        studentCode: code,
                        phone: `01${String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 9)}`,
                        parentPhone: `01${String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 9)}`,
                        createdAt: Date.now() - (idx * 86400000),
                        family_group_id: null,
                        link_id: null
                    };
                });
                localStorage.setItem(key, JSON.stringify(students));
            }
        });
    },

    initGroups() {
        const stages = ['primary', 'preparatory', 'secondary'];
        const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
        const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

        stages.forEach(stage => {
            for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                const key = `groups_${stage}_${grade}`;
                if (localStorage.getItem(key)) {
                    continue;
                }

                const groups = [
                    {
                        name: 'المجموعة 1',
                        schedule: [
                            { day: 'السبت', time: '09:00 - 10:30' },
                            { day: 'الاثنين', time: '09:00 - 10:30' },
                            { day: 'الأربعاء', time: '09:00 - 10:30' }
                        ]
                    },
                    {
                        name: 'المجموعة 2',
                        schedule: [
                            { day: 'الأحد', time: '10:30 - 12:00' },
                            { day: 'الثلاثاء', time: '10:30 - 12:00' },
                            { day: 'الخميس', time: '10:30 - 12:00' }
                        ]
                    },
                    {
                        name: 'المجموعة 3',
                        schedule: [
                            { day: 'السبت', time: '11:00 - 12:30' },
                            { day: 'الأحد', time: '09:00 - 10:30' },
                            { day: 'الثلاثاء', time: '09:00 - 10:30' }
                        ]
                    }
                ];
                localStorage.setItem(key, JSON.stringify(groups));
            }
        });
    },

    initPaymentConfig() {
        if (!localStorage.getItem('standard_fees')) {
            const fees = {};
            const stages = ['primary', 'preparatory', 'secondary'];
            const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
            const feeAmounts = { primary: 150, preparatory: 180, secondary: 200 };

            stages.forEach(stage => {
                for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                    fees[`${stage}_${grade}`] = feeAmounts[stage];
                }
            });
            localStorage.setItem('standard_fees', JSON.stringify(fees));
        }

        if (!localStorage.getItem('custom_fees')) {
            localStorage.setItem('custom_fees', '{}');
        }

        const stages = ['primary', 'preparatory', 'secondary'];
        const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };
        const firstTerm = [8, 9, 10, 11];
        const secondTerm = [1, 2, 3, 4];

        stages.forEach(stage => {
            for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                const selKey = `month_selections_${stage}_${grade}`;
                if (!localStorage.getItem(selKey)) {
                    localStorage.setItem(selKey, JSON.stringify({ firstTerm, secondTerm }));
                }

                const startKey = `start_months_${stage}_${grade}`;
                if (!localStorage.getItem(startKey)) {
                    localStorage.setItem(startKey, JSON.stringify({ firstTermStart: 8, secondTermStart: 1 }));
                }
            }
        });
    },

    initAttendanceHistory() {
        const stages = ['primary', 'preparatory', 'secondary'];
        const gradeCounts = { primary: 6, preparatory: 3, secondary: 3 };

        stages.forEach(stage => {
            for (let grade = 1; grade <= gradeCounts[stage]; grade++) {
                const historyKey = `history_index_${stage}_${grade}`;
                if (!localStorage.getItem(historyKey)) {
                    localStorage.setItem(historyKey, '[]');
                }
            }
        });
    },

    ProfileTabState: {
        _key(studentId) {
            return `profile_tab_state_${studentId}`;
        },

        save(studentId, state) {
            const key = this._key(studentId);
            localStorage.setItem(key, JSON.stringify(state));
        },

        load(studentId) {
            const key = this._key(studentId);
            const raw = localStorage.getItem(key);
            if (raw) {
                try { return JSON.parse(raw); } catch (e) { /* ignore */ }
            }
            return null;
        },

        clear(studentId) {
            localStorage.removeItem(this._key(studentId));
        }
    }
};