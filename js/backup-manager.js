window.BackupManager = {
    init() {
        this.setupListeners();
    },

    setupListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#createNewBackupBtn')) {
                this.createBackup();
            }
            if (e.target.closest('#backupRestoreBtn')) {
                window.Navigation.switchView('backup');
                this.renderHistory();
            }
            if (e.target.closest('#uploadBackupBtn')) {
                document.getElementById('backupFileInput').click();
            }
        });

        const fileInput = document.getElementById('backupFileInput');
        if (fileInput) {
            fileInput.onchange = (e) => this.handleFileUpload(e);
        }
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const data = JSON.parse(content);
                
                const confirmed = await window.confirm('هل أنت متأكد من رغبتك في استعادة هذه النسخة؟ سيتم استبدال كافة البيانات الحالية بالكامل.');
                if (confirmed) {
                    window.TenantStore.restoreCurrentTenantData(data);
                    
                    await window.alert('تمت استعادة البيانات بنجاح! سيقوم النظام بإعادة التشغيل الآن.');
                    location.reload();
                }
            } catch (err) {
                window.notify.error('فشل قراءة الملف: الملف تالف أو غير صالح بصيغة JSON.');
            } finally {
                // Clear input for next use
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    },

    getAppData() {
        return window.TenantStore?.getCurrentTenantData() || {};
    },

    createBackup() {
        try {
            const appData = this.getAppData();
            const jsonString = JSON.stringify(appData);
            
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStrFormatted = `${day}${month}${year}`;
            
            const filename = `نسخة_احتياطية_بتاريخ_${dateStrFormatted}.json`;
            
            // Trigger Download
            this.downloadFile(jsonString, filename);

            // Save to History
            this.saveToHistory(jsonString, filename);
            
            // Success Feedback
            window.notify.success('تم إنشاء النسخة الاحتياطية بنجاح وتحميل الملف.');
            this.renderHistory();

        } catch (error) {
            console.error('Backup creation failed:', error);
            alert('حدث خطأ أثناء محاولة إنشاء النسخة الاحتياطية.');
        }
    },

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    saveToHistory(jsonString, filename) {
        const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
        const entry = {
            id: Date.now(),
            filename: filename,
            data: jsonString,
            timestamp: new Date().toISOString(),
            dateLabel: new Date().toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
        history.unshift(entry); // Newest first
        localStorage.setItem('backup_history', JSON.stringify(history));
    },

    renderHistory() {
        const container = document.getElementById('backupHistoryTableContainer');
        const history = JSON.parse(localStorage.getItem('backup_history') || '[]');

        if (history.length === 0) {
            container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-folder-open"></i>
                    <p>لا يوجد سجلات نسخ احتياطي حالياً</p>
                </div>
            `;
            return;
        }

        let html = `
            <table class="students-table" style="min-width: 700px;">
                <thead>
                    <tr>
                        <th style="width: 80px; text-align: center;">#</th>
                        <th>النسخة الاحتياطية / التاريخ</th>
                        <th style="width: 250px; text-align: center;">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map((entry, idx) => `
                        <tr>
                            <td style="text-align: center; color: var(--primary-color); font-weight: 800;">${idx + 1}</td>
                            <td style="font-weight: 700;">
                                <div style="display: flex; flex-direction: column;">
                                    <span>نسخة احتياطية بتاريخ ${entry.dateLabel}</span>
                                    <small style="color: var(--text-secondary); font-size: 0.75rem;">${entry.filename}</small>
                                </div>
                            </td>
                            <td>
                                <div class="hub-action-btns">
                                    <button class="hub-quick-btn" style="background: rgba(147, 51, 234, 0.15); color: #c084fc; border: 1px solid #9333ea;" 
                                            onclick="window.BackupManager.downloadFileById(${entry.id})" title="تنزيل">
                                        <i class="fas fa-download"></i> <span>تنزيل</span>
                                    </button>
                                    <button class="hub-quick-btn" style="background: rgba(20, 184, 166, 0.15); color: #14b8a6; border: 1px solid #14b8a6;" 
                                            onclick="window.BackupManager.restoreBackup(${entry.id})" title="استعادة">
                                        <i class="fas fa-undo"></i> <span>استعادة</span>
                                    </button>
                                    <button class="hub-quick-btn" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444;" 
                                            onclick="window.BackupManager.deleteBackup(${entry.id})" title="حذف">
                                        <i class="fas fa-trash-alt"></i> <span>حذف</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = html;
    },

    downloadFileById(id) {
        const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
        const entry = history.find(e => e.id === id);
        if (entry) {
            this.downloadFile(entry.data, entry.filename);
        }
    },

    async restoreBackup(id) {
        const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
        const entry = history.find(e => e.id === id);
        if (!entry) return;

        if (await window.confirm('تحذير: هل أنت متأكد من رغبتك في استعادة هذه النسخة؟ سيتم حذف جميع البيانات الحالية واستبدالها.')) {
            try {
                const data = JSON.parse(entry.data);
                const currentHistory = localStorage.getItem('backup_history');
                window.TenantStore.restoreCurrentTenantData(data);
                if (!data['backup_history'] && currentHistory) {
                    window.TenantStore.set('backup_history', currentHistory);
                }

                alert('تمت استعادة البيانات بنجاح! سيتم إعادة تحميل النظام الآن.');
                location.reload();
            } catch (error) {
                alert('فشلت عملية الاستعادة: الملف تالف أو غير صالح.');
            }
        }
    },

    async deleteBackup(id) {
        if (await window.confirm('هل أنت متأكد من حذف هذا السجل من قائمة النسخ الاحتياطية؟ (لن يتم حذف الملف من جهازك)')) {
            let history = JSON.parse(localStorage.getItem('backup_history') || '[]');
            history = history.filter(e => e.id !== id);
            localStorage.setItem('backup_history', JSON.stringify(history));
            this.renderHistory();
        }
    }
};

window.BackupManager.init();
