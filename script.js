function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  
  // Convert 24-hour format to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  // Add leading zeros if values are less than 10
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;
  
  // Combine into final string
  const timeString = `${hours}:${minutes}:${seconds}`;
  
  // Update the HTML element
  document.getElementById('currentClock').textContent = timeString;
}

// Run immediately and update every second
updateClock();
setInterval(updateClock, 1000);

let countdownInterval = null;
let debounceTimer = null;

// Timer Elements
const hourInput = document.getElementById('inputHour');
const minuteInput = document.getElementById('inputMinute');
const timeDigits = document.getElementById('timeDigits');
const threshold1Field = document.getElementById('threshold1Field');
const threshold2Field = document.getElementById('threshold2Field');
const threshold3Field = document.getElementById('threshold3Field');

// URL Redirect Elements
const meetingUrlInput = document.getElementById('meetingUrlInput');
const clearUrlBtn = document.getElementById('clearUrlBtn');
const launchUrlBtn = document.getElementById('launchUrlBtn');
const autoRedirectCheck = document.getElementById('autoRedirectCheck');
const redirectStatus = document.getElementById('redirectStatus');

// Audio milestones tracking
let fired0 = false;
let fired1 = false;
let fired2 = false;
let fired3 = false;
let urlRedirectExecuted = false;

// Focus on hour input right away
hourInput.select();

/* Helper to normalize URL protocols (adds https:// if missing) */
function formatRedirectUrl(rawUrl) {
    let trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('msteams:')) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

/* Opens the URL in a new tab safely */
function openMeetingUrl(triggerReason) {
    const url = formatRedirectUrl(meetingUrlInput.value);
    if (!url) return false;

    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
        win.focus();
    }

    if (triggerReason === 'manual') {
        // If user jumped into the meeting early, uncheck auto-redirect so zero won't open a duplicate tab
        autoRedirectCheck.checked = false;
        redirectStatus.textContent = 'Opened early (auto-open disabled)';
        redirectStatus.className = 'redirect-status-badge opened';
    } else if (triggerReason === 'auto') {
        redirectStatus.textContent = 'Opened in new tab ✓';
        redirectStatus.className = 'redirect-status-badge active';
    }
    return true;
}

// Manual launch button clicked
launchUrlBtn.addEventListener('click', () => {
    if (meetingUrlInput.value.trim() === '') {
        meetingUrlInput.focus();
        return;
    }
    openMeetingUrl('manual');
});

// Clear button (✕)
clearUrlBtn.addEventListener('click', () => {
    meetingUrlInput.value = '';
    urlRedirectExecuted = false;
    redirectStatus.textContent = 'Ready';
    redirectStatus.className = 'redirect-status-badge';
    meetingUrlInput.focus();
});

// Enter key in meeting input launches immediately
meetingUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        openMeetingUrl('manual');
    }
});

// Update status text on toggle change or input
meetingUrlInput.addEventListener('input', () => {
    urlRedirectExecuted = false;
    updateRedirectStatusText();
});

autoRedirectCheck.addEventListener('change', () => {
    updateRedirectStatusText();
});

function updateRedirectStatusText() {
    if (!meetingUrlInput.value.trim()) {
        redirectStatus.textContent = 'Ready';
        redirectStatus.className = 'redirect-status-badge';
    } else if (autoRedirectCheck.checked) {
        redirectStatus.textContent = 'Auto-redirect enabled';
        redirectStatus.className = 'redirect-status-badge active';
    } else {
        redirectStatus.textContent = 'Auto-redirect off';
        redirectStatus.className = 'redirect-status-badge';
    }
}

function resetToIdle(displayDigits = "--:--:--") {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    fired0 = false;
    fired1 = false;
    fired2 = false;
    fired3 = false;
    urlRedirectExecuted = false;

    timeDigits.textContent = displayDigits;
    document.documentElement.style.setProperty('--status-color', 'var(--border-default)');
    document.title = "Countdown Widget";
}

function checkInputsValid() {
    const hVal = hourInput.value.trim();
    const mVal = minuteInput.value.trim();

    if (!/^\d+$/.test(hVal) || !/^\d{2}$/.test(mVal)) {
        return null;
    }

    const h = parseInt(hVal, 10);
    const m = parseInt(mVal, 10);

    if (h < 1 || h > 12) return null;
    if (m < 0 || m > 59) return null;

    return { h, m };
}

// Schedule timer start with 1.25s debounce
function scheduleCountdown() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    const valid = checkInputsValid();

    if (!valid) {
        resetToIdle("--:--:--");
        return;
    }

    // Stop any running interval during the 1.25s editing quiet period
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    timeDigits.textContent = "Setting...";
    document.documentElement.style.setProperty('--status-color', 'var(--border-default)');

    debounceTimer = setTimeout(() => {
        triggerCountdown();
    }, 1250);
}

