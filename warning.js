(function() {
    /* =========================================
       0. BUILD SAFETY GUARD (CRITICAL FIX)
    ========================================= */
    // This prevents the "window is not defined" error during Cloudflare builds
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return; 
    }

    /* =========================================
       1. CONFIGURATION
    ========================================= */
    const phrases = [
        "STOP", "DON'T TOUCH", "NO!", "YAMETEEEEEE!", "やめて!", 
        "DAME!", "BAKA!", "ERROR", "FATAL", "FORBIDDEN", 
        "DON'T CLICK", "SYSTEM HALT", "KYAAAAA!", "HANDS OFF"
    ];

    const audioSources = [
        '/intro1.wav', '/intro2.wav', '/intro3.wav', '/intro4.wav'
    ];
    // NOTE: Ensure these paths start with '/' if they are in your 'public' folder.

    const VOLUME_GAIN = 5.0; 

    /* =========================================
       2. STATE MANAGEMENT
    ========================================= */
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; 
    let isAccepted = false; 
    let lastAudioIndex = -1;

    /* =========================================
       3. UI & CSS INJECTION
    ========================================= */
    // We wrap this in a try-catch just in case DOM isn't ready
    try {
        const style = document.createElement('style');
        style.innerHTML = `
            #consent-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                background-color: rgba(0, 0, 0, 0.4); z-index: 2147483646;
                display: flex; align-items: flex-end; justify-content: center;
                padding-bottom: 50px; opacity: 1; transition: opacity 0.3s ease-out;
            }
            #consent-box {
                background-color: #3a3a3a; color: #fff; width: 90%; max-width: 900px;
                padding: 20px; border: 4px solid #000;
                box-shadow: inset 4px 4px 0 rgba(255,255,255,0.1), inset -4px -4px 0 rgba(0,0,0,0.2), 0 10px 25px rgba(0,0,0,0.5);
                display: flex; flex-direction: row; align-items: center; justify-content: space-between;
                gap: 20px; font-family: monospace;
            }
            .consent-text h3 { margin: 0; color: #ff6ec7; font-size: 1.8rem; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
            .consent-text p { margin: 5px 0 0 0; font-size: 1.2rem; color: #ccc; }
            #loading-status { color: #ff92df; font-weight: bold; }
            #warning-flash {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: #ff0000; color: #ffffff;
                display: flex; justify-content: center; align-items: center;
                z-index: 2147483647; pointer-events: none; opacity: 0;
                transition: opacity 0.1s ease-out;
            }
            #warning-text {
                font-family: monospace; font-size: 6rem; font-weight: 900;
                text-transform: uppercase; text-shadow: 5px 5px 0px #000;
                animation: shake 0.1s infinite;
            }
            @media (max-width: 600px) {
                #consent-box { flex-direction: column; text-align: center; }
                #consent-box button { width: 100%; }
            }
            @keyframes shake {
                0% { transform: translate(2px, 2px) rotate(0deg); }
                100% { transform: translate(-2px, -2px) rotate(-2deg); }
            }
            /* Button Style Fallback */
            .mc-btn {
                background-color: #7d7d7d; border: 2px solid #000; padding: 10px 20px;
                color: white; font-family: monospace; font-size: 1.2rem; cursor: pointer;
                box-shadow: inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.4);
            }
            .mc-btn:active { box-shadow: inset 2px 2px 0 rgba(0,0,0,0.4), inset -2px -2px 0 rgba(255,255,255,0.4); }
        `;
        document.head.appendChild(style);

        const flashOverlay = document.createElement('div');
        flashOverlay.id = 'warning-flash';
        const textSpan = document.createElement('span');
        textSpan.id = 'warning-text';
        flashOverlay.appendChild(textSpan);
        document.body.appendChild(flashOverlay);

        const consentOverlay = document.createElement('div');
        consentOverlay.id = 'consent-overlay';
        consentOverlay.innerHTML = `
            <div id="consent-box">
                <div class="consent-text">
                    <h3>⚠️ System Warning: Loud Audio</h3>
                    <p>This site features random, high-volume audio triggers.</p>
                    <p id="loading-status">Loading Assets...</p>
                </div>
                <button id="accept-btn" class="mc-btn" disabled>INITIALIZE</button>
            </div>
        `;
        document.body.appendChild(consentOverlay);
    } catch(e) {
        console.log("DOM not ready for injection", e);
    }

    /* =========================================
       4. AUDIO ENGINE
    ========================================= */
    async function initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return; // Browser too old
        
        audioContext = new AudioContext();

        const loadBtn = document.getElementById('accept-btn');
        const loadText = document.getElementById('loading-status');

        if (!loadBtn) return;

        try {
            const fetchPromises = audioSources.map(src => fetch(src));
            const responses = await Promise.all(fetchPromises);
            const bufferPromises = responses.map(res => res.arrayBuffer());
            const arrayBuffers = await Promise.all(bufferPromises);
            const decodePromises = arrayBuffers.map(buf => audioContext.decodeAudioData(buf));
            
            audioBuffers = await Promise.all(decodePromises);

            loadText.innerText = "Assets Loaded. Click Initialize to enter.";
            loadBtn.innerText = "I ACCEPT";
            loadBtn.disabled = false;
            
            loadBtn.addEventListener('click', () => {
                if (audioContext.state === 'suspended') audioContext.resume();
                consentOverlay.style.opacity = '0';
                setTimeout(() => {
                    consentOverlay.style.display = 'none';
                    isAccepted = true;
                }, 300);
            });

        } catch (error) {
            if(loadText) loadText.innerText = "Audio Load Failed (Check Console)";
            console.error("Audio Load Error:", error);
        }
    }

    function playSound(buffer, onComplete = null) {
        if (!audioContext) {
            if (onComplete) onComplete(); 
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = VOLUME_GAIN; 
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);

        source.onended = () => {
            isPlaying = false; 
            const flash = document.getElementById('warning-flash');
            if(flash) flash.style.opacity = '0'; 
            if (onComplete) onComplete();
        };
    }

    /* =========================================
       5. TRIGGER LOGIC
    ========================================= */
    function triggerWarning(event, callback = null) {
        if (!isAccepted || isPlaying) return; 
        isPlaying = true; 

        const flash = document.getElementById('warning-flash');
        const txt = document.getElementById('warning-text');
        
        if(flash && txt) {
            txt.innerText = phrases[Math.floor(Math.random() * phrases.length)];
            const bgColors = ['#ff0000', '#000000', '#ff00ff', '#0000ff'];
            flash.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];
            flash.style.opacity = '1';
        }

        let newIndex;
        // Safety check if audio didn't load
        if (audioBuffers.length === 0) {
            isPlaying = false;
            if(flash) flash.style.opacity = '0';
            if (callback) callback();
            return;
        }

        do {
            newIndex = Math.floor(Math.random() * audioBuffers.length);
        } while (newIndex === lastAudioIndex && audioBuffers.length > 1);
        lastAudioIndex = newIndex;

        if (audioBuffers[newIndex]) {
            playSound(audioBuffers[newIndex], callback);
        } else {
            isPlaying = false;
            if(flash) flash.style.opacity = '0';
            if (callback) callback();
        }
    }

    /* =========================================
       6. LISTENERS (Safe Execution)
    ========================================= */
    // Only run if document is fully ready (prevents hydration mismatch)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initAudio();

        window.addEventListener('keydown', (e) => {
            if(isAccepted) triggerWarning(e);
        });

        window.addEventListener('contextmenu', (e) => {
            if(isAccepted) {
                e.preventDefault(); 
                triggerWarning(e);
            }
        });

        window.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if(isAccepted && link) {
                e.preventDefault();
                const targetUrl = link.href;
                if (targetUrl && targetUrl !== '#' && !targetUrl.startsWith('javascript')) {
                    triggerWarning(e, () => {
                        window.location.href = targetUrl; 
                    });
                } else {
                    triggerWarning(e); 
                }
            }
        }, true);
    }

})();