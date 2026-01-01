(function() {
    /* =========================================
       1. CONFIGURATION
    ========================================= */
    const STORAGE_KEY = 'system_warning_consent'; 
    const SCROLL_THRESHOLD = 10; 

    const phrases = [
        // English
        "STOP", "DON'T TOUCH", "NO!", "YAMETEEEEEE!", 
        "DAME!", "BAKA!", "ERROR", "FATAL", "FORBIDDEN",
        "ASU", "KYAAAAA!", "ANJING", "BUTO", "BABI", "PUKIMAK", "ANJING",
        
        // Japanese
        "やめて!",      // Stop!
        "触らないで!",  // Don't touch!
        "ダメ!",       // No/Bad!
        "うるさい!",    // Shut up/Noisy!
        "警告",        // Warning
        "エラー",      // Error
        
        // Chinese
        "不要!",       // Don't!
        "禁止",        // Forbidden
        "错误",        // Error
        "停下",        // Stop
        "住手",        // Stop your hand
        "别碰"         // Don't touch 
    ];

    const audioSources = [
        'intro1.mp3', 'intro2.mp3', 'intro3.mp3', 'intro4.mp3', 'intro5.mp3', 'intro6.mp3', 'intro7.mp3', 'intro8.mp3'
    ];

    const VOLUME_GAIN = 5.0; 
    const AUDIO_LAYERS = 3; 

   /* =========================================
       1.5. PREVENT TAB CLOSE (With Link Exception)
    ========================================= */
    let bypassWarning = false;

    // 1. Detect if the user clicked a link
    window.addEventListener('click', (e) => {
        // If the click is on an <a> tag (or inside one)
        if (e.target.closest('a')) {
            bypassWarning = true;
            
            // Safety: Re-enable the warning after 1 second 
            // (in case the link didn't actually leave the page, e.g. anchor links #)
            setTimeout(() => {
                bypassWarning = false;
            }, 1000);
        }
    });

    // 2. Trigger the browser warning unless it was a link
    window.addEventListener('beforeunload', (e) => {
        if (!bypassWarning) {
            e.preventDefault(); 
            e.returnValue = ''; 
        }
    });
   
    /* =========================================
       2. STATE MANAGEMENT
    ========================================= */
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; 
    let isAccepted = false; 
    let areAssetsLoaded = false; 
    let lastAudioIndex = -1;

    let touchStartX = 0;
    let touchStartY = 0;

    const hasPriorConsent = localStorage.getItem(STORAGE_KEY) === 'true';

    /* =========================================
       3. UI & CSS INJECTION
    ========================================= */
    const style = document.createElement('style');
    style.innerHTML = `
        /* Overlay styles */
        #consent-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            background-color: rgba(0, 0, 0, 0.4); 
            z-index: 2147483646;
            display: flex; align-items: flex-end; justify-content: center;
            padding-bottom: 50px; opacity: 1; transition: opacity 0.3s ease-out;
        }
        #consent-box {
            background-color: #3a3a3a; color: #fff;
            width: 90%; max-width: 900px; padding: 20px;
            border: 4px solid #000;
            box-shadow: inset 4px 4px 0 rgba(255,255,255,0.1), inset -4px -4px 0 rgba(0,0,0,0.2), 0 10px 25px rgba(0,0,0,0.5);   
            display: flex; align-items: center; justify-content: space-between;
            gap: 20px; font-family: 'VT323', monospace;
        }
        .consent-text h3 { margin: 0; color: #ff6ec7; font-size: 1.8rem; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
        .consent-text p { margin: 5px 0 0 0; font-size: 1.2rem; color: #ccc; }
        #loading-status { color: #ff92df; font-weight: bold; }

        .btn-group { display: flex; gap: 10px; }
        .mc-btn {
            background: #000; color: #fff; border: 2px solid #fff;
            padding: 10px 20px; font-family: inherit; font-size: 1.2rem;
            cursor: pointer; text-transform: uppercase;
        }
        .mc-btn:hover:not(:disabled) { background: #fff; color: #000; }
        .mc-btn:disabled { opacity: 0.5; cursor: wait; }
        
        /* Main Warning Flash (Magenta) */
        #warning-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(242, 0, 255, 1); 
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            color: #ffffff; display: flex; justify-content: center; align-items: center;
            z-index: 2147483647; pointer-events: none; opacity: 0;
            transition: opacity 0.05s ease-out; 
        }
        
        /* PRE-FLASH (HDR P3 White) */
        #hdr-pre-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: white; 
            background-color: color(display-p3 1 1 1); 
            z-index: 2147483648; 
            pointer-events: none; opacity: 0;
            transition: none;
            mix-blend-mode: normal;
        }

        #warning-text {
            font-family: 'VT323', monospace; font-size: 6rem;
            font-weight: 900; text-transform: uppercase;
            text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 4px 4px 0px #000;
            animation: shake 0.1s infinite;
        }
        @media (max-width: 600px) {
            #consent-box { flex-direction: column; text-align: center; }
            .btn-group { width: 100%; flex-direction: column; }
            #consent-box button { width: 100%; }
        }
        @keyframes shake {
            0% { transform: translate(2px, 2px) rotate(0deg); }
            100% { transform: translate(-2px, -2px) rotate(-2deg); }
        }
    `;
    document.head.appendChild(style);

    const preFlashOverlay = document.createElement('div');
    preFlashOverlay.id = 'hdr-pre-flash';
    document.body.appendChild(preFlashOverlay);

    const flashOverlay = document.createElement('div');
    flashOverlay.id = 'warning-flash';
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    flashOverlay.appendChild(textSpan);
    document.body.appendChild(flashOverlay);

    const consentOverlay = document.createElement('div');
    consentOverlay.id = 'consent-overlay';
    
    if (hasPriorConsent) {
        consentOverlay.style.display = 'none';
        isAccepted = true; 
    }

    consentOverlay.innerHTML = `
        <div id="consent-box">
            <div class="consent-text">
                <h3>₊˚⊹ᰔ✨ Consent notices</h3>
                <p>Contents might be unsuitable for individuals with epileptic photosensitivity and the reader understands this risk, otherwise will be punished.</p>
                <p id="loading-status">Loading Assets...</p>
            </div>
            <div class="btn-group">
                <button id="decline-btn" class="mc-btn" disabled>DECLINE</button>
                <button id="accept-btn" class="mc-btn" disabled>INITIALIZING</button>
            </div>
        </div>
    `;
    document.body.appendChild(consentOverlay);

    /* =========================================
       4. AUDIO ENGINE (Web Audio API)
    ========================================= */
    async function initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        const acceptBtn = document.getElementById('accept-btn');
        const declineBtn = document.getElementById('decline-btn');
        const loadText = document.getElementById('loading-status');

        try {
            const fetchPromises = audioSources.map(src => fetch(src));
            const responses = await Promise.all(fetchPromises);
            const bufferPromises = responses.map(res => res.arrayBuffer());
            const arrayBuffers = await Promise.all(bufferPromises);
            const decodePromises = arrayBuffers.map(buf => audioContext.decodeAudioData(buf));
            
            audioBuffers = await Promise.all(decodePromises);
            areAssetsLoaded = true;

            loadText.innerText = "Assets Loaded. Choose an option.";
            acceptBtn.innerText = "ACCEPT";
            
            // Enable both buttons
            acceptBtn.disabled = false;
            declineBtn.disabled = false;
            
            // --- ACCEPT LOGIC ---
            acceptBtn.addEventListener('click', () => {
                if (audioContext.state === 'suspended') audioContext.resume();
                localStorage.setItem(STORAGE_KEY, 'true');

                consentOverlay.style.opacity = '0';
                setTimeout(() => {
                    consentOverlay.style.display = 'none';
                    isAccepted = true;
                }, 300);
            });

            // --- DECLINE LOGIC (CHAOS MODE) ---
            declineBtn.addEventListener('click', async () => {
                // NOTE: We do NOT set bypassWarning = true here yet.
                // This ensures that if the user tries to close the tab during the 
                // flashing sequence, the browser prompt will still appear.

                // 1. Reset Storage
                localStorage.removeItem(STORAGE_KEY);
                
                // 2. Ensure audio is unlocked
                if (audioContext.state === 'suspended') await audioContext.resume();

                // 3. Disable buttons
                acceptBtn.disabled = true;
                declineBtn.disabled = true;
                
                // 4. Trigger Chaos Loop (Strobe)
                const intervalId = setInterval(() => {
                    // Pass 'true' to force trigger even if playing/not accepted
                    triggerWarning(null, true); 
                }, 100); 

                // 5. Reload after 3 seconds
                setTimeout(() => {
                    clearInterval(intervalId);
                    
                    // Allow the reload to happen without prompt
                    bypassWarning = true; 
                    
                    location.reload();
                }, 3000);
            });

        } catch (error) {
            loadText.innerText = "Failed to load audio.";
            console.error(error);
        }
    }

    function playSound(buffer) {
        if (!audioContext) return;
        for (let i = 0; i < AUDIO_LAYERS; i++) {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            const gainNode = audioContext.createGain();
            gainNode.gain.value = VOLUME_GAIN; 
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start(0);
            if (i === AUDIO_LAYERS - 1) {
                source.onended = () => { isPlaying = false; };
            }
        }
    }

    /* =========================================
       5. TRIGGER LOGIC
    ========================================= */
    // Added 'force' param to bypass checks for the decline button chaos
    async function triggerWarning(e, force = false) {
        
        // If it's a normal trigger (not forced), apply standard checks
        if (!force) {
            if (!isAccepted || !areAssetsLoaded || isPlaying) return; 
            if (e && e.target && e.target.closest('#consent-overlay')) return;
            if (e && e.target && e.target.closest('a')) return;
        }

        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Only set locking flag if not in force mode (chaos mode ignores locks)
        if (!force) isPlaying = true; 

        // --- STEP 1: PRE-FLASH (T = 0ms) ---
        preFlashOverlay.style.opacity = '1';

        // --- STEP 2: MAIN EXECUTION (T = 5ms) ---
        setTimeout(() => {
            textSpan.innerText = phrases[Math.floor(Math.random() * phrases.length)];
            flashOverlay.style.opacity = '1';

            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * audioBuffers.length);
            } while (newIndex === lastAudioIndex && audioBuffers.length > 1);
            lastAudioIndex = newIndex;

            if (audioBuffers[newIndex]) {
                playSound(audioBuffers[newIndex]);
            } else {
                isPlaying = false;
            }

            // Cleanup visuals
            setTimeout(() => { flashOverlay.style.opacity = '0'; }, 100);

        }, 5);

        // --- STEP 3: PRE-FLASH CLEANUP (T = 25ms) ---
        setTimeout(() => {
            preFlashOverlay.style.opacity = '0';
        }, 25);
    }

    /* =========================================
       6. LISTENERS
    ========================================= */
    initAudio();

    window.addEventListener('keydown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    window.addEventListener('mousedown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    window.addEventListener('touchstart', (e) => {
        if(isAccepted && e.touches.length > 0) {
            touchStartX = e.touches[0].screenX;
            touchStartY = e.touches[0].screenY;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if(isAccepted && e.changedTouches.length > 0) {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = Math.abs(touchEndX - touchStartX);
            const diffY = Math.abs(touchEndY - touchStartY);

            if (diffX < SCROLL_THRESHOLD && diffY < SCROLL_THRESHOLD) {
                triggerWarning(e);
            }
        }
    });

})();