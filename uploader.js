document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const progressArea = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const statusText = document.getElementById('upload-status');

    // CONFIGURATION
    const SHARE_TOKEN = 'jkeDGFrSTpLcpiY';
    // The public WebDAV endpoint for Nextcloud
    const UPLOAD_URL = `https://cloud.kamikami.eu/public.php/webdav/`; 

    // --- Drag & Drop Handlers ---
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        const files = [...e.target.files];
        if (files.length > 0) {
            uploadFiles(files);
        }
    }

    // --- Upload Logic ---

    async function uploadFiles(files) {
        progressArea.style.display = 'block';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = file.name;
            
            statusText.innerHTML = `Uploading ${fileName}...`;
            statusText.className = ''; 

            try {
                await uploadSingleFile(file);
                // Update progress bar per file (simple division)
                const percent = ((i + 1) / files.length) * 100;
                progressFill.style.width = `${percent}%`;
            } catch (error) {
                console.error(error);
                statusText.innerHTML = `Error uploading ${fileName}. CORS or Network issue?`;
                statusText.className = 'status-error';
                return; // Stop on error
            }
        }

        statusText.innerHTML = "UPLOAD COMPLETE ✨";
        statusText.className = 'status-success';
        
        // Reset after 3 seconds
        setTimeout(() => {
            progressArea.style.display = 'none';
            progressFill.style.width = '0%';
            statusText.innerHTML = '';
        }, 3000);
    }

    function uploadSingleFile(file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            // Nextcloud WebDAV requires the filename in the URL
            // encodeURIComponent handles spaces and special chars in filenames
            const url = `${UPLOAD_URL}${encodeURIComponent(file.name)}`;

            xhr.open('PUT', url, true);

            // AUTHENTICATION:
            // For public shares, the username is the token, password is empty (or anything).
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(SHARE_TOKEN + ':'));
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    // This creates a smooth loading effect within the current file step
                    // Optional: You can make the bar smoother here if desired
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText
                    });
                }
            };

            xhr.onerror = () => {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            };

            xhr.send(file);
        });
    }
});