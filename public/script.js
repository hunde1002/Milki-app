const translations = {
    om: {
        app_title: "Hunde Lottery",
        welcome_admin: "Admin: Hunde Tesfaye Jule",
        banner_desc: "Carraan kee har'aa ilaali! Birr 200 qofaan hirmaadhu.",
        countdown_title: "Yeroo Carraan Itti Bahu",
        participants: "Hirmaattoota",
        tickets_left: "Tiketiin Hafan",
        buy_ticket_btn: "Tikitii Murachuu",
        checkout_title: "Tikitii Bitachuu & Kafaltii",
        fullname: "Maqaa Guutuu",
        phone: "Lakkoofsa Bilbilaa",
        select_tickets: "Lakkoofsa Tikitii Filadhu (Tokko Birr 200)",
        payment_methods: "Bakka Kafaltii (CBE & Telebirr)",
        upload_screen: "Suuraa Kafaltii Upload Godhi",
        terms_text: "Waliigaltee eeguuf mallattoo kaa'i",
        submit_payment: "Kafaltii Ergi",
        my_tickets_title: "Tikitiiwwan Koo & Haala Isaanii",
        winners_title: "Mo'attoota Labaman",
        nav_home: "Home",
        nav_tickets: "Tikitii Koo",
        nav_winners: "Mo'attoota",
        nav_admin: "Admin"
    },
    en: {
        app_title: "Hunde Lottery",
        welcome_admin: "Admin: Hunde Tesfaye Jule",
        banner_desc: "Test your luck today! Participate for only 200 Birr.",
        countdown_title: "Draw Countdown",
        participants: "Participants",
        tickets_left: "Tickets Left",
        buy_ticket_btn: "Buy Ticket Now",
        checkout_title: "Ticket Purchase & Payment",
        fullname: "Full Name",
        phone: "Phone Number",
        select_tickets: "Select Tickets (200 Birr each)",
        payment_methods: "Payment Accounts (CBE & Telebirr)",
        upload_screen: "Upload Payment Screenshot",
        terms_text: "I agree to terms and conditions",
        submit_payment: "Submit Payment",
        my_tickets_title: "My Tickets & Status",
        winners_title: "Winners Announcement",
        nav_home: "Home",
        nav_tickets: "My Tickets",
        nav_winners: "Winners",
        nav_admin: "Admin"
    },
    am: {
        app_title: "ሁንዴ ሎተሪ",
        welcome_admin: "አድሚን: ሁንዴ ተስፋዬ ጁሌ",
        banner_desc: "ዕድልዎን ዛሬ ይሞክሩ! በ 200 ብር ብቻ ይሳተፉ።",
        countdown_title: "እጣ የሚወጣበት ጊዜ",
        participants: "ተሳታፊዎች",
        tickets_left: "የቀሩ ቲኬቶች",
        buy_ticket_btn: "ቲኬት ይግዙ",
        checkout_title: "ቲኬት ግዢ እና ክፍያ",
        fullname: "ሙሉ ስም",
        phone: "ስልክ ቁጥር",
        select_tickets: "የቲኬት ብዛት ይምረጡ (አንድ 200 ብር)",
        payment_methods: "የክፍያ አካውንቶች ( CBE & ቴሌብር)",
        upload_screen: "የክፍያ ስክሪንሾት ይጫኑ",
        terms_text: "የውል ደንቦቹን እስማማለሁ",
        submit_payment: "ክፍያ ይላኩ",
        my_tickets_title: "የእኔ ቲኬቶች እና ሁኔታ",
        winners_title: "አሸናፊዎች ማስታወቂያ",
        nav_home: "መነሻ",
        nav_tickets: "ቲኬቶቼ",
        nav_winners: "አሸናፊዎች",
        nav_admin: "አድሚን"
    }
};

let currentLang = 'om';
let ticketPrice = 200; 
let maxTickets = 50;
let selectedNumbers = []; // User-n lakkoofsota filate qabata

// Initialize Telegram WebApp Data (Persistent LocalStorage Fallback)
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.ready();
    tgApp.expand();
}

// User ID Back yoo jedhan akka hin badneef LocalStorage keessatti save gochuu
let savedUserId = localStorage.getItem('hunde_user_id');
if (!savedUserId) {
    savedUserId = tgApp?.initDataUnsafe?.user?.id ? String(tgApp.initDataUnsafe.user.id) : 'guest_' + Date.now();
    localStorage.setItem('hunde_user_id', savedUserId);
}

const currentUser = {
    id: savedUserId,
    username: tgApp?.initDataUnsafe?.user?.username || 'GuestUser',
    first_name: tgApp?.initDataUnsafe?.user?.first_name || ''
};

// 1. Language Handling
function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

function detectLanguageFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && translations[langParam]) {
        changeLanguage(langParam);
    }
}

// 2. Navigation & View Refresh
function navigateTo(pageId, evt) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    document.querySelectorAll('.glass-nav button').forEach(b => b.classList.remove('active'));
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    }

    // SIRREEFFAMA: `home` irratti qofa grid re-load godhi, checkout irratti selected numbers akka hin balleessineef
    if (pageId === 'home') loadTicketGrid();
    if (pageId === 'mytickets') loadUserTickets();
    if (pageId === 'winners') loadWinners();
}

function toggleTheme() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    document.body.setAttribute('data-theme', isLight ? '' : 'light');
}

function calculateTotal() {
    const totalElem = document.getElementById('total-cost');
    if (totalElem) {
        totalElem.innerText = selectedNumbers.length * ticketPrice;
    }
}

