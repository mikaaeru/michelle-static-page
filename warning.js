(function() {
    const STORAGE_KEY = 'system_warning_consent'; 
    const SCROLL_THRESHOLD = 10; 

    const phrases = [
        "STOP", "PILIH PRABOWO GIBRAN", "PILIH NOMOR 2!", "HAIIIIIIII!", "ANTEK ANTEK ASING", "PECINTA SAWIT"       
    ];

    const audioSources = [
        'prabowo.mp3', 'gibran.mp3', 'hai.mp3', 'antek2asing.mp3', 'koruptor.mp3', 'maling.mp3', 'hai1.mp3'
    ];

    const VOLUME_GAIN = 2.0; 
    const AUDIO_LAYERS = 6; 

    let bypassWarning = false;

    // Global link bypass
    window.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            bypassWarning = true;
            setTimeout(() => { bypassWarning = false; }, 1000);
        }
    });

    // The "Are you sure you want to leave?" logic
    window.addEventListener('beforeunload', (e) => {
        if (!bypassWarning) {
            e.preventDefault(); 
            e.returnValue = ''; 
        }
    });
   
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; 
    let isAccepted = false; 
    let areAssetsLoaded = false; 
    let lastAudioIndex = -1;

    let touchStartX = 0;
    let touchStartY = 0;

    const hasPriorConsent = localStorage.getItem(STORAGE_KEY) === 'true';

    const style = document.createElement('style');
    style.innerHTML = `
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
            width: 90%; max-width: 900px; 
            border: 4px solid #000;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);   
            display: flex; flex-direction: column; /* Changed to column for stacking */
            font-family: 'VT323', monospace;
            overflow: hidden;
        }
        .consent-content-wrapper {
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }
        .consent-text h3 { margin: 0; color: #ff6ec7; font-size: 1.8rem; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
        .consent-text p { margin: 5px 0 0 0; font-size: 1.1rem; color: #ccc; }
        #loading-status { color: #ff92df; font-weight: bold; }

        .btn-group { display: flex; gap: 10px; }
        .mc-btn {
            background: #000; color: #fff; border: 2px solid #fff;
            padding: 10px 20px; font-family: inherit; font-size: 1.2rem;
            cursor: pointer; text-transform: uppercase;
        }
        .mc-btn:hover:not(:disabled) { background: #fff; color: #000; }
        .mc-btn:disabled { opacity: 0.5; cursor: wait; }

        /* Full-width Blog Bar */
        .blog-bar-btn {
            width: 100%;
            background: #5b5bff;
            color: #fff;
            border: none;
            border-top: 4px solid #000;
            padding: 15px;
            font-family: inherit;
            font-size: 1.5rem;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            transition: background 0.2s;
        }
        .blog-bar-btn:hover { background: #7c7cff; }
        
        #warning-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(242, 0, 255, 1); 
            z-index: 2147483647; pointer-events: none; opacity: 0;
            display: flex; justify-content: center; align-items: center;
        }
        
        #hdr-pre-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: white; 
            z-index: 2147483648; pointer-events: none; opacity: 0;
        }

        #warning-text {
            font-family: 'VT323', monospace; font-size: 6rem;
            font-weight: 900; text-transform: uppercase;
            text-shadow: 4px 4px 0px #000;
            animation: shake 0.1s infinite;
        }

        @media (max-width: 600px) {
            .consent-content-wrapper { flex-direction: column; text-align: center; }
            .btn-group { width: 100%; flex-direction: column; }
            .btn-group button { width: 100%; }
        }
        @keyframes shake {
            0% { transform: translate(2px, 2px); }
            100% { transform: translate(-2px, -2px); }
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
            <div class="consent-content-wrapper">
                <div class="consent-text">
                    <h3>₊˚⊹ᰔ✨ ⚠️FLASHING LIGHTS NOTICE!⚠️</h3>
                    <p>Web contents may be unsuitable for individuals with epileptic photosensitivity. Agreeing loads resources without data collection (excluding Cloudflare stats). Rejecting displays contents at increased intensity.</p>
                    <p id="loading-status">Loading Assets...</p>
                </div>
                <div class="btn-group">
                    <button id="decline-btn" class="mc-btn" style="color: red; opacity: 1;" disabled>DECLINE</button>
                    <button id="accept-btn" class="mc-btn" disabled>INITIALIZING</button>
                </div>
            </div>
            <button id="blog-bar-btn" class="blog-bar-btn">➜ VISIT BLOG NOW!  (NEWLY ADDED FEATURE)</button>
        </div>
    `;
    document.body.appendChild(consentOverlay);

    async function initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        const acceptBtn = document.getElementById('accept-btn');
        const declineBtn = document.getElementById('decline-btn');
        const blogBtn = document.getElementById('blog-bar-btn');
        const loadText = document.getElementById('loading-status');

        // Handles blog redirect and excludes it from the exit warning
        blogBtn.addEventListener('click', () => {
            bypassWarning = true;
            window.location.href = 'https://blog.kamikami.eu';
        });

        try {
            const fetchPromises = audioSources.map(src => fetch(src));
            const responses = await Promise.all(fetchPromises);
            const bufferPromises = responses.map(res => res.arrayBuffer());
            const arrayBuffers = await Promise.all(bufferPromises);
            const decodePromises = arrayBuffers.map(buf => audioContext.decodeAudioData(buf));
            
            audioBuffers = await Promise.all(decodePromises);
            areAssetsLoaded = true;

            loadText.innerText = "Assets Loaded.";
            acceptBtn.innerText = "ACCEPT";
            acceptBtn.disabled = false;
            declineBtn.disabled = false;
            
            acceptBtn.addEventListener('click', () => {
                if (audioContext.state === 'suspended') audioContext.resume();
                localStorage.setItem(STORAGE_KEY, 'true');
                consentOverlay.style.opacity = '0';
                setTimeout(() => {
                    consentOverlay.style.display = 'none';
                    isAccepted = true;
                }, 300);
            });

            declineBtn.addEventListener('click', async () => {
                localStorage.removeItem(STORAGE_KEY);
                if (audioContext.state === 'suspended') await audioContext.resume();
                acceptBtn.disabled = true;
                declineBtn.disabled = true;
                
                const intervalId = setInterval(() => { triggerWarning(null, true); }, 100); 
                setTimeout(() => {
                    clearInterval(intervalId);
                    bypassWarning = true; 
                    location.reload();
                }, 3000);
            });

        } catch (error) {
            loadText.innerText = "Failed to load audio.";
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

    async function triggerWarning(e, force = false) {
        if (!force) {
            if (!isAccepted || !areAssetsLoaded || isPlaying) return; 
            if (e && e.target && (e.target.closest('#consent-overlay') || e.target.closest('a'))) return;
        }

        if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
        if (!force) isPlaying = true; 

        preFlashOverlay.style.opacity = '1';
        setTimeout(() => {
            textSpan.innerText = phrases[Math.floor(Math.random() * phrases.length)];
            flashOverlay.style.opacity = '1';
            let newIndex = Math.floor(Math.random() * audioBuffers.length);
            if (audioBuffers[newIndex]) playSound(audioBuffers[newIndex]);
            setTimeout(() => { flashOverlay.style.opacity = '0'; }, 100);
        }, 5);
        setTimeout(() => { preFlashOverlay.style.opacity = '0'; }, 25);
    }

    initAudio();

    // Trigger handlers
    window.addEventListener('keydown', (e) => isAccepted && triggerWarning(e));
    window.addEventListener('mousedown', (e) => isAccepted && triggerWarning(e));
    window.addEventListener('touchstart', (e) => {
        if(isAccepted && e.touches.length > 0) {
            touchStartX = e.touches[0].screenX;
            touchStartY = e.touches[0].screenY;
        }
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
        if(isAccepted && e.changedTouches.length > 0) {
            const diffX = Math.abs(e.changedTouches[0].screenX - touchStartX);
            const diffY = Math.abs(e.changedTouches[0].screenY - touchStartY);
            if (diffX < SCROLL_THRESHOLD && diffY < SCROLL_THRESHOLD) triggerWarning(e);
        }
    });

})();