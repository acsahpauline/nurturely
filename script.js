// ===== SECTION NAVIGATION =====
function showSection(sectionId) {
    const sections = ['landing', 'auth', 'onboarding', 'dashboard', 'log', 'chat'];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

// ===== CAROUSEL =====
let currentSlide = 0;
const totalSlides = 5;

function moveCarousel(direction) {
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    document.getElementById('carouselTrack').style.transform = 
        `translateX(-${currentSlide * 100}%)`;
}

// Auto slide every 4 seconds
setInterval(() => moveCarousel(1), 4000);

// ===== LOG STORAGE =====
let logs = [];

async function saveLog() {
    const text = document.getElementById('incidentText').value.trim();
    const date = document.getElementById('incidentDate').value;
    const category = document.getElementById('incidentCategory').value;

    if (!text) {
        alert('Please describe what you noticed before saving.');
        return;
    }

    const child_id = window.childProfile ? window.childProfile.child_id : null;

    try {
        const response = await fetch('/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id,
                text,
                category,
                date: date || new Date().toLocaleDateString()
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('incidentText').value = '';
            document.getElementById('incidentDate').value = '';
            await loadLogs(child_id);
            showSection('dashboard');
        }
    } catch (error) {
        console.error('Log error:', error);
    }
}

function updateDashboard() {
    // Update stats
    document.getElementById('totalLogs').textContent = logs.length;

    // This week count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= oneWeekAgo;
    });
    document.getElementById('thisWeek').textContent = thisWeekLogs.length;

    // Flag patterns — if 3+ logs flag it
    const categoryCounts = {};
    logs.forEach(log => {
        categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
    });
    const flagged = Object.values(categoryCounts).filter(count => count >= 2).length;
    document.getElementById('alertCount').textContent = flagged;

    // Render logs list
    const logsList = document.getElementById('logsList');
    if (logs.length === 0) {
        logsList.innerHTML = `<p class="empty-state">No observations logged yet. Start by clicking <strong>+ log incident</strong> above.</p>`;
        return;
    }

    logsList.innerHTML = logs.slice().reverse().map(log => `
        <div class="log-item">
            <p>${log.text}</p>
            <span>${log.date} · ${formatCategory(log.category)}</span>
        </div>
    `).join('');
    updateConnectSection();
}

function formatCategory(cat) {
    const map = {
        food: 'food & eating habits',
        appearance: 'appearance & mirror time',
        products: 'beauty & makeup products',
        social: 'social withdrawal',
        other: 'other'
    };
    return map[cat] || cat;
}

// ===== AI CHAT =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Show user message
    appendMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    const typingId = showTyping();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                child_id: window.childProfile ? window.childProfile.child_id : null
            })
        });
        const data = await response.json();
        removeTyping(typingId);
        appendMessage(data.reply, 'ai');

    } catch (error) {
        removeTyping(typingId);
        appendMessage("I'm sorry, I couldn't connect right now. Please try again in a moment. 💙", 'ai');
    }
}
function appendMessage(text, sender) {
    const chatBox = document.getElementById('chatBox');
    const msg = document.createElement('div');
    msg.classList.add('chat-message', sender);
    msg.innerHTML = `<p>${text}</p>`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    const chatBox = document.getElementById('chatBox');
    const typing = document.createElement('div');
    const id = 'typing-' + Date.now();
    typing.id = id;
    typing.classList.add('chat-message', 'ai');
    typing.innerHTML = `<p>...</p>`;
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleEnter(event) {
    if (event.key === 'Enter') sendMessage();
}
// ===== TESTIMONIAL CAROUSEL =====
let currentTestimonial = 0;
const totalTestimonials = 6;

function moveTestimonial(direction) {
    currentTestimonial = (currentTestimonial + direction + totalTestimonials) % totalTestimonials;
    document.getElementById('testimonialTrack').style.transform =
        `translateX(-${currentTestimonial * 100}%)`;
    updateDots();
}

function updateDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentTestimonial);
    });
}

