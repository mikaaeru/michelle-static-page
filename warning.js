/* --- warning.js --- */
(function() {
    // 1. Configuration: Phrases
    const phrases = [
        "STOP", 
        "DON'T PRESS ANYTHING", 
        "NO!", 
        "YAMETEEEEEE!",        
        "やめて ください!",      
        "DAME! (ダメ)",        
        "BAKA! (バカ)",        
        "OMAE WA MOU...",      
        "SHINDEIRU!",          
        "禁止",                 
        "不要!",                
        "停!",                  
        "KYAAAAA!",            
        "HANDS OFF!",
        "TOUCH GRASS",
        "SYSTEM FAILURE"
    ];

    // 2. Audio Setup
    const audioFiles = [
        'intro1.wav', 
        'intro2.wav', 
        'intro3.wav', 
        'intro4.wav'
    ];
    
    // Track the last played index to prevent immediate repeats
    let lastAudioIndex = -1;

    // 1 = Normal, 5 = Ear Destroying
    const LOUDNESS_LAYERS = 5; 

    // Pre-load audio objects to reduce lag
    const audioObjects = audioFiles.map(src => new Audio(src));

    // 3. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #warning-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #ff0000;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647; 
            pointer-events: none; 
            opacity: 0;
            transition: opacity 0.05s ease-out; 
            text-align: center;
            overflow: hidden;
        }

        #warning-text {
            font-family: 'VT323', 'Courier New', monospace;
            font-size: 6rem;
            font-weight: 900;
            text-transform: uppercase;
            text-shadow: 5px 5px 0px #000;
            transform: scale(1);
            animation: shake 0.1s infinite;
        }

        @keyframes shake {
            0% { transform: translate(2px, 2px) rotate(0deg); }
            20% { transform: translate(-4px, 0px) rotate(2deg); }
            40% { transform: translate(4px, -2px) rotate(-2deg); }
            60% { transform: translate(-4px, 2px) rotate(0deg); }
            80% { transform: translate(2px, -2px) rotate(2deg); }
            100% { transform: translate(0px, 0px) rotate(-2deg); }
        }
    `;
    document.head.appendChild(style);

    // 4. Inject HTML
    const overlay = document.createElement('div');
    overlay.id = 'warning-overlay';
    
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    overlay.appendChild(textSpan);
    
    document.body.appendChild(overlay);

    // 5. Trigger Logic
    let hideTimeout;

    function triggerWarning(event) {
        // A. Visuals
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        textSpan.innerText = randomPhrase;

        const bgColors = ['#ff0000', '#000000', '#ff1493', '#0000ff'];
        overlay.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];

        overlay.style.opacity = '1';

        // B. Audio Logic
        
        // 1. Pick a random index that is NOT the same as the last one
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioObjects.length);
        } while (newIndex === lastAudioIndex && audioObjects.length > 1);
        
        lastAudioIndex = newIndex;
        const selectedBaseAudio = audioObjects[newIndex];

        // 2. The "Very Really Super Loudly" Part
        // We clone and play the file multiple times simultaneously to boost gain artificially.
        for (let i = 0; i < LOUDNESS_LAYERS; i++) {
            const soundClone = selectedBaseAudio.cloneNode();
            soundClone.volume = 1.0; 
            soundClone.play().catch(e => { /* Ignore auto-play errors */ });
        }

        // C. Timer
        if (hideTimeout) clearTimeout(hideTimeout);

        // Hide after 150ms (Slightly faster for rapid key presses)
        hideTimeout = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 150);
    }

    // 6. Listeners

    // Trigger on ANY key press
    window.addEventListener('keydown', (e) => {
        triggerWarning(e);
    });

    // Trigger on Right Click
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        triggerWarning(e);
    });

    // Trigger on Link Clicks (or any click if preferred, currently set to Links)
    window.addEventListener('click', (e) => {
        // .closest('a') ensures it works even if you click an image/text *inside* a link
        if (e.target.closest('a')) {
            // Optional: e.preventDefault(); // Uncomment if you want to stop the link from actually opening
            triggerWarning(e);
        }
    }, true); // Use capture to catch it early

})();