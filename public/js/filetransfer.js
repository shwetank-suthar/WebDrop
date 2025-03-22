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

            await sendFile(file, totalSize, (progress) => {
                transferredSize += progress;
                const overallProgress = Math.round((transferredSize / totalSize) * 100);
                dispatchProgressEvent(overallProgress);
            });

            window.dispatchEvent(new CustomEvent('transfer-complete', {
                detail: { fileName: file.name }
            }));
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

async function sendFile(file, totalSize, onProgress) {
    // Send file metadata first
    conn.send({
        type: 'file-meta',
        name: file.name,
        size: file.size,
        mimeType: file.type
    });

    const chunkSize = 64 * 1024; // 64KB chunks
    let offset = 0;

    while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const chunkData = await chunk.arrayBuffer();

        conn.send({
            type: 'file-chunk',
            data: chunkData,
            chunk: Math.floor(offset / chunkSize),
            final: offset + chunkSize >= file.size
        });

        offset += chunkSize;
        onProgress(chunkSize);
    }
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
            const chunkArray = new Uint8Array(data.data);
            window.currentFile.chunks.push(chunkArray);
            window.currentFile.receivedSize += chunkArray.byteLength;

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
