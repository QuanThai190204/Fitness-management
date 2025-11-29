// Utility functions for user session management
export function getCurrentUserId() {
    return sessionStorage.getItem('userId');
}

export function getCurrentUser() {
    return {
        id: sessionStorage.getItem('userId'),
        name: sessionStorage.getItem('userName'),
        role: sessionStorage.getItem('userRole')
    };
}

export function isLoggedIn() {
    return !!sessionStorage.getItem('userId');
}

export function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

export function getUserData() {
    return JSON.parse(sessionStorage.getItem('userData')) ;
}

export function formatDateForInput(dateString) {
    if (!dateString) return "";

    // Extract only yyyy-mm-dd
    const [year, month, day] = dateString.substring(0, 10).split("-");

    return `${year}-${month}-${day}`;
}



