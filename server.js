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
                font-family: "Courier New", monospace;
                text-align: center;
                padding: 50px;
            }
            h1 {
                font-size: 40px;
                text-shadow: 0 0 10px #00ff00;
            }
            .blinking {
                animation: blink 1s infinite;
            }
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0; }
                100% { opacity: 1; }
            }
        </style>
        <h1 class="blinking">⚠ SYSTEM BREACH DETECTED ⚠</h1>
        <p>IP Public: <span id="public-ip">Detecting...</span></p>
        <p>IP Private: <span id="private-ip">Detecting...</span></p>
        <audio id="alarm" src="https://www.myinstants.com/media/sounds/siren.mp3" loop></audio>
        <script>
            document.getElementById("alarm").play();

            // Ambil IP Public dari server
            fetch("/get-ip").then(res => res.json()).then(data => {
                document.getElementById("public-ip").innerText = data.ip;
            });

            // Ambil IP Private dengan WebRTC
            async function getLocalIPs() {
                const ips = new Set();
                const pc = new RTCPeerConnection({ iceServers: [] });

                pc.createDataChannel("");
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                pc.onicecandidate = event => {
                    if (event.candidate && event.candidate.candidate.includes("udp")) {
                        const ip = event.candidate.candidate.split(" ")[4];
                        ips.add(ip);
                    } else if (!event.candidate) {
                        document.getElementById("private-ip").innerText = [...ips].join(", ") || "Tidak ditemukan";
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
