window.NON_PAYERS_VIEW = `
    <main id="nonPayersView" class="main-content view-section" style="display: none;">
        <div class="attendance-header">
            <div style="text-align: right; flex: 1;">
                <h1>قائمة الممتنعين عن الدفع</h1>
                <p id="nonPayersFilterSubtitle" style="color: var(--text-secondary); font-weight: 700; margin-top: 5px; font-size: 0.9rem;"></p>
            </div>
            <button id="printUnpaidListBtn" class="export-btn" type="button">
                <i class="fas fa-print"></i>
                <span>طباعة الكشف</span>
            </button>
        </div>
        <div class="non-payers-controls glass-panel">
            <div class="non-payers-filter-grid">
                <div class="month-filter-enhanced">
                    <label><i class="fas fa-filter"></i> نوع المديونية:</label>
                    <select id="debtTypeFilter" class="form-select month-select-enhanced">
                        <option value="all" selected>المتأخرين عن سداد "أي مديونية"</option>
                        <option value="overdue_only">المتأخرين عن سداد "المؤخر" فقط</option>
                        <option value="advance_only">المتأخرين عن سداد "المقدم" فقط</option>
                    </select>
                </div>
                <div class="month-filter-enhanced">
                    <label><i class="fas fa-calendar"></i> الشهر المرجعي:</label>
                    <select id="nonPayersMonthFilterView" class="month-select-enhanced">
                        <option value="all">كل الممتنعين (افتراضي)</option>
                    </select>
                </div>
            </div>
        </div>
        <div id="nonPayersTableContainerView" class="non-payers-table-container glass-panel">
            <div class="placeholder-content">
                <i class="fas fa-user-check"></i>
                <p>لا يوجد طلاب متأخرون في السداد</p>
            </div>
        </div>
    </main>
`;
