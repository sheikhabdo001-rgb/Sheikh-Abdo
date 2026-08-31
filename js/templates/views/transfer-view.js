window.TRANSFER_VIEW = `
    <main id="transferView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient"><i class="fas fa-exchange-alt"></i> النقل العام السنوي</h1>
            <p class="hero-subtitle">ترقية جميع الطلاب تلقائياً إلى الصف التالي مع إنشاء نسخة احتياطية آمنة للبيانات قبل التنفيذ.</p>

            <div class="transfer-action-wrap">
                <button id="createAnnualPromotionBtn" class="login-btn glow-btn transfer-action-btn">
                    <i class="fas fa-graduation-cap"></i>
                    <span>إنشاء نقل عام للمجموعات</span>
                </button>
                <div class="transfer-tooltip">
                    <i class="fas fa-info-circle"></i>
                    <span>يقوم هذا الإجراء بنقل جميع الطلاب تلقائياً إلى الصف التالي وإنشاء نسخة احتياطية آمنة للبيانات قبل التنفيذ.</span>
                </div>
            </div>
        </div>

        <div class="transfer-flow glass-panel">
            <div class="hub-header">
                <h2><i class="fas fa-graduation-cap"></i> سلسلة الترقية السنوية</h2>
                <p>التدفق التلقائي للطلاب عبر المراحل الدراسية</p>
            </div>

            <div class="transfer-flow-grid">
                <div class="transfer-flow-column">
                    <h3><i class="fas fa-child" style="color:#3b82f6;"></i> المرحلة الابتدائية</h3>
                    <ul>
                        <li><span class="flow-arrow">&#8595;</span> الأول الابتدائي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثاني الابتدائي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثالث الابتدائي</li>
                        <li><span class="flow-arrow">&#8595;</span> الرابع الابتدائي</li>
                        <li><span class="flow-arrow">&#8595;</span> الخامس الابتدائي</li>
                        <li><span class="flow-arrow">&#8595;</span> السادس الابتدائي <span class="flow-note">&#8594; الأول الإعدادي</span></li>
                    </ul>
                </div>

                <div class="transfer-flow-column">
                    <h3><i class="fas fa-book-reader" style="color:#10b981;"></i> المرحلة الإعدادية</h3>
                    <ul>
                        <li><span class="flow-arrow">&#8595;</span> الأول الإعدادي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثاني الإعدادي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثالث الإعدادي <span class="flow-note">&#8594; الأول الثانوي</span></li>
                    </ul>
                </div>

                <div class="transfer-flow-column">
                    <h3><i class="fas fa-user-graduate" style="color:#f97316;"></i> المرحلة الثانوية</h3>
                    <ul>
                        <li><span class="flow-arrow">&#8595;</span> الأول الثانوي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثاني الثانوي</li>
                        <li><span class="flow-arrow">&#8595;</span> الثالث الثانوي <span class="flow-note">&#8594; التخرج والأرشفة</span></li>
                    </ul>
                </div>
            </div>

            <div class="transfer-edge-notes">
                <div class="transfer-edge-note">
                    <i class="fas fa-plus-circle" style="color:#10b981;"></i>
                    <span>يُفرغ <strong>الأول الابتدائي</strong> بالكامل لاستقبال تسجيلات جديدة.</span>
                </div>
                <div class="transfer-edge-note">
                    <i class="fas fa-user-graduate" style="color:#ef4444;"></i>
                    <span>يُخرَّج طلاب <strong>الثالث الثانوي</strong> وتُؤرشف بياناتهم تلقائياً.</span>
                </div>
            </div>
        </div>
    </main>
`;