function initDots() {
    const container = document.getElementById('testimonialDots');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < totalTestimonials; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.onclick = () => {
            currentTestimonial = i;
            document.getElementById('testimonialTrack').style.transform =
                `translateX(-${currentTestimonial * 100}%)`;
            updateDots();
        };
        container.appendChild(dot);
    }
}

// Auto slide testimonials every 5 seconds
setInterval(() => moveTestimonial(1), 5000);

// Init dots on page load
window.addEventListener('load', initDots);
// ===== ONBOARDING VALIDATION =====
async function validateOnboarding() {
    const name = document.getElementById('childName').value.trim();
    const age = document.getElementById('childAge').value.trim();
    const personality = document.getElementById('childPersonality').value.trim();
    const loves = document.getElementById('childLoves').value.trim();

    if (!name) { showError('childName', "please enter your child's name"); return; }
    if (!age || age < 1 || age > 20) { showError('childAge', "please enter a valid age between 1 and 20"); return; }
    if (!personality) { showError('childPersonality', "please describe your child's personality"); return; }
    if (!loves) { showError('childLoves', "please tell us what your child used to love"); return; }

    try {
        const response = await fetch('/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                age, 
                personality, 
                loves,
                parent_id: window.parentProfile ? window.parentProfile.parent_id : null
            })
        });
        const data = await response.json();
        if (data.success) {
            window.childProfile = { name, age, personality, loves, child_id: data.child_id };
            document.getElementById('dashboardName').textContent = name;
            await loadLogs(data.child_id);
            showSection('dashboard');
        }
    } catch (error) {
        console.error('Onboarding error:', error);
    }
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.style.borderColor = '#f0a0a0';
    field.focus();

    // Remove existing error if any
    const existing = document.getElementById(fieldId + '-error');
    if (existing) existing.remove();

    const error = document.createElement('p');
    error.id = fieldId + '-error';
    error.style.cssText = 'color: #c0392b; font-size: 0.8rem; margin-top: 0.3rem;';
    error.textContent = message;
    field.parentNode.appendChild(error);

    // Clear error on typing
    field.addEventListener('input', () => {
        field.style.borderColor = '';
        error.remove();
    }, { once: true });
}

// ===== LOAD LOGS FROM DATABASE =====
async function loadLogs(child_id) {
    if (!child_id) return;

    try {
        const response = await fetch(`/logs/${child_id}`);
        const data = await response.json();
        logs = data.logs;
        updateDashboard();
    } catch (error) {
        console.error('Load logs error:', error);
    }
}
// ===== AUTH =====
function switchTab(tab) {
    if (tab === 'register') {
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
    } else {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerTab').classList.remove('active');
        document.getElementById('loginTab').classList.add('active');
    }
}

