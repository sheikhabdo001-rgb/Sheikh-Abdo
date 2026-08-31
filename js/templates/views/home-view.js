window.HOME_VIEW = `
    <main id="homeView" class="main-content view-section">
        <div id="homeClock" class="clock-widget glass-panel">
            <div class="clock-time">--:--:--</div>
            <div class="clock-date">--------</div>
        </div>
        <div class="welcome-section">
            <h1 class="hero-title-gradient">مرحباً <span id="dashboardTeacherName"></span></h1>
            <p class="hero-subtitle">نظام الإدارة الذكي - المواعيد والتقارير المالية. منصتك المتكاملة لإدارة الطلاب بفعالية ودقة متناهية.</p>
            <button id="instantRecordingBtn" class="instant-btn glow-btn">
                <i class="fas fa-bolt"></i>
                <span>التسجيل الفوري</span>
            </button>
            <div id="instantRegistrationStatus" class="instant-registration-status">--</div>
        </div>

        <!-- Smart Search & Action Hub -->
        <div id="homeSearchHub" class="search-hub-container glass-panel">
            <div class="hub-header">
                <h2><i class="fas fa-magnifying-glass-chart"></i> مركز البحث الذكي والعمليات السريعة</h2>
                <p>ابحث عن الطالب بالاسم لتنفيذ عمليات الحضور أو الدفع فوراً</p>
            </div>
            
            <div class="hub-controls">
                <div class="search-input-wrapper">
                    <i class="fas fa-search search-glow-icon"></i>
                    <input type="text" id="hubSearchInput" placeholder="برجاء ادخال اسم الطالب او كود الطالب للبحث" autocomplete="off">
                </div>
                
                <div class="hub-filters-grid">
                    <div class="hub-filter-item">
                        <label><i class="fas fa-graduation-cap"></i> الصف الدراسي:</label>
                        <select id="hubClassFilter" class="hub-select">
                            <option value="all">كل الصفوف</option>
                        </select>
                    </div>
                    <div class="hub-filter-item">
                        <label><i class="fas fa-bolt"></i> نوع العملية:</label>
                        <select id="hubActionFilter" class="hub-select">
                            <option value="all">الكل (بحث عام)</option>
                            <option value="attendance">تسجيل حضور</option>
                            <option value="payment">دفع شهري</option>
                        </select>
                    </div>
                </div>
            </div>

            <div id="hubResultsArea" class="hub-results-container">
                <!-- Results will be injected here -->
                <div class="hub-placeholder">
                    <i class="fas fa-keyboard"></i>
                    <p>ابدأ بكتابة اسم الطالب لعرض النتائج السريعة</p>
                </div>
            </div>
        </div>
        <div id="activeSessionAlert" class="active-session-banner" style="display: none;">
            <i class="fas fa-satellite-dish"></i>
            <span id="activeSessionText">جلسة نشطة الآن: المجموعة 1</span>
        </div>
        <div class="dashboard-cards">
            <div class="info-card">
                <div class="card-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                <div class="card-content">
                    <h3>اسم المعلم</h3>
                    <p id="displayTeacherName"></p>
                </div>
            </div>
            <div class="info-card">
                <div class="card-icon"><i class="fas fa-school"></i></div>
                <div class="card-content">
                    <h3>المراحل التعليمية</h3>
                    <div id="displayStages" class="stages-list"></div>
                </div>
            </div>
        </div>
        <div class="stage-buttons" id="stageButtonsSection"></div>
    </main>
`;
