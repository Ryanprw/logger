const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Fungsi untuk mendapatkan IP pengguna
function getClientIP(req) {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Jika ada banyak IP dalam "x-forwarded-for", ambil yang pertama
    if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
    }

    // Hapus format IPv6-mapped IPv4 (::ffff:)
    ip = ip.replace("::ffff:", "");

    return ip;
}

// Middleware untuk mencatat IP setiap request
app.use((req, res, next) => {
    let ip = getClientIP(req);
    let userAgent = req.headers["user-agent"];
    let log = `IP: ${ip} - User Agent: ${userAgent} - Waktu: ${new Date().toISOString()}\n`;

    // Simpan ke file log di direktori tersembunyi
    fs.appendFileSync(path.join(__dirname, ".logs", "ip_log.txt"), log);
    console.log(log.trim());

    next();
});

// Halaman utama (dengan WebRTC untuk mendapatkan IP Private)
app.get("/", (req, res) => {
    res.send(`
        <h1>IP kamu sudah dicatat di server.</h1>
        <script>
            async function getLocalIPs() {
                const ips = new Set();
                const pc = new RTCPeerConnection({ iceServers: [] });

                pc.createDataChannel("");
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                pc.onicecandidate = event => {
                    if (event.candidate) {
                        const ip = event.candidate.candidate.split(" ")[4];
                        ips.add(ip);
                    } else {
                        document.body.innerHTML += "<p>IP Private (Local Device): " + [...ips] + "</p>";
                        pc.close();
                    }
                };
            }
            getLocalIPs();
        </script>
    `);
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
