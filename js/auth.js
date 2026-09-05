// Authentication credentials
const VALID_USERNAME = 'NEW-USER2026/2027';
const VALID_PASSWORD = 'NEW#$2030#$';

// Authentication module
window.Auth = {
    // Validate credentials
    validate(username, password) {
        return username === VALID_USERNAME && password === VALID_PASSWORD;
    },

    // Check login state
    isLoggedIn() {
        return localStorage.getItem('loginState') === 'true'
            && Boolean(window.TenantStore?.getCurrentTeacherId());
    },

    getCurrentTeacherId() {
        return window.TenantStore?.getCurrentTeacherId() || null;
    },

    // Perform login
    login(username, teacherName, selectedStages, selectedGrades, userId = null) {
        if (!window.TenantStore) return false;
        window.TenantStore.activateSession(username, teacherName, selectedStages, selectedGrades, userId);
        return true;
    },

    async signInEmail(email, password) {
        return window.AppwriteConfig.account.createEmailPasswordSession(email, password);
    },

    async createEmail(email, password, name) {
        const user = await window.AppwriteConfig.account.create(
            window.AppwriteConfig.ID.unique(), email, password, name
        );
        await this.signInEmail(email, password);
        return user;
    },

    signInGoogle() {
        // Use Vercel URL for production, localhost for development
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const redirectUrl = isProduction 
            ? 'https://sheikh-abdo.vercel.app/' 
            : window.location.href;
        
        return window.AppwriteConfig.account.createOAuth2Session(
            'google', redirectUrl, redirectUrl
        );
    },

    // Perform logout - Preserve custom configurations
    logout() {
        window.AppwriteConfig?.account?.deleteSession('current').catch(() => {});
        window.TenantStore?.endSession();
        if (window.GlobalStageFilter) {
            window.GlobalStageFilter.activeStage = null;
            window.GlobalStageFilter.activeGrade = null;
            window.GlobalStageFilter.updateHeaderController();
        }
    },

    // Get stored data
    getTeacherName() {
        return window.TenantStore?.getProfile()?.teacherName
            || window.TenantStore?.get('teacherName', 'المعلم')
            || 'المعلم';
    },

    getSelectedStages() {
        const profile = window.TenantStore?.getProfile();
        return profile?.selectedStages
            || JSON.parse(window.TenantStore?.get('selectedStages', '[]') || '[]');
    },

    getSelectedGrades() {
        const profile = window.TenantStore?.getProfile();
        return profile?.selectedGrades
            || JSON.parse(window.TenantStore?.get('selectedGrades', '{}') || '{}');
    },

    // Get static credentials
    getCredentials() {
        return {
            username: VALID_USERNAME,
            password: VALID_PASSWORD
        };
    },

    // Update teacher name
    updateTeacherName(newName) {
        if (newName && newName.trim()) {
            return Boolean(window.TenantStore?.updateProfile({
                teacherName: newName.trim()
            }));
        }
        return false;
    },

    // Update stages and grades
    updateStages(selectedStages, selectedGrades) {
        return Boolean(window.TenantStore?.updateProfile({
            selectedStages,
            selectedGrades
        }));
    }
};
