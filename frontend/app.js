const API_BASE_URL = 'http://localhost:5006/api';

// DOM Elements
const authForm = document.getElementById('authForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const submitBtn = document.getElementById('submitBtn');
const authMessage = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Modal Elements
const hospitalModal = document.getElementById('hospitalModal');
const closeModalBtn = document.getElementById('closeModal');
const mHospitalName = document.getElementById('mHospitalName');
const mHospitalLocation = document.getElementById('mHospitalLocation');
const mHospitalBeds = document.getElementById('mHospitalBeds');

let isLoginMode = true;

// Auth Tab Switching
if (loginTab && registerTab) {
    loginTab.addEventListener('click', () => {
        isLoginMode = true;
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        submitBtn.textContent = 'Login';
        if(authMessage) authMessage.style.display = 'none';
        authForm.reset();
    });

    registerTab.addEventListener('click', () => {
        isLoginMode = false;
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        submitBtn.textContent = 'Register';
        if(authMessage) authMessage.style.display = 'none';
        authForm.reset();
    });
}

const showMessage = (msg, type) => {
    if(!authMessage) return;
    authMessage.textContent = msg;
    authMessage.className = `message ${type}`;
};

// Handle Authentication
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        
        try {
            submitBtn.textContent = 'Please wait...';
            submitBtn.disabled = true;

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                showMessage(data.message, 'success');
                if (isLoginMode) {
                    localStorage.setItem('userEmail', data.email);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    // Switch to login after successful registration
                    setTimeout(() => {
                        loginTab.click();
                        showMessage('Registration successful! Please login.', 'success');
                    }, 1500);
                }
            } else {
                showMessage(data.message || 'Error occurred', 'error');
            }
        } catch (err) {
            showMessage('Cannot connect to server', 'error');
        } finally {
            submitBtn.textContent = isLoginMode ? 'Login' : 'Register';
            submitBtn.disabled = false;
        }
    });
}

// Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    });
}

// Fetch and Display Hospitals
async function fetchHospitals() {
    const grid = document.getElementById('hospitalsGrid');
    const loader = document.getElementById('loader');
    
    if (!grid) return;
    
    try {
        loader.style.display = 'block';
        const res = await fetch(`${API_BASE_URL}/hospitals`);
        const data = await res.json();
        
        loader.style.display = 'none';
        
        if (data.length === 0) {
            grid.innerHTML = `<p style="text-align:center; grid-column:1/-1; color:var(--text-muted)">No hospitals available.</p>`;
            return;
        }

        grid.innerHTML = '';
        data.forEach((hospital, index) => {
            const delay = index * 0.1;
            const card = document.createElement('div');
            card.className = 'hospital-card';
            card.style.animationDelay = `${delay}s`;
            
            // Add click event for modal layout
            card.addEventListener('click', () => openHospitalModal(hospital));
            
            const bedsClass = hospital.bedsAvailable <= 5 ? 'low' : '';
            
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="hospital-name">${hospital.name}</h3>
                    <div class="hospital-location">
                        <span class="location-icon">📍</span>
                        ${hospital.location}
                    </div>
                </div>
                <div class="card-body">
                    <span class="beds-label">Available Beds</span>
                    <div class="beds-count ${bedsClass}">${hospital.bedsAvailable}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        loader.style.display = 'none';
        grid.innerHTML = `<p style="text-align:center; grid-column:1/-1; color:red">Error fetching data. Ensure backend is running.</p>`;
    }
}

// Modal Functions
function openHospitalModal(hospital) {
    if(!hospitalModal) return;
    mHospitalName.textContent = hospital.name;
    mHospitalLocation.textContent = hospital.location;
    mHospitalBeds.textContent = hospital.bedsAvailable;
    
    // update colors
    mHospitalBeds.className = `beds-count ${hospital.bedsAvailable <= 5 ? 'low' : ''}`;
    
    // Setup booking button
    const bookBedBtn = document.getElementById('bookBedBtn');
    if (bookBedBtn) {
        // Reset state
        bookBedBtn.style.background = '';
        if (hospital.bedsAvailable > 0) {
            bookBedBtn.textContent = 'Book a Bed';
            bookBedBtn.disabled = false;
        } else {
            bookBedBtn.textContent = 'No Beds Available';
            bookBedBtn.disabled = true;
            bookBedBtn.style.background = '#9e9e9e'; // Gray out
        }

        bookBedBtn.onclick = async () => {
            bookBedBtn.textContent = 'Processing...';
            bookBedBtn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/hospitals/${hospital._id}/book`, {
                    method: 'PUT'
                });
                const data = await res.json();

                if (res.ok) {
                    bookBedBtn.textContent = 'Bed Booked Successfully ✓';
                    bookBedBtn.style.background = '#2e7d32'; // Success Green
                    
                    // Update Modal Data instantly
                    hospital.bedsAvailable = data.bedsAvailable;
                    mHospitalBeds.textContent = hospital.bedsAvailable;
                    mHospitalBeds.className = `beds-count ${hospital.bedsAvailable <= 5 ? 'low' : ''}`;
                    
                    // Re-render dashboard dynamically in the background so grid updates immediately
                    fetchHospitals();
                } else {
                    bookBedBtn.textContent = 'Booking Failed';
                    bookBedBtn.style.background = '#d32f2f'; // Error Red
                    setTimeout(() => {
                        bookBedBtn.textContent = 'Try Again';
                        bookBedBtn.disabled = false;
                        bookBedBtn.style.background = ''; // reset to default gradient
                    }, 2000);
                }
            } catch (err) {
                bookBedBtn.textContent = 'Connection Error';
                bookBedBtn.style.background = '#d32f2f'; // Error Red
                setTimeout(() => {
                    bookBedBtn.textContent = 'Try Again';
                    bookBedBtn.disabled = false;
                    bookBedBtn.style.background = '';
                }, 2000);
            }
        };
    }
    
    hospitalModal.classList.add('active');
}

function closeHospitalModal() {
    if(hospitalModal) {
        hospitalModal.classList.remove('active');
    }
}

if(closeModalBtn) {
    closeModalBtn.addEventListener('click', closeHospitalModal);
}

if(hospitalModal) {
    // Close modal when clicking outside content
    hospitalModal.addEventListener('click', (e) => {
        if(e.target === hospitalModal) {
            closeHospitalModal();
        }
    });
}