// 3. TICKET GRID GENERATOR & DISABLED TAKEN NUMBERS
async function loadTicketGrid() {
    const gridContainer = document.getElementById('ticket-grid-container');
    if (!gridContainer) return;

    try {
        const res = await fetch('/api/tickets');
        const tickets = await res.json();
        
        let takenNumbers = [];
        tickets.forEach(t => {
            if (t.status === 'Approved' || t.status === 'Pending' || t.status === 'Reserved') {
                if (t.ticket_numbers) {
                    const nums = t.ticket_numbers.split(',').map(n => n.trim());
                    takenNumbers.push(...nums);
                }
            }
        });

        gridContainer.innerHTML = '';

        for (let i = 1; i <= maxTickets; i++) {
            const btn = document.createElement('button');
            const strI = String(i);
            btn.type = 'button';
            btn.className = 'ticket-number-btn';
            btn.innerText = i;

            const isTaken = takenNumbers.includes(strI);

            if (isTaken) {
                btn.classList.add('taken');
                btn.disabled = true;
                btn.title = 'Lakkoofsi kun kanaan dura dhuunfatameera';
            } else {
                // Yoo duraan filatamee ture class 'selected' kaayi
                if (selectedNumbers.includes(strI)) {
                    btn.classList.add('selected');
                }
                btn.onclick = () => toggleNumberSelection(i, btn);
            }

            gridContainer.appendChild(btn);
        }
        calculateTotal();
    } catch (err) {
        console.error("Error loading ticket grid:", err);
    }
}

function toggleNumberSelection(num, btnElement) {
    const strNum = String(num);
    const index = selectedNumbers.indexOf(strNum);

    if (index > -1) {
        selectedNumbers.splice(index, 1);
        btnElement.classList.remove('selected');
    } else {
        selectedNumbers.push(strNum);
        btnElement.classList.add('selected');
    }

    calculateTotal();
}

// 4. Fetch Settings & Countdown
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.ticket_price) {
            ticketPrice = data.ticket_price;
        }
        if (data.max_tickets) {
            maxTickets = data.max_tickets;
        }
        if (data.end_date) {
            startCountdown(data.end_date);
        }
        loadTicketGrid();
    } catch (err) {
        console.error("Error fetching settings:", err);
    }
}

function startCountdown(endDate) {
    const target = new Date(endDate).getTime();
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = target - now;
        if (diff > 0) {
            const dElem = document.getElementById('days');
            const hElem = document.getElementById('hours');
            const mElem = document.getElementById('mins');
            const sElem = document.getElementById('secs');

            if (dElem) dElem.innerText = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (hElem) hElem.innerText = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (mElem) mElem.innerText = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            if (sElem) sElem.innerText = Math.floor((diff % (1000 * 60)) / 1000);
        } else {
            clearInterval(interval);
        }
    }, 1000);
}

// 5. Ticket Submission
async function submitTicket(e) {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value;
    const phone = document.getElementById('phone').value;
    const screenshotInput = document.getElementById('screenshot');

    // SIRREEFFAMA: Chekiin kun interface frontend irratti akka alert kennuuf
    if (!selectedNumbers || selectedNumbers.length === 0) {
        alert("Maaloo gara Home deebi'uudhaan lakkoofsa tiketi yoo xiqqaate tokko filadhaa!");
        return;
    }

    if (!screenshotInput.files || screenshotInput.files.length === 0) {
        alert("Maaloo suuraa/screenshot kaffaltii upload godhaa!");
        return;
    }

    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('username', currentUser.username);
    formData.append('fullname', fullname);
    formData.append('phone', phone);
    formData.append('ticket_numbers', selectedNumbers.join(', ')); // Fakkeenya: "3, 12, 45"
    formData.append('payment_method', 'CBE/Telebirr');
    formData.append('screenshot', screenshotInput.files[0]);

    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (data.success) {
            alert('Tikettiin keessan milkaa\'inaan ergameera! Approval Admin eegaa.');
            selectedNumbers = []; // Ergamaan booda qofa qulqulleessi
            navigateTo('mytickets');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        console.error("Ticket submission error:", err);
        alert("Server error uumameera. Deebitanii yaalaa.");
    }
}

// 6. Load My Tickets
async function loadUserTickets() {
    try {
        const res = await fetch('/api/tickets');
        const tickets = await res.json();
        const container = document.getElementById('tickets-list-container');
        if (!container) return;

        const myTickets = tickets.filter(t => String(t.user_id) === String(currentUser.id));

        if (myTickets.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">Tikitii bitattan hin qabdan.</p>';
            return;
        }

        container.innerHTML = myTickets.map(t => `
            <div class="glass-card" style="margin-bottom:12px; padding:15px; border-radius:10px;">
                <p><strong>Ticket ID:</strong> #${t.id}</p>
                <p><strong>Maqaa:</strong> ${t.fullname || 'N/A'}</p>
                <p><strong>Lakkoofsota Filataman:</strong> <span style="color:#0284c7; font-weight:bold;">${t.ticket_numbers}</span></p>
                <p><strong>Haala (Status):</strong> <span style="color:${t.status === 'Approved' ? '#22c55e' : '#eab308'}; font-weight:bold;">${t.status}</span></p>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading tickets:", err);
    }
}

// 7. Load Winners
async function loadWinners() {
    try {
        const res = await fetch('/api/winners');
        const winners = await res.json();
        const container = document.getElementById('winners-container');
        if (!container) return;

        if (winners && winners.length > 0) {
            container.innerHTML = winners.map(w => `
                <div class="glass-card" style="margin-bottom:10px; padding:12px;">
                    <h4>🏆 ${w.winner_name}</h4>
                    <p>${w.prize_title}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align:center;">Mo\'attoonni hin labamne.</p>';
        }
    } catch (err) {
        console.error("Error loading winners:", err);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    detectLanguageFromURL();
    fetchSettings();

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', submitTicket);
    }
});