async function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirm = document.getElementById('regConfirm').value.trim();

    if (!name) { showAuthError('regName', 'please enter your name'); return; }
    if (!email) { showAuthError('regEmail', 'please enter your email'); return; }
    if (!password || password.length < 6) { showAuthError('regPassword', 'password must be at least 6 characters'); return; }
    if (password !== confirm) { showAuthError('regConfirm', 'passwords do not match'); return; }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();

        if (data.success) {
            window.parentProfile = { parent_id: data.parent_id, name: data.name, email: email, bio: null, profile_pic: null };
            updateNavAvatar(data.name, null);
            showSection('onboarding');
        } else {
            if (data.error === 'Email already registered') {
                showAuthError('regEmail', "you're already registered. please login instead 💙");
            } else {
                showAuthError('regEmail', data.error);
            }
        }
    } catch (error) {
        console.error('Register error:', error);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email) { showAuthError('loginEmail', 'please enter your email'); return; }
    if (!password) { showAuthError('loginPassword', 'please enter your password'); return; }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        console.log('login data:', JSON.stringify(data));

        if (data.success) {
            window.parentProfile = { parent_id: data.parent_id, name: data.name, email: email, bio: data.bio || null, profile_pic: data.profile_pic || null };
            updateNavAvatar(data.name, data.profile_pic || null);

            if (data.child) {
                // Returning parent — load their data and go straight to dashboard
                window.childProfile = {
                    child_id: data.child.id || data.child.child_id,
                    name: data.child.name,
                    age: data.child.age,
                    personality: data.child.personality,
                    loves: data.child.loves
                };
                document.getElementById('dashboardName').textContent = data.child.name;
                await loadLogs(data.child.id);
                showSection('dashboard');
            } else {
                // New parent — no child yet, go to onboarding
                showSection('onboarding');
            }
        } else {
            if (data.error === 'No account found with this email') {
                showAuthError('loginEmail', "your email is not registered. please register first 💙");
            } else if (data.error === 'Incorrect password') {
                showAuthError('loginPassword', 'incorrect password. please try again');
            } else {
                showAuthError('loginEmail', data.error);
            }
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

function showAuthError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.style.borderColor = '#f0a0a0';
    field.focus();

    const existing = document.getElementById(fieldId + '-error');
    if (existing) existing.remove();

    const error = document.createElement('p');
    error.id = fieldId + '-error';
    error.style.cssText = 'color: #c0392b; font-size: 0.8rem; margin-top: 0.3rem;';
    error.textContent = message;
    field.parentNode.appendChild(error);

    field.addEventListener('input', () => {
        field.style.borderColor = '';
        if (error.parentNode) error.remove();
    }, { once: true });
}

// ===== PROFILE =====
function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.profile-avatar-wrap');
    if (wrap && !wrap.contains(e.target)) {
        const menu = document.getElementById('profileMenu');
        if (menu) menu.style.display = 'none';
    }
});

function updateNavAvatar(name, picFilename) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const ids = ['navAvatar', 'menuAvatarInitial', 'navAvatarInitial'];

    document.getElementById('navAvatarInitial').textContent = initial;
    document.getElementById('menuAvatarInitial').textContent = initial;

    if (picFilename) {
        const src = `/static/images/${picFilename}`;
        document.getElementById('navAvatarImg').src = src;
        document.getElementById('navAvatarImg').style.display = 'block';
        document.getElementById('navAvatarInitial').style.display = 'none';
        document.getElementById('menuAvatarImg').src = src;
        document.getElementById('menuAvatarImg').style.display = 'block';
        document.getElementById('menuAvatarInitial').style.display = 'none';
    } else {
        document.getElementById('navAvatarImg').style.display = 'none';
        document.getElementById('navAvatarInitial').style.display = 'block';
        document.getElementById('menuAvatarImg').style.display = 'none';
        document.getElementById('menuAvatarInitial').style.display = 'block';
    }

    if (window.parentProfile) {
        document.getElementById('menuName').textContent = name;
        document.getElementById('menuEmail').textContent = window.parentProfile.email || '';
    }
}

function openViewProfile() {
    document.getElementById('profileMenu').style.display = 'none';
    const p = window.parentProfile;
    const c = window.childProfile;
    if (!p) return;

    const initial = p.name.charAt(0).toUpperCase();
    document.getElementById('viewPicInitial').textContent = initial;
    document.getElementById('viewProfileName').textContent = p.name;
    document.getElementById('viewProfileEmail').textContent = p.email || '';
    document.getElementById('viewProfileBio').textContent = p.bio || 'no bio yet';
    document.getElementById('viewTotalLogs').textContent = logs.length;
    document.getElementById('viewChildName').textContent = c ? c.name : 'not set';

    if (p.profile_pic) {
        document.getElementById('viewPicImg').src = `/static/images/${p.profile_pic}`;
        document.getElementById('viewPicImg').style.display = 'block';
        document.getElementById('viewPicInitial').style.display = 'none';
    } else {
        document.getElementById('viewPicImg').style.display = 'none';
        document.getElementById('viewPicInitial').style.display = 'block';
    }

    document.getElementById('viewProfileModal').style.display = 'flex';
}

