/**
 * Converts a schedule time from 24-hour input to a consistently padded
 * 12-hour value with Arabic period indicators.
 *
 * Examples:
 *   17:00     -> 05:00 م
 *   05:00:00  -> 05:00 ص
 */
function formatScheduleTime(timeStr) {
    if (!timeStr) return '';
    
    // Handles formats like "17:00" or "17:00:00"
    let parts = timeStr.trim().split(':');
    let hours = parseInt(parts[0], 10);
    let minutes = parts[1] || '00';
    
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight, 13-23 to 1-11
    
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    
    return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Global Utilities and Time Formatters
 */
window.AppUtils = {
    /**
     * Standardizes all numbers to Western numerals for reporting consistency
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toString().toLocaleString('en-US', { useGrouping: false });
    },

    /**
     * Converts any date object, timestamp, or HH:mm string to a localized 12-hour format (AM/PM)
     */
    formatTime12h(timeInput) {
        if (timeInput === undefined || timeInput === null || timeInput === '') return '';
        
        let date;
        if (timeInput instanceof Date) {
            date = timeInput;
        } else if (typeof timeInput === 'number') {
            date = new Date(timeInput);
        } else if (typeof timeInput === 'string') {
            // Handle time range: "14:00 - 16:00"
            if (timeInput.includes(' - ')) {
                return timeInput.split(' - ').map(part => this.formatTime12h(part.trim())).join(' - ');
            }
            // Handle single time string: "14:00"
            if (timeInput.includes(':')) {
                const [h, m] = timeInput.split(':').map(Number);
                date = new Date();
                date.setHours(h || 0, m || 0, 0, 0);
            } else {
                date = new Date(timeInput);
            }
        }

        if (!date || isNaN(date.getTime())) return timeInput;

        // Force 'en-US' locale to ensure Western numerals (123) in reports
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace('AM', 'ص').replace('PM', 'م');
    },

    /**
     * Schedule-specific formatter used by detailed schedule exports.
     */
    formatScheduleTime,

    /**
     * Formats a date with 12-hour time using consistent numerals
     */
    formatFullDateTime(dateInput) {
        return this.formatJoinDate(dateInput);
    },

    /**
     * Standardized join-date formatter.
     * Produces a clean "DD/MM/YYYY - HH:MM ص/م" string with explicit spaces,
     * free of parentheses that break under mixed RTL/LTR rendering.
     */
    formatJoinDate(dateInput) {
        if (!dateInput) return '---';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '---';

        const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12;
        const formattedHours = hours.toString().padStart(2, '0');

        return `${datePart} - ${formattedHours}:${minutes} ${period}`;
    }
};

// Global State Management for Stage & Grade Filtering
const SAVED_GRADE_KEY = 'app_last_selected_grade';

window.GlobalStageFilter = {
    SAVED_GRADE_KEY,
    activeStage: null,
    activeGrade: null,

    init() {
        const savedGradeState = this.readSavedGradeState();
        const storedStage = localStorage.getItem('activeStageFilter') || null;
        const storedGrade = localStorage.getItem('activeGradeFilter');

        // The dedicated state is authoritative when it exists. The older
        // activeStageFilter/activeGradeFilter values remain as a migration
        // path for users who used the app before this state was introduced.
        this.activeStage = savedGradeState?.stage || storedStage || null;
        this.activeGrade = savedGradeState
            ? this.normalizeGrade(savedGradeState.grade)
            : (storedGrade ? this.normalizeGrade(storedGrade) : null);

        if (this.activeStage && !localStorage.getItem(SAVED_GRADE_KEY)) {
            this.persistSavedGradeState(this.activeStage, this.activeGrade);
        }

        this.updateHeaderController();
    },

    normalizeGrade(grade) {
        if (grade === null || grade === undefined || grade === '') return null;
        const numericGrade = Number(grade);
        return Number.isFinite(numericGrade) ? numericGrade : null;
    },

    readSavedGradeState() {
        const rawState = localStorage.getItem(SAVED_GRADE_KEY);
        if (!rawState) return null;

        try {
            const parsedState = JSON.parse(rawState);
            if (parsedState && typeof parsedState === 'object' && parsedState.stage) {
                return {
                    stage: parsedState.stage,
                    grade: this.normalizeGrade(parsedState.grade)
                };
            }

            // Also accept a simple saved grade ID, using the persisted stage
            // when available. This keeps the state compatible with simpler
            // integrations that store only the grade number.
            if (typeof parsedState === 'string' || typeof parsedState === 'number') {
                return {
                    stage: localStorage.getItem('activeStageFilter') || null,
                    grade: this.normalizeGrade(parsedState)
                };
            }
        } catch (error) {
            // Support a compact "stage:grade" key if one was saved by an
            // earlier integration instead of the JSON state below.
            const separatorIndex = rawState.indexOf(':');
            if (separatorIndex > 0) {
                return {
                    stage: rawState.slice(0, separatorIndex),
                    grade: this.normalizeGrade(rawState.slice(separatorIndex + 1))
                };
            }
        }

        return null;
    },

    persistSavedGradeState(stage, grade) {
        if (!stage) {
            localStorage.removeItem(SAVED_GRADE_KEY);
            return;
        }

        localStorage.setItem(SAVED_GRADE_KEY, JSON.stringify({
            stage,
            grade: this.normalizeGrade(grade)
        }));
    },

    restoreSavedGradeState() {
        const savedGradeState = this.readSavedGradeState();
        if (!savedGradeState?.stage) {
            this.updateHeaderController();
            return false;
        }

        const savedGrade = this.normalizeGrade(savedGradeState.grade);
        const isAlreadyActive = this.activeStage === savedGradeState.stage
            && this.activeGrade === savedGrade;

        if (isAlreadyActive) {
            this.updateHeaderController();
            return true;
        }

        this.setActive(savedGradeState.stage, savedGrade);
        return true;
    },

    setActive(stage, grade = null) {
        this.activeStage = stage || null;
        this.activeGrade = this.normalizeGrade(grade);
        localStorage.setItem('activeStageFilter', stage || '');
        localStorage.setItem('activeGradeFilter', this.activeGrade !== null ? this.activeGrade : '');
        this.persistSavedGradeState(this.activeStage, this.activeGrade);
        
        this.updateHeaderController();
        
        // Custom event for parts of the system that need to know immediately
        window.dispatchEvent(new CustomEvent('globalFilterChanged', { detail: { stage, grade } }));
    },

    reset() {
        this.setActive(null, null);
    },

    getActiveStage() {
        return this.activeStage;
    },

    getActiveGrade() {
        return this.activeGrade;
    },

    isActive(stage) {
        return this.activeStage === stage;
    },

    filterStages(stages) {
        if (!this.activeStage) return stages;
        return stages.filter(s => s === this.activeStage);
    },

    isLocked() {
        // System is locked if no stage is selected
        if (!this.activeStage) return true;
        
        const data = window.STUDENT_CONFIG.stageData[this.activeStage];
        // If it's a standard stage, it requires a grade. Custom/Flat stages do not.
        if (data && (data.isFlat || this.activeStage.startsWith('custom_'))) return false;
        
        return !this.activeGrade;
    },

    getLabel() {
        if (!this.activeStage) return 'عرض الكل';
        const data = window.STUDENT_CONFIG.stageData[this.activeStage];
        const stageName = data.name;
        
        if (data.isFlat || this.activeStage.startsWith('custom_')) {
            return `المرحلة: ${stageName}`;
        }

        if (this.activeGrade) {
            const gradeNames = window.STUDENT_CONFIG.gradeNames[this.activeStage] || [];
            const gradeName = gradeNames[this.activeGrade - 1] || `صف ${this.activeGrade}`;
            return `${stageName} - ${gradeName}`;
        }
        return `مرحلة: ${stageName}`;
    },

    updateHeaderController() {
        const btn = document.getElementById('globalContextBtn');
        if (btn) {
            const label = this.getLabel();
            btn.querySelector('span').textContent = label;
            
            const isLocked = this.isLocked();
            btn.classList.toggle('has-active-filter', !!this.activeStage);
            btn.classList.toggle('unselected-nudge', isLocked);
        }
    },

    getLockedPlaceholderHTML() {
        return `
            <div class="locked-state-placeholder glass-panel">
                <div class="lock-glow-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <h2>برجاء اختيار المرحلة والصف الدراسي أولاً</h2>
                <p>يجب تحديد سياق العرض من القائمة العلوية للتمكن من استعراض وإدارة البيانات بشكل آمن ومنعزل.</p>
                <button class="nudge-selection-btn" onclick="window.GlobalContextController.openStageSelection()">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>اضغط هنا لتحديد الصف الآن</span>
                </button>
            </div>
        `;
    }
};

// Initialize on load
window.GlobalStageFilter.init();
