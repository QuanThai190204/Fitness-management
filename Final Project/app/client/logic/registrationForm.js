// Handle registration form submission
async function submitRegistration(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      document.getElementById('message').innerHTML = 
        `<p style="color: green;">${result.message}</p>`;
      e.target.reset();
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
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', submitRegistration);
  }
});