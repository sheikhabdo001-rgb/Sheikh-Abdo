window.ATTENDANCE_MODALS = {
    groupsManager: `
        <div id="groupsManagerModal" class="modal-overlay">
            <div class="modal-content glass-modal groups-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-users-cog"></i> إدارة مجموعات الصف</h3>
                    <button id="closeGroupsManager" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="groupsList" class="groups-list"></div>
                    <button id="addNewGroupBtn" class="add-group-btn">
                        <i class="fas fa-plus-circle"></i> إضافة مجموعة جديدة
                    </button>
                </div>
            </div>
        </div>
    `,
    instantGroupSelection: `
        <div id="instantGroupSelectionModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-bolt"></i> اختر المجموعة النشطة</h3>
                    <button class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <p style="margin-bottom: 1.25rem; color: var(--text-secondary); font-weight: 700;">
                        توجد عدة حصص نشطة حالياً. اختر المجموعة المناسبة لتسجيل الحضور:
                    </p>
                    <div id="instantGroupSelectionList" class="instant-group-list"></div>
                </div>
            </div>
        </div>
    `,
    addGroupName: `
        <div id="addGroupNameModal" class="modal-overlay">
            <div class="modal-content glass-modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> اسم المجموعة الجديدة</h3>
                    <button id="closeAddGroupName" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <i class="fas fa-users"></i>
                        <input type="text" id="newGroupNameInput" placeholder="مثال: مجموعة السبت 4 عصراً">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmAddGroup" class="login-btn">حفظ المجموعة</button>
                </div>
            </div>
        </div>
    `,
    groupSchedule: `
        <div id="groupScheduleModal" class="modal-overlay">
            <div class="modal-content glass-modal schedule-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-alt"></i> جدول مواعيد: <span id="groupScheduleTitle"></span></h3>
                    <button id="closeGroupSchedule" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="globalScheduleWarning" class="error-message" style="text-align:center; margin-bottom: 1rem;">
                        تنبيه: توجد تعارضات في المواعيد المختارة!
                    </div>
                    <div class="schedule-table-container">
                        <table class="schedule-table">
                            <thead>
                                <tr>
                                    <th>اليوم</th>
                                    <th>وقت الحصة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="scheduleTableBody"></tbody>
                        </table>
                    </div>
                    <button id="addDayBtn" class="add-day-btn">
                        <i class="fas fa-calendar-plus"></i> إضافة يوم جديد
                    </button>
                </div>
                <div class="modal-footer">
                    <button id="saveGroupSchedule" class="login-btn">حفظ الجدول الزمني</button>
                </div>
            </div>
        </div>
    `,
    daySelector: `
        <div id="daySelectorModal" class="modal-overlay">
            <div class="modal-content glass-modal day-selector-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-check"></i> اختر الأيام</h3>
                    <button id="closeDaySelector" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="days-grid">
                        <div class="day-circle" data-day="السبت"><span>السبت</span></div>
                        <div class="day-circle" data-day="الأحد"><span>الأحد</span></div>
                        <div class="day-circle" data-day="الاثنين"><span>الاثنين</span></div>
                        <div class="day-circle" data-day="الثلاثاء"><span>الثلاثاء</span></div>
                        <div class="day-circle" data-day="الأربعاء"><span>الأربعاء</span></div>
                        <div class="day-circle" data-day="الخميس"><span>الخميس</span></div>
                        <div class="day-circle" data-day="الجمعة"><span>الجمعة</span></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirmDaySelection" class="login-btn">تأكيد الأيام</button>
                </div>
            </div>
        </div>
    `,
    selectGroup: `
        <div id="selectGroupModal" class="modal-overlay">
            <div class="modal-content glass-modal select-group-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-layer-group"></i> اختيار مجموعة للتحضير</h3>
                    <button id="closeSelectGroup" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="helper-text">اختر المجموعة التي ترغب في تسجيل حضورها الآن:</p>
                    <div id="groupSelectionGrid" class="group-selection-grid"></div>
                </div>
            </div>
        </div>
    `,
    groupAttendanceHistory: `
        <div id="groupAttendanceHistoryModal" class="modal-overlay">
            <div class="modal-content glass-modal group-attendance-summary-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-users-gear"></i> تفاصيل الحضور والغياب للمجاميع</h3>
                    <button id="closeGroupAttendanceHistory" class="close-modal-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="groupAttendanceHistoryContainer"></div>
                </div>
            </div>
        </div>
    `,
    linkGroups: `
        <div id="linkGroupsModal" class="modal-overlay">
            <div class="modal-content glass-modal link-groups-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-link"></i> ربط المجموعات (المسارات)</h3>
                    <button id="closeLinkGroups" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <!-- Instruction Box for Group Route Linking Modal -->
                    <div class="route-linking-instructions" style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; text-align: right; font-size: 0.88rem; color: #e2e8f0; line-height: 1.6;">
                        <div style="font-weight: bold; color: #a78bfa; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-info-circle"></i>
                            <span>دليل ربط الحصص والمسارات:</span>
                        </div>
                        <ul style="margin: 0; padding-right: 18px; list-style-type: disc;">
                            <li><strong>ما هو الـ ID؟</strong> هو رقم المسار الموحد. المواعيد التي تحمل <u>نفس الـ ID</u> يتم اعتبارها <strong>حصة واحدة وتعويضها</strong>.</li>
                            <li><strong>كيفية الربط:</strong> قم بإدخال أو اختيار نفس الرقم (ID) للمواعيد المرتبطة ببعضها (مثلاً: حصة السبت مع تعويض الأربعاء يعطيان نفس الـ ID).</li>
                            <li><strong>الفائدة:</strong> عند تسجيل حضور الطالب في الموعد الأساسي أو التعويضي، يحسب له الحضور وتلغى حالة الغياب للموعد المرتبط تلقائياً دون تكرار الرسوم.</li>
                        </ul>
                    </div>
                    <p class="helper-text">الربط يسمح بمشاركة سجل الحضور بين أيام مختلفة (نفس الحصة في مجموعات مختلفة).</p>
                    <div id="linkGroupsContainer" class="link-manager-grid"></div>
                </div>
                <div class="modal-footer">
                    <button id="saveLinkGroups" class="login-btn">حفظ إعدادات الربط</button>
                </div>
            </div>
        </div>
    `,
    unifiedEditor: `
        <div id="groupUnifiedEditorModal" class="modal-overlay">
            <div class="modal-content glass-modal schedule-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> <span id="groupEditorTitle">تعديل المجموعة</span></h3>
                    <button id="closeGroupEditor" class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="groupEditorClassContext" class="selection-status-bar" style="margin-bottom: 1.5rem; display: none; padding: 10px 20px;">
                        <i class="fas fa-info-circle"></i>
                        <span id="groupEditorClassName"></span>
                    </div>
                    
                    <div class="input-group">
                        <label><i class="fas fa-users"></i> اسم المجموعة</label>
                        <input type="text" id="editorGroupName" class="exam-modal-input" placeholder="مثال: مجموعة السبت">
                    </div>

                    <div class="days-selector-wrapper">
                        <label><i class="fas fa-calendar-check"></i> أيام الحضور والمواعيد</label>
                        <div class="editor-days-grid" id="editorDaysGrid">
                            <!-- Days checkboxes and time inputs injected here -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="modal-actions-grid">
                         <button id="cancelGroupEditor" class="action-btn-styled secondary">إلغاء</button>
                         <button id="saveGroupUnified" class="login-btn exam-confirm-btn">
                            <i class="fas fa-save"></i>
                            <span>حفظ التغييرات</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};
