window.PAYMENTS_VIEW = `
    <main id="paymentsView" class="main-content view-section" style="display: none;">
        <div class="welcome-section">
            <h1 class="hero-title-gradient">تسجيل مدفوعات الشهر</h1>
            <p class="hero-subtitle">هنا يمكنك متابعة تدفقاتك المالية بدقة، تسجيل سداد الشهور، وإدارة مديونيات الطلاب بشكل فوري.</p>
        </div>
        <div class="attendance-header">
            <div class="attendance-actions-wrapper" style="width: 100%; justify-content: flex-end;">
                <button id="openNonPayersListBtn" class="non-payers-btn">
                    <i class="fas fa-user-times"></i>
                    <span>قائمة الممتنعين</span>
                </button>
                <button id="openMonthDisplayBtn" class="month-display-btn">
                    <i class="fas fa-calendar-alt"></i>
                    <span>عرض الشهور</span>
                </button>
            </div>
        </div>
        <div id="paymentsSearchContainer" class="search-container glass-panel">
            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="paymentsSearchInput" placeholder="البحث عن الطالب من خلال اسم الطالب او كود الطالب" aria-label="البحث عن الطالب من خلال اسم الطالب او كود الطالب">
                <button id="clearPaymentsSearch" class="clear-search-btn" title="مسح البحث">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="date-display-box glass-panel">
            <i class="fas fa-calendar-day"></i>
            <span id="paymentsDateDisplay">--</span>
        </div>
        <div id="paymentsTableContainer" class="payments-table-wrapper glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-money-bill-wave"></i>
                <p>يرجى اختيار المرحلة والصف لعرض البيانات</p>
            </div>
        </div>
    </main>
`;
