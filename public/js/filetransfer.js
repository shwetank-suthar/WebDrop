function setupFileTransfer() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Click handler
    dropZone.addEventListener('click', () => fileInput.click());

    // File selection handler
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag & drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

async function handleFiles(files) {
    if (!conn) {
        window.dispatchEvent(new CustomEvent('transfer-error', {
            detail: { fileName: 'files', error: 'No connection' }
        }));
        return;
    }

    const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    let transferredSize = 0;

    try {
        for (const file of files) {
            window.dispatchEvent(new CustomEvent('transfer-start', {
                detail: { fileName: file.name }
            }));

            const reader = new FileReader();
            
            await new Promise((resolve, reject) => {
                reader.onload = async (e) => {
                    try {
                        await sendFile(file, e.target.result);
                        transferredSize += file.size;
                        const progress = Math.round((transferredSize / totalSize) * 100);
                        dispatchProgressEvent(progress);
                        
                        window.dispatchEvent(new CustomEvent('transfer-complete', {
                            detail: { fileName: file.name }
                        }));
                        
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
                
                reader.onerror = () => {
                    window.dispatchEvent(new CustomEvent('transfer-error', {
                        detail: { fileName: file.name, error: 'Failed to read file' }
                    }));
                    reject(new Error('Error reading file'));
                };
                reader.readAsArrayBuffer(file);
            });
        }
        
        // Transfer complete
        dispatchProgressEvent(100);
        setTimeout(() => dispatchProgressEvent(0), 1000);
    } catch (err) {
        console.error('File transfer error:', err);
        window.dispatchEvent(new CustomEvent('transfer-error', {
            detail: { fileName: 'files', error: err.message }
        }));
        dispatchProgressEvent(0);
    }
}

function sendFile(file, data) {
    return new Promise((resolve, reject) => {
        try {
            // Send file metadata first
            conn.send({
                type: 'file-meta',
                name: file.name,
                size: file.size,
                mimeType: file.type
            });

            // Send file data in chunks
            const chunkSize = 16384; // 16KB chunks
            const totalChunks = Math.ceil(data.byteLength / chunkSize);
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
                conn.send({
                    type: 'file-chunk',
                    data: chunk,
                    chunk: i,
                    final: i === totalChunks - 1
                });
            }

            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function handleIncomingData(data) {
    if (data.type === 'file-meta') {
        // Start receiving a new file
        window.currentFile = {
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            chunks: [],
            receivedSize: 0
        };
        
        window.dispatchEvent(new CustomEvent('transfer-start', {
            detail: { fileName: data.name }
        }));
    } else if (data.type === 'file-chunk') {
        // Append chunk to current file
        if (window.currentFile) {
            window.currentFile.chunks.push(data.data);
            window.currentFile.receivedSize += data.data.byteLength;

            // Calculate and dispatch progress
            const progress = Math.round((window.currentFile.receivedSize / window.currentFile.size) * 100);
            dispatchProgressEvent(progress);

            if (data.final) {
                // File transfer complete, download it
                downloadFile(window.currentFile);
                
                window.dispatchEvent(new CustomEvent('transfer-complete', {
                    detail: { fileName: window.currentFile.name }
                }));
                
                window.currentFile = null;
                setTimeout(() => dispatchProgressEvent(0), 1000);
            }
        }
    }
}

function downloadFile(fileData) {
    const blob = new Blob(fileData.chunks, { type: fileData.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.name;
    a.click();
    URL.revokeObjectURL(url);
}

function dispatchProgressEvent(progress) {
    window.dispatchEvent(new CustomEvent('transfer-progress', {
        detail: { progress }
    }));
}

// Initialize file transfer
window.addEventListener('load', setupFileTransfer);