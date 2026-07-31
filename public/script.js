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

function changeLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.glass-nav button').forEach(b => b.classList.remove('active'));
    event && event.currentTarget && event.currentTarget.classList.add('active');

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
    const count = document.getElementById('ticket-count').value;
    document.getElementById('total-cost').innerText = count * 200;
}

// Fetch Settings & Countdown
async function fetchSettings() {
    const res = await fetch('/api/settings');
    const data = await res.json();
    startCountdown(data.end_date);
}

function startCountdown(endDate) {
    const target = new Date(endDate).getTime();
    setInterval(() => {
        const now = new Date().getTime();
        const diff = target - now;
        if (diff > 0) {
            document.getElementById('days').innerText = Math.floor(diff / (1000 * 60 * 60 * 24));
            document.getElementById('hours').innerText = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            document.getElementById('mins').innerText = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('secs').innerText = Math.floor((diff % (1000 * 60)) / 1000);
        }
    }, 1000);
}

async function submitTicket(e) {
    e.preventDefault();
    const payload = {
        user_id: "user_telegram_123",
        username: "TelegramUser",
        fullname: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        ticket_numbers: document.getElementById('ticket-count').value,
        payment_method: "CBE/Telebirr",
        screenshot: document.getElementById('screenshot').value
    };

    const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        alert('Ticket submitted successfully! Pending approval.');
        navigateTo('mytickets');
    }
}

async function loadUserTickets() {
    const res = await fetch('/api/tickets');
    const tickets = await res.json();
    const container = document.getElementById('tickets-list-container');
    container.innerHTML = tickets.map(t => `
        <div class="glass-card" style="margin-bottom:10px;">
            <p><strong>Ticket ID:</strong> #${t.id}</p>
            <p><strong>Name:</strong> ${t.fullname}</p>
            <p><strong>Count:</strong> ${t.ticket_numbers}</p>
            <p><strong>Status:</strong> <span style="color:${t.status==='Approved'?'#22c55e':'#eab308'}">${t.status}</span></p>
            ${t.status === 'Approved' ? '<button class="primary-btn" style="margin-top:8px;" onclick="alert(\'Digital Pass Downloaded!\')">Download Pass 🎟️</button>' : ''}
        </div>
    `).join('');
}

async function loadWinners() {
    const res = await fetch('/api/winners');
    const winners = await res.json();
    const container = document.getElementById('winners-container');
    container.innerHTML = winners.length ? winners.map(w => `
        <div class="glass-card">
            <h4>🏆 ${w.winner_name}</h4>
            <p>${w.prize_title}</p>
        </div>
    `).value : '<p>No winners announced yet.</p>';
}

function loginAdmin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    if (u === 'admin' && p === '1234') {
        document.getElementById('admin-login-box').style.display = 'none';
        document.getElementById('admin-dashboard-content').style.display = 'block';
    } else {
        alert('Invalid credentials');
    }
}

async function saveAdminSettings() {
    alert('Settings saved successfully!');
}

fetchSettings();

// Admin-ni tikeetoota hunda gara Excel/CSV file-tti jijjiiree download akka godhu
function exportToExcel() {
    fetch('/api/tickets')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert('Tikeetiin galmaa\'e hin jiru!');
                return;
            }

            // CSV Header (Maqaawwan kolonii)
            let csvContent = "data:text/csv;charset=utf-8,ID,Full Name,Phone,Tickets Count,Payment Method,Status,Date\n";
            
            // Data hunda row-dhaan dabaluu
            data.forEach(row => {
                let rowData = [
                    row.id,
                    `"${row.fullname}"`,
                    `"${row.phone}"`,
                    row.ticket_numbers,
                    `"${row.payment_method}"`,
                    row.status,
                    `"${row.created_at}"`
                ];
                csvContent += rowData.join(",") + "\n";
            });

            // File-icha qopheessuu fi download gochuu
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
            alert('Rakkoon uumame; irra deebi'ii yaali.');
        });
}