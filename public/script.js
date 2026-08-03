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
let ticketPrice = 200; // Default price

// Initialize Telegram WebApp Data
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.ready();
    tgApp.expand();
}

// Global User Info (Telegram ykn Guest)
const currentUser = {
    id: tgApp?.initDataUnsafe?.user?.id || 'guest_' + Date.now(),
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

// Detect language from URL parameter (eg: ?lang=am)
function detectLanguageFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && translations[langParam]) {
        changeLanguage(langParam);
    }
}

// 2. Navigation
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

    if (pageId === 'mytickets') loadUserTickets();
    if (pageId === 'winners') loadWinners();
}

function toggleTheme() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    document.body.setAttribute('data-theme', isLight ? '' : 'light');
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard: ' + text);
}

function calculateTotal() {
    const countInput = document.getElementById('ticket-count');
    const count = countInput ? countInput.value : 1;
    const totalElem = document.getElementById('total-cost');
    if (totalElem) {
        totalElem.innerText = count * ticketPrice;
    }
}

// 3. Fetch Settings & Countdown
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.ticket_price) {
            ticketPrice = data.ticket_price;
            calculateTotal();
        }
        if (data.end_date) {
            startCountdown(data.end_date);
        }
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

// 4. Ticket Submission (FIXED FOR MULTER FILE UPLOAD)
async function submitTicket(e) {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value;
    const phone = document.getElementById('phone').value;
    const ticketCount = document.getElementById('ticket-count').value;
    const screenshotInput = document.getElementById('screenshot');

    if (!screenshotInput.files || screenshotInput.files.length === 0) {
        alert("Maaloo suuraa/screenshot kaffaltii upload godhaa!");
        return;
    }

    // FormData fayyadamuu qabna file upload gochuuf
    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('username', currentUser.username);
    formData.append('fullname', fullname);
    formData.append('phone', phone);
    formData.append('ticket_numbers', ticketCount);
    formData.append('payment_method', 'CBE/Telebirr');
    formData.append('screenshot', screenshotInput.files[0]);

    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            body: formData // Header Content-Type browser offiisaan set godha
        });
        
        const data = await res.json();
        if (data.success) {
            alert('Tikettiin keessan milkaa\'inaan ergameera! Approval Admin eegaa.');
            navigateTo('mytickets');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        console.error("Ticket submission error:", err);
        alert("Server error uumameera. Deebitanii yaalaa.");
    }
}

// 5. Load My Tickets
async function loadUserTickets() {
    try {
        const res = await fetch('/api/tickets');
        const tickets = await res.json();
        const container = document.getElementById('tickets-list-container');
        if (!container) return;

        // User-id kanaan filter gochuu (yoo backend hunda deebise)
        const myTickets = tickets.filter(t => String(t.user_id) === String(currentUser.id) || !t.user_id);

        if (myTickets.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">Tikitii bitattan hin qabdan.</p>';
            return;
        }

        container.innerHTML = myTickets.map(t => `
            <div class="glass-card" style="margin-bottom:12px; padding:15px; border-radius:10px;">
                <p><strong>Ticket ID:</strong> #${t.id}</p>
                <p><strong>Name:</strong> ${t.fullname || 'N/A'}</p>
                <p><strong>Count:</strong> ${t.ticket_numbers}</p>
                <p><strong>Status:</strong> <span style="color:${t.status === 'Approved' ? '#22c55e' : '#eab308'}; font-weight:bold;">${t.status}</span></p>
                ${t.status === 'Approved' ? '<button class="primary-btn" style="margin-top:8px;" onclick="alert(\'Digital Pass Downloaded!\')">Download Pass 🎟️</button>' : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading tickets:", err);
    }
}

// 6. Load Winners (FIXED BUG)
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
            `).join(''); // FIXED: '.value' baddeera
        } else {
            container.innerHTML = '<p style="text-align:center;">Mo\'attoonni hin labamne.</p>';
        }
    } catch (err) {
        console.error("Error loading winners:", err);
    }
}

// 7. Admin Login (API Integration)
async function loginAdmin() {
    const usernameInput = document.getElementById('admin-user').value;
    const passwordInput = document.getElementById('admin-pass').value;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await res.json();
        if (data.success) {
            document.getElementById('admin-login-box').style.display = 'none';
            document.getElementById('admin-dashboard-content').style.display = 'block';
        } else {
            alert(data.message || 'Username ykn Password dogoggoraa!');
        }
    } catch (err) {
        console.error("Admin login error:", err);
    }
}

// 8. Admin Settings Save
async function saveAdminSettings() {
    const ticket_price = document.getElementById('setting-price')?.value;
    const max_tickets = document.getElementById('setting-max')?.value;
    const prize_1st = document.getElementById('setting-prize1')?.value;
    const prize_2nd = document.getElementById('setting-prize2')?.value;
    const end_date = document.getElementById('setting-enddate')?.value;

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_price, max_tickets, prize_1st, prize_2nd, end_date })
        });
        const data = await res.json();
        if (data.success) {
            alert('Settings saved successfully!');
            fetchSettings();
        }
    } catch (err) {
        console.error("Save settings error:", err);
    }
}

// 9. Export Tickets to CSV
function exportToExcel() {
    fetch('/api/tickets')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert('Tikeetiin galmaa\'e hin jiru!');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,ID,Full Name,Phone,Tickets Count,Payment Method,Status,Date\n";
            
            data.forEach(row => {
                let rowData = [
                    row.id,
                    `"${row.fullname || ''}"`,
                    `"${row.phone || ''}"`,
                    row.ticket_numbers,
                    `"${row.payment_method || ''}"`,
                    row.status,
                    `"${row.created_at || ''}"`
                ];
                csvContent += rowData.join(",") + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `lottery_tickets_export_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(err => {
            console.error('Error exporting data:', err);
            alert('Rakkoon uumame; irra deebi\'ii yaali.');
        });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    detectLanguageFromURL();
    fetchSettings();

    // Attach Form Submit Listener
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', submitTicket);
    }
});