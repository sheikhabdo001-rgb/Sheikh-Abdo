window.BACKUP_VIEW = `
    <main id="backupView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient"><i class="fas fa-shield-alt"></i> نظام النسخ الاحتياطي والاستعادة</h1>
            <p class="hero-subtitle">قم بتأمين بيانات طلابك وحساباتك المالية عبر إنشاء نسخ احتياطية دورية بصيغة JSON لضمان عدم ضياع أي معلومة.</p>
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                <button id="createNewBackupBtn" class="login-btn glow-btn" style="max-width: 300px; padding: 1.25rem 2.5rem; border-radius: 50px;">
                    <i class="fas fa-file-export"></i>
                    <span>إنشاء نسخة احتياطية جديدة</span>
                </button>
                <button id="uploadBackupBtn" class="login-btn glow-btn" style="max-width: 300px; padding: 1.25rem 2.5rem; border-radius: 50px; background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-file-import"></i>
                    <span>استعادة نسخة من جهازك</span>
                </button>
                <input type="file" id="backupFileInput" accept=".json" style="display: none;">
            </div>
        </div>

        <div class="backup-history-container glass-panel">
            <div class="hub-header" style="margin-bottom: 2rem;">
                <h2><i class="fas fa-history"></i> سجل النسخ الاحتياطية السابقة</h2>
                <p>إدارة واسترجاع البيانات من النسخ المحفوظة محلياً</p>
            </div>

            <div id="backupHistoryTableContainer" class="table-responsive">
                <!-- Backup history table injected here -->
                <div class="placeholder-content">
                    <i class="fas fa-folder-open"></i>
                    <p>لا يوجد سجلات نسخ احتياطي حالياً</p>
                </div>
            </div>
        </div>

        <div class="backup-info-note glass-panel" style="margin-top: 2rem; border-color: rgba(245, 158, 11, 0.3);">
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning-color); font-size: 1.5rem; margin-top: 5px;"></i>
                <div>
                    <h4 style="color: #ffffff; margin-bottom: 5px;">ملاحظة هامة حول الاستعادة:</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
                        عند الضغط على زر "استعادة"، سيتم استبدال كافة البيانات الحالية بالبيانات الموجودة في النسخة المختارة بشكل كامل. سيقوم النظام بإعادة تحميل الصفحة تلقائياً لتطبيق التغييرات.
                    </p>
                </div>
            </div>
        </div>
    </main>
`;