
// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            
            sessionStorage.setItem('userId', result.user.id);
            sessionStorage.setItem('userName', result.user.name);
            sessionStorage.setItem('userRole', result.user.role);
            
            document.getElementById('message').innerHTML = 
                `<p style="color: green;">${result.message}</p>`;
            
            // Redirect based on user role after a short delay
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 500);
            
        } else {
            document.getElementById('message').innerHTML = 
                `<p style="color: red;">Error: ${result.error}</p>`;
        }
    } catch (error) {
        document.getElementById('message').innerHTML = 
            `<p style="color: red;">Network error: ${error.message}</p>`;
    }
}


// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupButton = document.getElementById('signupButton');
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle signup button click - redirect to registration page
    if (signupButton) {
        signupButton.addEventListener('click', function() {
            window.location.href = 'registration.html';
        });
    }
});