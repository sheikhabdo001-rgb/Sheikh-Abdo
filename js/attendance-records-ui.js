// UI rendering specifically for Attendance Records and History
window.RecordsUI = {
    renderStudentOverview(container, students, options = {}) {
        const { searchQuery = '', onViewDetails } = options;
        
        let filteredStudents = [...students];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredStudents = students.filter(s => 
                s.name.toLowerCase().includes(query) || 
                (s.studentCode && s.studentCode.includes(query)) ||
                (s.phone && s.phone.includes(query)) ||
                (s.parentPhone && s.parentPhone.includes(query)) ||
                s.serial.toString() === query
            );
            
            // Sort exact matches first
            filteredStudents.sort((a, b) => {
                const aMatch = a.name.toLowerCase() === query || a.serial.toString() === query;
                const bMatch = b.name.toLowerCase() === query || b.serial.toString() === query;
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
            });
        }

        if (filteredStudents.length === 0) {
            container.innerHTML = '<div class="placeholder-content"><i class="fas fa-search-minus"></i><p>لا يوجد طلاب مطابقون للبحث</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive" style="animation: fadeIn 0.4s ease;">
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th style="width: 80px;">م</th>
                            <th>اسم الطالب</th>
                            <th style="width: 150px;">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStudents.map(s => {
                            const isMatch = searchQuery && (
                                s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                s.serial.toString() === searchQuery
                            );
                            return `
                            <tr class="${isMatch ? 'search-highlight' : ''}">
                                <td style="text-align: center; font-weight: 700;">${s.serial}</td>
                                <td style="font-weight: 600;">
                                    <a href="#" class="student-name-link" data-student-id="${s.id}" data-from-view="records">${s.name}</a>
                                </td>
                                <td style="text-align: center;">
                                    <button class="view-details-btn" data-id="${s.id}">
                                        <i class="fas fa-chart-line"></i>
                                        <span>تفاصيل الحضور والغياب</span>
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.onclick = () => onViewDetails(parseInt(btn.dataset.id));
        });
    },

    renderRecordsHistory(container, history, students, options = {}) {
        const { searchQuery = '', filterDate = '', filterStatus = '', onNameClick } = options;
        
        let filteredHistory = [...history];
        if (filterDate) {
            const selectedDate = new Date(filterDate).toDateString();
            filteredHistory = filteredHistory.filter(h => h.date === selectedDate);
        }
        if (filterStatus) {
            filteredHistory = filteredHistory.filter(h => h.status === filterStatus);
        }

        // Map names and serials
        const displayList = filteredHistory.map(h => {
            const s = students.find(st => st.id === h.studentId) || { name: 'طالب محذوف', serial: '?' };
            return { ...h, studentName: s.name, serial: s.serial };
        });

        // Apply search and highlight
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            displayList.sort((a, b) => {
                const aNameMatch = a.studentName.toLowerCase().includes(query);
                const bNameMatch = b.studentName.toLowerCase().includes(query);
                const aCodeMatch = a.studentCode && a.studentCode.includes(query);
                const bCodeMatch = b.studentCode && b.studentCode.includes(query);
                const aMatch = aNameMatch || aCodeMatch || a.serial.toString() === query;
                const bMatch = bNameMatch || bCodeMatch || b.serial.toString() === query;
                return bMatch - aMatch;
            });
        }

        if (displayList.length === 0) {
            container.innerHTML = '<div class="placeholder-content"><i class="fas fa-search-minus"></i><p>لا توجد سجلات مطابقة للبحث</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="attendance-table records-master-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>م</th>
                            <th>الاسم</th>
                            <th>المجموعة</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayList.map(h => {
                            const isSearchMatch = searchQuery && (h.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || h.serial.toString() === searchQuery);
                            return `
                            <tr class="${isSearchMatch ? 'search-highlight' : ''}">
                                <td style="font-size:0.8rem">${h.dayName} <br/> ${h.date}</td>
                                <td>${h.serial}</td>
                                <td>
                                    <a href="#" class="student-name-link" data-student-id="${h.studentId}" data-from-view="records">${h.studentName}</a>
                                </td>
                                <td>${h.groupName}</td>
                                <td>
                                    <span class="status-badge ${h.status === 'present' ? 'attended' : 'absent'}">
                                        ${h.status === 'present' ? 'حاضر' : 'غائب'}
                                    </span>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

    }
};