function openEditProfile() {
    document.getElementById('profileMenu').style.display = 'none';
    const p = window.parentProfile;
    if (!p) return;

    document.getElementById('editName').value = p.name || '';
    document.getElementById('editBio').value = p.bio || '';
    document.getElementById('editPicInitial').textContent = p.name.charAt(0).toUpperCase();

    if (p.profile_pic) {
        document.getElementById('editPicImg').src = `/static/images/${p.profile_pic}`;
        document.getElementById('editPicImg').style.display = 'block';
        document.getElementById('editPicInitial').style.display = 'none';
    } else {
        document.getElementById('editPicImg').style.display = 'none';
        document.getElementById('editPicInitial').style.display = 'block';
    }

    document.getElementById('editProfileModal').style.display = 'flex';
}

function previewPic(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('editPicImg').src = e.target.result;
        document.getElementById('editPicImg').style.display = 'block';
        document.getElementById('editPicInitial').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const picFile = document.getElementById('profilePicInput').files[0];

    if (!name) { alert('please enter your name'); return; }

    const formData = new FormData();
    formData.append('parent_id', window.parentProfile.parent_id);
    formData.append('name', name);
    formData.append('bio', bio);
    if (picFile) formData.append('profile_pic', picFile);

    try {
        const response = await fetch('/profile/update', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            window.parentProfile.name = name;
            window.parentProfile.bio = bio;
            if (data.pic) window.parentProfile.profile_pic = data.pic;
            updateNavAvatar(name, window.parentProfile.profile_pic);
            closeModal('editProfileModal');
        }
    } catch (error) {
        console.error('Save profile error:', error);
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function handleSignOut() {
    await fetch('/signout', { method: 'POST' });
    window.parentProfile = null;
    window.childProfile = null;
    logs = [];
    document.getElementById('profileMenu').style.display = 'none';
    showSection('landing');
}

// ===== CONNECT FEATURE =====
const connectParents = {
    food: [
        {
            name: "Priya Sharma",
            location: "Mumbai, India",
            initial: "P",
            color: "#f0b8c8",
            pic: "connect1.jpg",
            concern: "food & eating habits",
            bio: "My 12-year-old started avoiding meals last year. It's been a challenging journey but we're getting there. Happy to share what's worked for us."
        },
        {
            name: "Sarah Mitchell",
            location: "London, UK",
            initial: "S",
            color: "#a8d8f0",
            pic: "connect2.jpg",
            concern: "food & eating habits",
            bio: "Single mum of a 13-year-old. Noticed restrictive eating patterns 6 months ago. Nurturely helped me understand the triggers."
        },
        {
            name: "Fatima Al-Hassan",
            location: "Dubai, UAE",
            initial: "F",
            color: "#b8f0c8",
            pic: "connect3.jpg",
            concern: "food & eating habits",
            bio: "Mother of two girls. My older one went through this at 11. Now helping my younger daughter through a similar phase."
        }
    ],
    appearance: [
        {
            name: "James Okoye",
            location: "Lagos, Nigeria",
            initial: "J",
            color: "#d0b8f0",
            pic: "connect4.jpg",
            concern: "appearance & mirror time",
            bio: "My daughter spends hours in front of the mirror and it worried me. Found other parents going through the same thing really helped."
        },
        {
            name: "Maria Santos",
            location: "São Paulo, Brazil",
            initial: "M",
            color: "#f0e8a0",
            pic: "connect5.jpg",
            concern: "appearance & mirror time",
            bio: "13-year-old daughter started making negative comments about herself. We're working through it together with professional support."
        },
        {
            name: "David Chen",
            location: "Singapore",
            initial: "D",
            color: "#f0a0a0",
            pic: "connect6.jpg",
            concern: "appearance & mirror time",
            bio: "Son aged 12 became obsessed with his appearance after starting secondary school. Connecting with other parents has been so helpful."
        }
    ],
    products: [
        {
            name: "Anita Patel",
            location: "Ahmedabad, India",
            initial: "A",
            color: "#f0b8c8",
            pic: "connect7.jpg",
            concern: "beauty & makeup products",
            bio: "Found a stash of skincare products my 11-year-old had been hiding. Nurturely helped me approach the conversation without shaming her."
        },
        {
            name: "Claire Dubois",
            location: "Paris, France",
            initial: "C",
            color: "#b8f0c8",
            pic: "connect8.jpg",
            concern: "beauty & makeup products",
            bio: "The Sephora kids trend hit our home hard. My daughter is 10 and already asking for anti-aging products. We're navigating this carefully."
        },
        {
            name: "Yuki Tanaka",
            location: "Tokyo, Japan",
            initial: "Y",
            color: "#a8d8f0",
            pic: "connect9.jpg",
            concern: "beauty & makeup products",
            bio: "Social media influencers have had a huge impact on my daughter's relationship with beauty products. Happy to connect with other parents."
        }
    ],
    social: [
        {
            name: "Amara Diallo",
            location: "Accra, Ghana",
            initial: "A",
            color: "#d0b8f0",
            pic: "connect10.jpg",
            concern: "social withdrawal",
            bio: "My son stopped wanting to go to parties or eat with friends. It took me a while to connect this to body image concerns."
        },
        {
            name: "Rachel Kim",
            location: "Seoul, South Korea",
            initial: "R",
            color: "#f0e8a0",
            pic: "connect11.jpg",
            concern: "social withdrawal",
            bio: "Academic pressure combined with body image issues caused my daughter to withdraw socially. We're making progress slowly."
        },
        {
            name: "Thomas Weber",
            location: "Berlin, Germany",
            initial: "T",
            color: "#f0a0a0",
            pic: "connect12.jpg",
            concern: "social withdrawal",
            bio: "Father of a 14-year-old who started avoiding swimming lessons and sports. Realised it was connected to how he felt about his body."
        }
    ],
    other: [
        {
            name: "Meera Nair",
            location: "Chennai, India",
            initial: "M",
            color: "#b8f0c8",
            pic: "connect13.jpg",
            concern: "general concern",
            bio: "Every child is different. Happy to connect with parents who are just starting to notice changes in their child."
        },
        {
            name: "Carlos Rivera",
            location: "Mexico City, Mexico",
            initial: "C",
            color: "#a8d8f0",
            pic: "connect14.jpg",
            concern: "general concern",
            bio: "It can feel very isolating when you're worried about your child. Connecting with other parents makes a real difference."
        },
        {
            name: "Aisha Mohammed",
            location: "Nairobi, Kenya",
            initial: "A",
            color: "#d0b8f0",
            pic: "connect15.jpg",
            concern: "general concern",
            bio: "Community support has been everything for our family. Reach out anytime — no parent should navigate this alone."
        }
    ]
};

let selectedConnectParent = null;

function updateConnectSection() {
    const categoryCounts = {};
    logs.forEach(log => {
        categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
    });

    const flaggedCategories = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] >= 2);

    const connectSection = document.getElementById('connectSection');
    const connectGrid = document.getElementById('connectGrid');

    if (flaggedCategories.length === 0) {
        connectSection.style.display = 'none';
        return;
    }

    connectSection.style.display = 'block';
    const topCategory = flaggedCategories[0];
    const parents = connectParents[topCategory] || connectParents.other;

    connectGrid.innerHTML = parents.map((parent, i) => `
    <div class="connect-card" onclick="openConnectModal(${i}, '${topCategory}')">
        <div class="connect-avatar" style="background-color: ${parent.color}; overflow:hidden; padding:0;">
            ${parent.pic
                ? `<img src="/static/images/${parent.pic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : parent.initial}
        </div>
            <h4>${parent.name}</h4>
            <p>${parent.location}</p>
            <span class="connect-concern-tag">${parent.concern}</span>
            <button class="connect-btn">connect</button>
        </div>
    `).join('');
}

function openConnectModal(index, category) {
    const parents = connectParents[category] || connectParents.other;
    const parent = parents[index];
    selectedConnectParent = parent;

    document.getElementById('connectPic').style.backgroundColor = parent.color;
    if (parent.pic) {
        document.getElementById('connectPic').innerHTML = `<img src="/static/images/${parent.pic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    } else {
        document.getElementById('connectPic').innerHTML = `<span style="font-size:1.5rem;">${parent.initial}</span>`;
    }
    document.getElementById('connectName').textContent = parent.name;
    document.getElementById('connectLocation').textContent = parent.location;
    document.getElementById('connectConcern').textContent = parent.concern;
    document.getElementById('connectConcern').className = 'connect-concern-tag';
    document.getElementById('connectBio').textContent = parent.bio;
    document.getElementById('connectConfirm').style.display = 'none';

    document.getElementById('connectModal').style.display = 'flex';
}

