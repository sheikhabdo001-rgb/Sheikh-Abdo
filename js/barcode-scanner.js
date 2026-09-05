/**
 * Global Barcode Scanner Integration
 * Listens for rapid keyboard input (typical of physical scanners) 
 * and triggers student lookups.
 */
window.BarcodeScanner = {
    buffer: '',
    lastCharTime: 0,
    scannerDelayThreshold: 50, // ms between keystrokes to consider it a scanner

    init() {
        window.addEventListener('keydown', (e) => {
            // Ignore if user is in an input field (to allow manual typing)
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
            
            const currentTime = Date.now();
            const isRapid = (currentTime - this.lastCharTime) <= this.scannerDelayThreshold;
            
            // Check for Enter key which signifies end of scan
            if (e.key === 'Enter') {
                if (this.buffer.length === 6 && /^\d+$/.test(this.buffer)) {
                    e.preventDefault();
                    this.handleScan(this.buffer);
                }
                this.buffer = '';
                return;
            }

            // Only buffer single characters (alphanumeric)
            if (e.key.length === 1) {
                // If it's not rapid typing and not in an input, it might be the start of a manual code entry or a slow scanner
                // For safety, we only process it as a "scan" if it's rapid or if we are specifically monitoring
                if (!isTyping) {
                    this.buffer += e.key;
                } else {
                    this.buffer = ''; // Reset if user is actively typing in a field
                }
            }

            this.lastCharTime = currentTime;
        });
    },

    handleScan(code) {
        window.notify.success(`جاري فحص الكود: ${code}`);
        
        // Find student globally
        const allStudents = window.StudentStore.getAllStudentsSystemWide();
        const student = allStudents.find(s => s.studentCode === code);

        if (student) {
            // Priority 1: If search hub is open/visible, populate it
            const hubInput = document.getElementById('hubSearchInput');
            const homeView = document.getElementById('homeView');
            
            if (homeView && homeView.style.display !== 'none' && hubInput) {
                hubInput.value = code;
                hubInput.dispatchEvent(new Event('input'));
                hubInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // Priority 2: In any other view, open Profile directly
            window.AttendanceRecords.openStudentProfile(student.id, 'home', student.stage, student.grade);
        } else {
            window.notify.error(`عذراً، لم يتم العثور على طالب بالكود: ${code}`);
        }
    }
};

window.BarcodeScanner.init();