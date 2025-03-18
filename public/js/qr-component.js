// Get QRCode from the global scope
const QRCode = window.qrcode.QRCodeSVG;

// QR Code React Component
const QRCodeComponent = ({ url }) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="qr-wrapper">
            <div className="qr-gradient-overlay"></div>
            <QRCode
                value={url || 'placeholder'}
                size={250}
                level="H"
                bgColor="transparent"
                fgColor="#FFFFFF"
                includeMargin={true}
                imageSettings={{
                    src: "data:image/svg+xml," + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <circle cx="12" cy="12" r="11" fill="#6C63FF" opacity="0.2"/>
                            <path fill="#FFFFFF" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            <path fill="#FFFFFF" d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                        </svg>
                    `),
                    height: 24,
                    width: 24,
                    excavate: true
                }}
            />
            <div className="qr-effects">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="qr-circle" style={{ '--delay': `${i * 0.5}s` }}></div>
                ))}
                {[...Array(20)].map((_, i) => (
                    <div key={`dot-${i}`} className="qr-dot" style={{
                        '--x': `${Math.random() * 100}%`,
                        '--y': `${Math.random() * 100}%`,
                        '--delay': `${Math.random() * 3}s`
                    }}></div>
                ))}
            </div>
        </div>
    );
};


// Initialize QR Code
window.initQRCode = function(url) {
    const root = document.getElementById('qrRoot');
    if (root && url) {
        ReactDOM.render(<QRCodeComponent url={url} />, root);
    }
}