function sendConnectRequest() {
    document.getElementById('connectConfirm').style.display = 'block';
    document.querySelector('#connectModal .btn-primary').style.display = 'none';
}

// ===== SUPPORT =====
let selectedType = 'complaint';
let selectedRating = 0;

function openSupport() {
    // close all profile menus
    ['profileMenu', 'profileMenuLog', 'profileMenuChat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // reset form
    selectType('complaint');
    document.getElementById('supportMessage').value = '';
    document.getElementById('supportSuccess').style.display = 'none';
    document.querySelector('#supportModal .btn-primary').style.display = 'block';
    document.getElementById('supportModal').style.display = 'flex';
}

function selectType(type) {
    selectedType = type;
    ['complaint', 'suggestion', 'testimonial'].forEach(t => {
        document.getElementById('type' + t.charAt(0).toUpperCase() + t.slice(1)).classList.remove('active');
    });
    document.getElementById('type' + type.charAt(0).toUpperCase() + type.slice(1)).classList.add('active');

    const labels = {
        complaint: 'describe your complaint',
        suggestion: 'share your suggestion',
        testimonial: 'share your experience'
    };
    const placeholders = {
        complaint: 'tell us what went wrong...',
        suggestion: 'what would make nurturely better for you?',
        testimonial: 'how has nurturely helped you and your family?'
    };

    document.getElementById('messageLabel').textContent = labels[type];
    document.getElementById('supportMessage').placeholder = placeholders[type];
    document.getElementById('ratingSection').style.display = type === 'testimonial' ? 'block' : 'none';
}

function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.star').forEach((star, i) => {
        star.classList.toggle('active', i < rating);
    });
}

async function submitSupport() {
    const message = document.getElementById('supportMessage').value.trim();
    if (!message) {
        document.getElementById('supportMessage').style.borderColor = '#f0a0a0';
        document.getElementById('supportMessage').focus();
        return;
    }

    try {
        const response = await fetch('/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parent_id: window.parentProfile ? window.parentProfile.parent_id : null,
                type: selectedType,
                message: message,
                rating: selectedType === 'testimonial' ? selectedRating : null
            })
        });

        const data = await response.json();
        if (data.success) {
            const messages = {
                complaint: "your complaint has been received. our team will look into it shortly.",
                suggestion: "thanks for your suggestion! we're always looking to improve.",
                testimonial: "your testimonial means the world to us. thank you for sharing your story. 💙"
            };
            document.getElementById('supportSuccessMsg').textContent = messages[selectedType];
            document.getElementById('supportSuccess').style.display = 'block';
            document.querySelector('#supportModal .btn-primary').style.display = 'none';
            document.getElementById('supportMessage').value = '';
        }
    } catch (error) {
        console.error('Support error:', error);
    }
}