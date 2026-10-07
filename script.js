/* ─── AUDIO CONTEXT ──────────────────────────────────────────── */
let audioCtx = null;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

/* ─── SYNTHETIC SOUNDS ──────────────────────────────────────── */

// Wax crack — short high-freq burst
function playCrackSound() {
    initAudioContext();
    const dur = 0.09;
    const sr = audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    src.start();
}

// Paper slide — bandpass brown noise sweep
function playPaperSlide() {
    initAudioContext();
    const dur = 2.2;
    const sr = audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.05 * white) / 1.05;
        data[i] = last;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(1400, audioCtx.currentTime + dur);
    filter.Q.value = 1.8;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    src.start();
}

/* ─── MUSIC CONTROLLER (removed — audio widget deleted) ─────── */

/* ─── GOLD PARTICLE CANVAS ───────────────────────────────────── */
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function spawnParticle(x, y, burst) {
    const speed = burst
        ? (Math.random() * 5 + 2)
        : (Math.random() * 0.8 + 0.2);
    const angle = burst
        ? Math.random() * Math.PI * 2
        : -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
    return {
        x: x !== undefined ? x : Math.random() * canvas.width,
        y: y !== undefined ? y : Math.random() * canvas.height + 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: burst ? 1 : Math.random() * 0.7 + 0.15,
        size: burst ? (Math.random() * 5 + 2) : (Math.random() * 3 + 1),
        decay: burst ? 0.025 : 0.003,
        phase: Math.random() * Math.PI * 2,
        lifetime: 0,
    };
}

// Seed ambient particles
for (let i = 0; i < 55; i++) particles.push(spawnParticle());

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter(p => p.alpha > 0.01);

    // Replenish ambient
    while (particles.filter(p => !p.burst).length < 55) {
        particles.push(spawnParticle());
    }

    particles.forEach(p => {
        p.lifetime++;
        p.x += p.vx + Math.sin(p.phase + p.lifetime * 0.03) * 0.35;
        p.y += p.vy;
        p.alpha -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grd.addColorStop(0, '#FCF6BA');
        grd.addColorStop(.5, '#BF953F');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#BF953F';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Recycle ambient particles that go off screen
        if (!p.burst && p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
            p.alpha = Math.random() * 0.6 + 0.15;
        }
    });

    requestAnimationFrame(animateParticles);
}
requestAnimationFrame(animateParticles);


/* ─── LOCATION JOURNEY — SCROLL-DRIVEN S-CURVE ANIMATION ─── */
(function initJourneyPath() {
    const section = document.getElementById('location-journey');
    const wrap = document.getElementById('journey-track-wrap');
    const track = document.getElementById('journey-track');
    const dot = document.getElementById('journey-dot');
    const dotGlow = document.getElementById('journey-dot-glow');
    const rows = document.querySelectorAll('.j-row');

    if (!section || !track) return;

    let pathLength = 0;

    function setupPath() {
        try {
            pathLength = track.getTotalLength();
            track.style.strokeDasharray = pathLength;
            track.style.strokeDashoffset = pathLength;
        } catch (e) {
            console.warn('SVG path length setup delayed:', e);
        }
        onScroll();
    }

    function onScroll() {
        if (!wrap || pathLength === 0) return;

        const wrapRect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const wrapH = wrap.offsetHeight;

        const raw = 1 - (wrapRect.bottom - vh * 0.25) / (wrapH + vh * 0.5);
        const progress = Math.min(1, Math.max(0, raw));

        const drawLength = pathLength * progress;
        track.style.strokeDashoffset = pathLength - drawLength;

        if (dot && dotGlow) {
            try {
                const pt = track.getPointAtLength(drawLength);
                dot.setAttribute('cx', pt.x);
                dot.setAttribute('cy', pt.y);
                dotGlow.setAttribute('cx', pt.x);
                dotGlow.setAttribute('cy', pt.y);
            } catch (e) { }
        }

        rows.forEach((row, i) => {
            const threshold = (i * 0.18);
            if (progress >= threshold) {
                row.classList.add('visible');
            }
        });
    }

    requestAnimationFrame(setupPath);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', setupPath, { passive: true });
})();

