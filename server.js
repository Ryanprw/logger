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

// Halaman utama dengan WebRTC untuk IP Private
app.get("/", (req, res) => {
    res.send(`
        <h1>IP kamu sudah dicatat di server.</h1>
        <p>IP Public: ${getClientIP(req)}</p>
        <p id="private-ip">Mendeteksi IP Private...</p>
        <script>
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
                        const privateIP = [...ips].join(", ") || "Tidak ditemukan";
                        document.getElementById("private-ip").innerText = "IP Private: " + privateIP;
                        
                        fetch("/log-ip", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ privateIP })
                        });

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