// Input handler for Hours
    hourInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        const val = parseInt(this.value, 10);

        if ((val >= 2 && val <= 9) || (this.value.length === 2 && val <= 12)) {
            minuteInput.focus();
            minuteInput.select();
        } else if (val > 12) {
            this.value = '12';
            minuteInput.focus();
            minuteInput.select();
        }
        scheduleCountdown();
    });

    // Input handler for Minutes
    minuteInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        const val = parseInt(this.value, 10);

        if (val > 59) {
            this.value = '59';
        }
        scheduleCountdown();
    });

    // Threshold inputs live update handler
    [threshold1Field, threshold2Field, threshold3Field].forEach(field => {
        field.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            const valid = checkInputsValid();
            if (valid) {
                scheduleCountdown();
            }
        });
    });

    // Smart Jump-Back to Hour Input
    minuteInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && this.value === '') {
            hourInput.focus();
            hourInput.select();
        }
    });

    function triggerCountdown() {
    const valid = checkInputsValid();
    if (!valid) {
        resetToIdle("--:--:--");
        return;
    }

    const { h, m } = valid;

    // Reset audio and redirect flags whenever a new timer starts
    fired0 = false;
    fired1 = false;
    fired2 = false;
    fired3 = false;
    urlRedirectExecuted = false;

    if (countdownInterval) clearInterval(countdownInterval);

    const currentTime = new Date();
    const twelveHoursMs = 12 * 60 * 60 * 1000;

    // An input of H (1-12) corresponds to either (H % 12) or (H % 12) + 12 in 24-hr time
    const hour24A = h % 12;        // 0..11 (AM / Midnight)
    const hour24B = (h % 12) + 12; // 12..23 (PM / Noon)

    const candidates = [];
    // Test today and tomorrow for both hour options
    [0, 1].forEach(dayOffset => {
        [hour24A, hour24B].forEach(hourCandidate => {
            const d = new Date(currentTime);
            d.setDate(d.getDate() + dayOffset);
            d.setHours(hourCandidate, m, 0, 0);
            candidates.push(d);
        });
    });

    // Find the candidate strictly in the upcoming 12-hour window (0 < diff <= 12 hours)
    let targetDate = candidates.find(candidate => {
        const diff = candidate.getTime() - currentTime.getTime();
        return diff > 0 && diff <= twelveHoursMs;
    });

    // Fallback: If no candidate was within (0, 12h] (e.g., target time is right now), pick the next forward occurrence
    if (!targetDate) {
        const futureCandidates = candidates
            .filter(c => c.getTime() - currentTime.getTime() > 0)
            .sort((a, b) => a.getTime() - b.getTime());
        targetDate = futureCandidates[0] || candidates[0];
    }

    updateTimer(targetDate);
    countdownInterval = setInterval(() => updateTimer(targetDate), 1000);
}

let currentFaviconEmoji = '';

function setEmojiFavicon(emoji) {
    // Only update the DOM if the emoji actually changed
    if (currentFaviconEmoji === emoji) return;
    currentFaviconEmoji = emoji;

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function updateTimer(targetDate) {
    const currentTime = new Date();
    const timeDifference = targetDate - currentTime;

    const t1 = threshold1Field.value !== '' ? parseFloat(threshold1Field.value) : 30;
    const t2 = threshold2Field.value !== '' ? parseFloat(threshold2Field.value) : 15;
    const t3 = threshold3Field.value !== '' ? parseFloat(threshold3Field.value) : 5;

    const totalMinutes = timeDifference / (1000 * 60);
    const totalSeconds = Math.floor(timeDifference / 1000);

    if (timeDifference <= 0) {
        clearInterval(countdownInterval);
        timeDigits.textContent = "0:00:00";
        document.documentElement.style.setProperty('--status-color', 'var(--color-danger)');
        
        // Set warning emoji as favicon and clean up title
        setEmojiFavicon('⚠️');
        document.title = "Time's Up!";
        
        // Play sound once
        if (!fired0) {
            const beep0 = document.getElementById('beep0');
            if (beep0) beep0.play().catch(e => console.log("Audio play blocked:", e));
            fired0 = true;
        }

        // Auto redirect if enabled and URL present
        if (!urlRedirectExecuted && autoRedirectCheck.checked && meetingUrlInput.value.trim() !== '') {
            urlRedirectExecuted = true;
            openMeetingUrl('auto');
        }
        return;
    }

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const displayTime = [
        String(hrs),
        String(mins).padStart(2, '0'),
        String(secs).padStart(2, '0')
    ].join(':');

    timeDigits.textContent = displayTime;

    let statusColor = 'var(--border-default)';
    let emoji = '⬛';

    if (totalMinutes > t1) {
        statusColor = 'var(--border-default)';
    emoji = '⚪';
    } else if (totalMinutes <= t1 && totalMinutes > t2) {
        statusColor = 'var(--color-safe)';
        emoji = '🟢';
    } else if (totalMinutes <= t2 && totalMinutes > t3) {
        statusColor = 'var(--color-warning)';
        emoji = '🟡';
    } else if (totalMinutes <= t3) {
        statusColor = 'var(--color-danger)';
        emoji = '🔴';
    }

    document.documentElement.style.setProperty('--status-color', statusColor);

    // Update Favicon with Emoji Circle and Tab Title with Countdown only
    setEmojiFavicon(emoji);
    document.title = displayTime;

    // Audio triggers check (exact hit within a 5-second margin window)
    const t1Seconds = t1 * 60;
    const t2Seconds = t2 * 60;
    const t3Seconds = t3 * 60;

    if (totalSeconds <= t1Seconds && totalSeconds > t1Seconds - 5 && !fired1) {
        const b1 = document.getElementById('beep1');
        if (b1) b1.play().catch(e => console.log("Audio play blocked:", e));
        fired1 = true;
    }
    if (totalSeconds <= t2Seconds && totalSeconds > t2Seconds - 5 && !fired2) {
        const b2 = document.getElementById('beep2');
        if (b2) b2.play().catch(e => console.log("Audio play blocked:", e));
        fired2 = true;
    }
    if (totalSeconds <= t3Seconds && totalSeconds > t3Seconds - 5 && !fired3) {
        const b3 = document.getElementById('beep3');
        if (b3) b3.play().catch(e => console.log("Audio play blocked:", e));
        fired3 = true;
    }
}