/* ─── ENVELOPE SPLIT OPEN ANIMATION ─────────────────────────── */
const envOverlay = document.getElementById('envelope-overlay');
const envTop = document.getElementById('env-top-wrapper');
const envBottom = document.getElementById('env-bottom');
const waxSeal = document.getElementById('wax-seal');
const extSection = document.getElementById('invitation-page');

let opened = false;

envOverlay.addEventListener('click', () => {
    if (opened) return;
    opened = true;

    // Immediately reveal invitation content behind splitting envelope
    extSection.classList.add('active');

    // Get seal position for burst
    const rect = waxSeal.getBoundingClientRect();
    const sealX = rect.left + rect.width / 2;
    const sealY = rect.top + rect.height / 2;

    // 1. Sounds
    initAudioContext();
    playCrackSound();
    setTimeout(playPaperSlide, 100);

    // 2. Burst of gold particles from seal
    for (let i = 0; i < 45; i++) {
        const p = spawnParticle(
            sealX + (Math.random() - .5) * 20,
            sealY + (Math.random() - .5) * 20,
            true
        );
        p.burst = true;
        particles.push(p);
    }

    // 3. Wax seal fades out smoothly
    gsap.to(waxSeal, {
        scale: 1.1,
        opacity: 0,
        duration: 0.6,
        ease: 'power1.out',
    });

    // 4. TOP PANEL — slides upward slowly and gracefully
    gsap.to(envTop, {
        y: '-100%',
        duration: 2.2,
        delay: 0.1,
        ease: 'power2.inOut',
    });

    // 5. BOTTOM PANEL — slides downward slowly and gracefully
    gsap.to(envBottom, {
        y: '100%',
        duration: 2.2,
        delay: 0.1,
        ease: 'power2.inOut',
    });

    // 6. OVERLAY — fade out overlay to complete transition
    gsap.to(envOverlay, {
        opacity: 0,
        duration: 1.2,
        delay: 1.3,
        ease: 'power2.inOut',
        onComplete: () => {
            envOverlay.style.pointerEvents = 'none';
            envOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
});

/* ─── SCROLL-REVEAL FOR EXTENDED SECTIONS ────────────────────── */
function setupScrollReveals() {
    if (!window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('.extended-section').forEach(el => {
        ScrollTrigger.create({
            trigger: el,
            start: 'top 82%',
            onEnter: () => el.classList.add('reveal'),
        });
    });
}

/* ─── COUNTDOWN TIMER ─────────────────────────────────────────── */
function updateCountdown() {
    const wedding = new Date('2026-10-18T14:00:00');
    const now = new Date();
    const diff = wedding - now;

    if (diff <= 0) {
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById('days').textContent = String(d).padStart(2, '0');
    document.getElementById('hours').textContent = String(h).padStart(2, '0');
    document.getElementById('minutes').textContent = String(m).padStart(2, '0');
    document.getElementById('seconds').textContent = String(s).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ─── RSVP FORM HANDLER ──────────────────────────────────────── */
function handleRSVPSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('rsvp-name').value.trim();
    const attending = document.querySelector('input[name="attendance"]:checked')?.value === 'attending';
    const overlay = document.getElementById('rsvp-success-overlay');
    const msg = document.getElementById('success-message');

    const template = attending
        ? (i18nData[currentLang]?.rsvp_success_attending || `Wonderful, ${name}! We're so excited to have you join us on October 18th.`)
        : (i18nData[currentLang]?.rsvp_success_declining || `We'll miss you dearly, ${name}. Thank you for letting us know.`);

    msg.textContent = template.replace('{name}', name);
    overlay.classList.add('active');
}

/* ─── THANK YOU CARD — INSTANT DOWNLOAD BOTH IMAGES ─────────────── */
function downloadThankyouCards() {
    const btn = document.getElementById('ty-download-all');
    if (!btn) return;

    // Button loading state feedback
    const origHTML = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px;animation:spin 1s linear infinite;">
        <path d="M10 2v11M6 9l4 4 4-4M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>
        Downloading…`;
    btn.disabled = true;

    // Convert an <img> element into a base64 Data URL so browser forces download instead of opening image
    function getCanvasDataUrl(imgElement) {
        try {
            if (!imgElement) return null;
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth || 1200;
            canvas.height = imgElement.naturalHeight || 1800;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.95);
        } catch (e) {
            return null;
        }
    }

    // Trigger instant programmatic download via anchor click
    function triggerDownload(dataUrlOrPath, filename) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUrlOrPath;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
        }, 500);
    }

    const img1 = document.getElementById('tycard-img-1');
    const img2 = document.getElementById('tycard-img-2');

    const dataUrl1 = getCanvasDataUrl(img1);
    const dataUrl2 = getCanvasDataUrl(img2);

    // Download Front card (Card 1) instantly
    triggerDownload(dataUrl1 || 'ThankyouCard1.jpg', 'ThankYouCard_Front.jpg');

    // Download Back card (Card 2) after brief delay
    setTimeout(() => {
        triggerDownload(dataUrl2 || 'ThankyouCard2.jpg', 'ThankYouCard_Back.jpg');

        setTimeout(() => {
            btn.innerHTML = origHTML;
            btn.disabled = false;
        }, 500);
    }, 400);
}

/* ─── INTERNATIONALIZATION (I18N) ───────────────────────────── */
const i18nData = {
    en: {
        groom_name: "Nahom",
        bride_name: "Meklit",
        couple_names: "Nahom &amp; Meklit",
        envelope_sub: "You're Invited to Celebrate The Wedding Of",
        invitation_body: "With grateful hearts and joyful spirits, we warmly invite you to celebrate the beginning of our forever. Together with our families",
        std_main_title: "SAVE THE DATES",
        std_main_desc: 'Together with our families, we invite you to celebrate our marriage on <strong>October 18, 2026</strong> at International Evangelical Church, Addis Ababa.',
        cal_month: "OCTOBER 2026",
        cal_mo: "Mo",
        cal_tu: "Tu",
        cal_we: "We",
        cal_th: "Th",
        cal_fr: "Fr",
        cal_sa: "Sa",
        cal_su: "Su",
        days: "Days",
        hours: "Hrs",
        minutes: "Mins",
        seconds: "Secs",
        program_title: "Our Church Program of the Day",
        p1_title: "Guest Gathering",
        p1_time: "10:30 AM",
        p1_desc: "Welcome drinks & joyful reunions",
        p2_title: "Vow Ceremony",
        p2_time: "11:30 AM",
        p2_desc: "A beautiful celebration of love, faith & commitment",
        p3_title: "Grand Farewell",
        p3_time: "1:30 PM",
        p3_desc: "As our beautiful celebration comes to a joyful close",
        program_venue_title: "Event Location",
        program_venue_desc: 'Our wedding ceremony will be held at:<br><strong>International Evangelical Church</strong><br>Addis Ababa, Ethiopia',
        program_route_btn: "GET DIRECTIONS",
        journey_sub_title: "Our Day Journey",
        journey_schedule_label: "OCTOBER 18, 2026  PROGRAM SCHEDULE",
        j1_title: "HIS HOUSE",
        j1_time: "8:00 AM",
        j1_desc: "The groom prepares to begin",
        j2_title: "HER HOUSE",
        j2_time: "9:00 AM",
        j2_desc: "The bride gets ready to say “I do.”",
        j3_title: "CHURCH CEREMONY",
        j3_time: "11:00 AM",
        j3_desc: "Together with our families and loved ones",
        j4_title: "GARDEN PHOTOSHOOT",
        j4_time: "2:30 PM",
        j4_desc: "After the ceremony, we capture beautiful memories",
        j5_title: "DINNER & CELEBRATION",
        j5_time: "5:30 PM",
        j5_desc: "Join us as we gather for an evening celebration",
        venue_title: "The Venue",
        venue_name: "International Evangelical Church",
        venue_address: "Addis Ababa, Ethiopia",
        dresscode_title: "Dress Code",
        dresscode_desc: 'We kindly request <strong>Formal / Black Tie Elegant</strong> attire. Please complement our palette:',
        color_white: "White",
        color_sage: "Sage Green",
        rsvp_title: "Kindly RSVP",
        rsvp_subtitle: "Please respond by September 18, 2026",
        label_fullname: "Full Name",
        label_email: "Email Address",
        radio_accepts: "Joyfully Accepts",
        radio_declines: "Regretfully Declines",
        option_1guest: "1 Guest",
        option_2guests: "2 Guests (Maximum)",
        label_guests: "Number of Guests",
        label_wishes: "Wishes / Dietary Notes",
        rsvp_submit: "Send Response",
        rsvp_success_title: "Thank You!",
        rsvp_success_attending: "Wonderful, {name}! We're so excited to have you join us on October 18th.",
        rsvp_success_declining: "We'll miss you dearly, {name}. Thank you for letting us know.",
        thankyou_title: "Thank You Card",
        thankyou_subtitle: "A small token of our gratitude — print or share with love",
        thankyou_btn: "Download Thank You Card",
        closing_love: "With Love,",
        closing_address: "Addis Ababa · Ethiopia",
        wax_title: "Click to open"
    },
    am: {
        groom_name: "ናሆም",
        bride_name: "መክሊት",
        couple_names: "ናሆም እና መክሊት",
        envelope_sub: "ለሰርጋችን በደስታ ተጋብዘዋል",
        invitation_body: "በምስጋና አምላካችን እና በታላቅ ደስታ የዘላለም ጉዞአችንን መጀመሪያ ከቤተሰቦቻችን ጋር አብረው እንዲያከብሩ በክብር እና በደስታ ጋብዘዎታል።",
        std_main_title: "ቀኑን ይያዙ",
        std_main_desc: 'ከቤተሰቦቻችን ጋር በመሆን በጥቅምት 8 ቀን 2019 ዓ.ም በኢንተርናሽናል ኢቫንጄሊካል ቤተክርስቲያን (አዲስ አበባ) የሚከናወነውን የጋብቻ ሥነ-ሥርዓታችንን አብረውን እንዲያከብሩ እንጋብዛቸዋለን።',
        cal_month: "ጥቅምት 2019",
        cal_mo: "ሰኞ",
        cal_tu: "ማክ",
        cal_we: "ረቡ",
        cal_th: "ሐሙ",
        cal_fr: "አርብ",
        cal_sa: "ቅዳ",
        cal_su: "እሁ",
        days: "ቀናት",
        hours: "ሰዓታት",
        minutes: "ደቂቃዎች",
        seconds: "ሴኮንዶች",
        program_title: "የቤተክርስቲያን መርሃ ግብራችን",
        p1_title: "የእንግዶች አቀባበል",
        p1_time: "4:30 ጠዋት",
        p1_desc: "የመጠጥ አቀባበል እና ደስ የሚል ውይይት",
        p2_title: "የቃል ኪዳን ሥነ-ሥርዓት",
        p2_time: "5:30 ጠዋት",
        p2_desc: "የፍቅር፣ የእምነት እና የቃል ኪዳን ደማቅ በዓል",
        p3_title: "የመዝጊያ ምስጋና",
        p3_time: "7:30 ከሰዓት",
        p3_desc: "ደስ የሚለው በዓላችን በደስታና በፍቅር የሚጠናቀቅበት",
        program_venue_title: "የበዓሉ ቦታ",
        program_venue_desc: 'የሰርግ ሥነ-ሥርዓታችን የሚከበረው በ፡<br><strong>ኢንተርናሽናል ኢቫንጄሊካል ቤተክርስቲያን</strong><br>አዲስ አበባ፣ ኢትዮጵያ',
        program_route_btn: "አቅጣጫ ይመልከቱ",
        journey_sub_title: "የዕለቱ የጉዞ መርሃ ግብር",
        journey_schedule_label: "ጥቅምት 8, 2019  የመርሃ ግብር ሰሌዳ",
        j1_title: "የሙሽራው ቤት",
        j1_time: "2:00 ጠዋት",
        j1_desc: "ሙሽራው ለበዓሉ የሚዘጋጅበት",
        j2_title: "የሙሽሪት ቤት",
        j2_time: "3:00 ጠዋት",
        j2_desc: "ሙሽሪት ዝግጅቷን የምታጠናቅቅበት",
        j3_title: "የቤተክርስቲያን ሥነ-ሥርዓት",
        j3_time: "5:00 ጠዋት",
        j3_desc: "ከቤተሰቦቻችን እና ከተወደዱ ወዳጆቻችን ጋር",
        j4_title: "የፎቶ ፕሮግራም",
        j4_time: "8:30 ከሰዓት",
        j4_desc: "ከሥነ-ሥርዓቱ በኋላ የሚደረግ የትዝታ ፎቶ",
        j5_title: "የምሽት ግብዣ",
        j5_time: "11:30 ምሽት",
        j5_desc: "በምሽቱ ደማቅ ግብዣ ላይ አብረውን ይሁኑ",
        venue_title: "የበዓሉ ቦታ",
        venue_name: "ኢንተርናሽናል ኢቫንጄሊካል ቤተክርስቲያን",
        venue_address: "አዲስ አበባ፣ ኢትዮጵያ",
        dresscode_title: "የአለባበስ ሥርዓት",
        dresscode_desc: 'በክብር የምንጠይቀው <strong>ፎርማል / የክብር አልባሳት</strong> እንዲለብሱ ነው። እባክዎን የሰርጋችንን ቀለማት ይከተሉ፡',
        color_white: "ነጭ",
        color_sage: "ሴጅ አረንጓዴ",
        rsvp_title: "እባክዎን ማረጋገጫ ይስጡን",
        rsvp_subtitle: "እባክዎን እስከ መስከረም 8, 2019 ያረጋግጡ",
        label_fullname: "ሙሉ ስም",
        label_email: "ኢሜይል አድራሻ",
        radio_accepts: "በደስታ እገኛለሁ",
        radio_declines: "በምክንያት አልገኝም",
        option_1guest: "1 እንግዳ",
        option_2guests: "2 እንግዶች (ከፍተኛ)",
        label_guests: "የእንግዶች ብዛት",
        label_wishes: "ምኞት / ልዩ አስተያየት",
        rsvp_submit: "መልስ ላክ",
        rsvp_success_title: "እናመሰግናለን!",
        rsvp_success_attending: "በጣም ደስ ብሎናል፣ {name}! በጥቅምት 8 ቀን አብረውን ስለሚሆኑ በደስታ እንጠብቃችኋለን።",
        rsvp_success_declining: "ስላልተገኙ እናዝናለን፣ {name}። ስላሳወቁን እናመሰግናለን።",
        thankyou_title: "የምስጋና ካርድ",
        thankyou_subtitle: "የምስጋናችን መግለጫ — ያውርዱ ወይም ያጋሩ",
        thankyou_btn: "የምስጋና ካርድ አውርድ",
        closing_love: "በፍቅር፣",
        closing_address: "አዲስ አበባ · ኢትዮጵያ",
        wax_title: "ለመክፈት ይጫኑ"
    }
};

let currentLang = localStorage.getItem('wedding_invitation_lang') || 'en';

function setLanguage(lang) {
    if (!i18nData[lang]) return;
    currentLang = lang;
    localStorage.setItem('wedding_invitation_lang', lang);

    if (lang === 'am') {
        document.body.classList.add('lang-am');
        document.documentElement.lang = 'am';
    } else {
        document.body.classList.remove('lang-am');
        document.documentElement.lang = 'en';
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nData[lang][key]) {
            el.innerHTML = i18nData[lang][key];
        }
    });

    const waxSealEl = document.getElementById('wax-seal');
    if (waxSealEl && i18nData[lang].wax_title) {
        waxSealEl.setAttribute('title', i18nData[lang].wax_title);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
    setLanguage(currentLang);
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setLanguage(currentLang);
}