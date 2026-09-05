// Combined HTML Templates for all modals in the system
window.MODAL_TEMPLATES = {
    ...window.AUTH_MODALS,
    ...window.GRADE_MODALS,
    ...window.STUDENT_MODALS,
    ...window.ATTENDANCE_MODALS,
    ...window.RECORD_MODALS,
    ...window.FINANCIAL_MODALS,
    ...window.SYSTEM_MODALS,
    ...window.PROFILE_PRINT_MODAL,
    ...window.STUDENT_EXPORT_MODAL,
    ...window.SCHEDULE_EXPORT_MODAL,
    addCustomStage: window.AUTH_MODALS.addCustomStage,
    unifiedEditor: window.ATTENDANCE_MODALS.unifiedEditor,
    globalContextSelector: window.GRADE_MODALS.globalContextSelector,
    familyPayment: window.STUDENT_MODALS.familyPayment,
    multiStagePayment: window.STUDENT_MODALS.multiStagePayment,
    dualRegistrationSelector: window.STUDENT_MODALS.dualRegistrationSelector,
    customFeeSelector: window.STUDENT_MODALS.customFeeSelector,
    linkStudent: window.STUDENT_MODALS.linkStudent
};
