function setupFileTransfer() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

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

            await sendFile(file, (chunkSize, totalChunks) => {
                transferredSize += chunkSize;
                const progress = Math.round((transferredSize / totalSize) * 100);
                dispatchProgressEvent(progress);
            });

            window.dispatchEvent(new CustomEvent('transfer-complete', {
                detail: { fileName: file.name }
            }));
        }

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

async function sendFile(file, onProgress) {
    const chunkSize = 16 * 1024; // 16KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    conn.send({
        type: 'file-meta',
        name: file.name,
        size: file.size,
        mimeType: file.type
    });

    const stream = file.stream();
    const reader = stream.getReader();

    let chunkIndex = 0;
    let transferredSize = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        conn.send({
            type: 'file-chunk',
            data: value,
            chunk: chunkIndex,
            final: chunkIndex === totalChunks - 1
        });

        transferredSize += value.byteLength;
        onProgress(value.byteLength, totalChunks);
        chunkIndex++;
    }
}

function handleIncomingData(data) {
    if (data.type === 'file-meta') {
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
        if (window.currentFile) {
            window.currentFile.chunks.push(data.data);
            window.currentFile.receivedSize += data.data.byteLength;

            const progress = Math.round((window.currentFile.receivedSize / window.currentFile.size) * 100);
            dispatchProgressEvent(progress);

            if (data.final) {
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

window.addEventListener('load', setupFileTransfer);
