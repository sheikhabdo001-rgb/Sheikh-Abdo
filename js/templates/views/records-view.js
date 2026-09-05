window.RECORDS_VIEW = `
    <main id="recordsView" class="main-content view-section" style="display: none;">
        <div class="attendance-header">
            <h1 style="text-align: right; width: 100%;">سجل الحضور الشامل</h1>
        </div>
        <div class="records-controls-container glass-panel">
            <div class="records-controls">
                <div class="search-wrapper glass-panel mini-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="viewRecordsSearchInput" placeholder="بحث بالاسم أو الرقم المسلسل...">
                </div>
                <div class="date-filter-wrapper glass-panel">
                    <i class="fas fa-calendar-day"></i>
                    <input type="date" id="viewRecordsDateInput">
                </div>
            </div>
            <div class="filter-actions-row">
                <button id="btnViewMasterList" class="filter-action-btn active">السجل الكامل</button>
                <button id="btnViewAttendanceList" class="filter-action-btn success">قائمة الحضور</button>
                <button id="btnViewAbsenceList" class="filter-action-btn danger">قائمة الغياب</button>
            </div>
        </div>
        <div id="viewRecordsHistoryContainer" class="records-history-list glass-panel" style="margin-top: 1.5rem;"></div>
    </main>
`;