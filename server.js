const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const useragent = require("useragent"); // Tambahkan ini: npm install useragent
const mobileDetect = require("mobile-detect"); // Tambahkan ini: npm install mobile-detect

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
    if (ip.includes(",")) ip = ip.split(",")[0].trim();
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

// Halaman utama dengan deteksi IP dan device
app.get("/", async (req, res) => {
    const ip = getClientIP(req);
    const userAgentString = req.headers["user-agent"] || "Unknown";
    
    // Parse user agent untuk mendapatkan informasi device
    const agent = useragent.parse(userAgentString);
    const md = new mobileDetect(userAgentString);
    
    // Deteksi device type
    let deviceType = "Desktop";
    let deviceBrand = "Unknown";
    let deviceModel = "Unknown";
    
    if (md.mobile()) {
        deviceType = md.tablet() ? "Tablet" : "Mobile";
        
        // Deteksi brand dan model smartphone
        if (md.is('iPhone')) {
            deviceBrand = "Apple";
            deviceModel = "iPhone";
            // Coba deteksi model iPhone spesifik
            const iphoneMatch = userAgentString.match(/iPhone(\s+OS\s+(\d+_?)+)/);
            if (iphoneMatch) {
                const iosVersion = iphoneMatch[1].replace(/_/g, '.');
                deviceModel += ` (iOS ${iosVersion})`;
            }
        } else if (md.is('Samsung')) {
            deviceBrand = "Samsung";
            // Coba deteksi model Samsung
            const samsungMatch = userAgentString.match(/SM-[A-Z0-9]+/i);
            if (samsungMatch) {
                deviceModel = samsungMatch[0];
            } else {
                deviceModel = "Galaxy";
            }
        } else if (md.is('Xiaomi')) {
            deviceBrand = "Xiaomi";
            const xiaomiMatch = userAgentString.match(/Mi[A-Z0-9\s]+/i) || userAgentString.match(/Redmi[A-Z0-9\s]+/i);
            deviceModel = xiaomiMatch ? xiaomiMatch[0] : "Mi";
        } else if (userAgentString.includes('OPPO') || userAgentString.includes('oppo')) {
            deviceBrand = "OPPO";
            const oppoMatch = userAgentString.match(/OPPO\s[A-Z0-9]+/i) || userAgentString.match(/CPH[0-9]+/i);
            deviceModel = oppoMatch ? oppoMatch[0] : "Phone";
        } else if (userAgentString.includes('vivo') || userAgentString.includes('Vivo')) {
            deviceBrand = "Vivo";
            const vivoMatch = userAgentString.match(/vivo\s[A-Z0-9]+/i);
            deviceModel = vivoMatch ? vivoMatch[0] : "Phone";
        } else if (userAgentString.includes('Huawei') || userAgentString.includes('HUAWEI')) {
            deviceBrand = "Huawei";
            const huaweiMatch = userAgentString.match(/HUAWEI\s[A-Z0-9]+/i);
            deviceModel = huaweiMatch ? huaweiMatch[0] : "Phone";
        } else if (md.is('Android')) {
            deviceBrand = "Android";
            const androidMatch = userAgentString.match(/Android\s[0-9\.]+/i);
            deviceModel = androidMatch ? androidMatch[0] : "Phone";
        }
    }
    
    // Informasi IP dari API
    let ipInfo = {
        query: ip,
        country: "Loading...",
        regionName: "Loading...",
        city: "Loading...",
        lat: 0,
        lon: 0,
        isp: "Loading...",
        timezone: "Loading...",
        zip: "Loading...",
        as: "Loading...",
        mobile: false,
        proxy: false,
        hosting: false
    };

    try {
        // Dapatkan detail IP dari ip-api.com
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query`);
        if (response.data && response.data.status === "success") {
            ipInfo = response.data;
        }
    } catch (error) {
        console.error("Gagal mengambil informasi IP:", error);
    }

    // Format waktu lokal berdasarkan timezone
    const currentTime = new Date().toLocaleString("en-US", { 
        timeZone: ipInfo.timezone || "UTC",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Format koordinat dengan rapi
    const coordinates = ipInfo.lat && ipInfo.lon ? `${ipInfo.lat.toFixed(6)}, ${ipInfo.lon.toFixed(6)}` : "Unknown";
    
    // Format ASN
    const asn = ipInfo.as ? ipInfo.as.split(" ")[0] : "Unknown";
    const asnOrg = ipInfo.asname || (ipInfo.as ? ipInfo.as.substring(ipInfo.as.indexOf(" ") + 1).trim() : "Unknown");

    // Tentukan mobile carrier
    let mobileCarrier = "N/A";
    let mcc = "N/A";
    let mnc = "N/A";
    
    if (ipInfo.isp && ipInfo.mobile) {
        if (ipInfo.isp.includes("Telkomsel")) {
            mobileCarrier = "Telkomsel";
            mcc = "510";
            mnc = "10";
        } else if (ipInfo.isp.includes("XL")) {
            mobileCarrier = "XL Axiata";
            mcc = "510";
            mnc = "11";
        } else if (ipInfo.isp.includes("Indosat")) {
            mobileCarrier = "Indosat Ooredoo";
            mcc = "510";
            mnc = "01";
        } else if (ipInfo.isp.includes("Tri") || ipInfo.isp.includes("3")) {
            mobileCarrier = "3 (Tri)";
            mcc = "510";
            mnc = "89";
        } else if (ipInfo.isp.includes("Smartfren")) {
            mobileCarrier = "Smartfren";
            mcc = "510";
            mnc = "09";
        }
    }

    // Tentukan jenis koneksi
    let connectionType = "DSL/Fiber";
    if (ipInfo.mobile) {
        connectionType = "Mobile Data";
    } else if (ipInfo.hosting) {
        connectionType = "Hosting/Server";
    }
    
    // Coba dapatkan domain dari ISP
    let domain = "N/A";
    if (ipInfo.isp) {
        if (ipInfo.isp.toLowerCase().includes("telkom")) {
            domain = "telkom.co.id";
        } else if (ipInfo.isp.toLowerCase().includes("xl")) {
            domain = "xl.co.id";
        } else if (ipInfo.isp.toLowerCase().includes("indosat")) {
            domain = "indosatooredoo.com";
        } else if (ipInfo.isp.toLowerCase().includes("biznet")) {
            domain = "biznetnetworks.com";
        }
    }

    res.send(`
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap');

            body {
                background-color: #0d1117;
                color: #c9d1d9;
                font-family: 'Source Code Pro', monospace;
                margin: 0;
                padding: 20px;
            }

            .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: #161b22;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
                padding: 20px;
                border: 1px solid #30363d;
            }

            h1 {
                color: #58a6ff;
                text-align: center;
                margin-bottom: 30px;
                font-size: 28px;
            }

            .ip-container {
                margin-bottom: 30px;
                text-align: center;
            }

            .ip-address {
                font-size: 24px;
                color: #f0883e;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(240, 136, 62, 0.5);
            }

            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }

            .info-table th {
                text-align: left;
                padding: 12px 15px;
                background-color: #21262d;
                color: #58a6ff;
                font-weight: bold;
                border-bottom: 1px solid #30363d;
            }

            .info-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #30363d;
            }

            .info-table tr:last-child td {
                border-bottom: none;
            }

            .info-table tr:nth-child(even) {
                background-color: #1c2128;
            }

            .section-title {
                color: #58a6ff;
                margin-top: 30px;
                margin-bottom: 15px;
                font-weight: bold;
                border-bottom: 1px solid #30363d;
                padding-bottom: 8px;
            }

            .security-alert {
                color: ${ipInfo.proxy || ipInfo.hosting ? '#f85149' : '#3fb950'};
                font-weight: bold;
            }

            .terminal {
                background-color: #0d1117;
                border-radius: 5px;
                padding: 15px;
                color: #3fb950;
                font-family: monospace;
                margin-top: 20px;
                border: 1px solid #30363d;
                white-space: pre;
                overflow: hidden;
            }

            #loadingText span {
                overflow: hidden;
                display: inline-block;
                vertical-align: middle;
            }

            .blink {
                animation: blink 1s infinite;
            }

            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0; }
                100% { opacity: 1; }
            }

            .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #8b949e;
            }
            
            .device-icon {
                font-size: 48px;
                text-align: center;
                margin-bottom: 20px;
            }
        </style>

        <div class="container">
            <h1>IP & Device Information</h1>

            <div class="ip-container">
                <div class="device-icon">
                    ${deviceType === "Mobile" ? "📱" : deviceType === "Tablet" ? "📟" : "💻"}
                </div>
                <div class="ip-address">${ipInfo.query}</div>
            </div>

            <table class="info-table">
                <tr>
                    <th colspan="2">Device Information</th>
                </tr>
                <tr>
                    <td>Device Type</td>
                    <td>${deviceType}</td>
                </tr>
                <tr>
                    <td>Device Brand</td>
                    <td>${deviceBrand}</td>
                </tr>
                <tr>
                    <td>Device Model</td>
                    <td>${deviceModel}</td>
                </tr>
                <tr>
                    <td>Operating System</td>
                    <td>${agent.os.toString()}</td>
                </tr>
                <tr>
                    <td>Browser</td>
                    <td>${agent.toAgent()}</td>
                </tr>
                <tr>
                    <td>Browser Version</td>
                    <td>${agent.toVersion()}</td>
                </tr>
            </table>

            <table class="info-table">
                <tr>
                    <th colspan="2">Location Information</th>
                </tr>
                <tr>
                    <td>Country</td>
                    <td>${ipInfo.country} ${ipInfo.countryCode ? `(${ipInfo.countryCode})` : ''}</td>
                </tr>
                <tr>
                    <td>Region</td>
                    <td>${ipInfo.regionName}</td>
                </tr>
                <tr>
                    <td>City</td>
                    <td>${ipInfo.city}</td>
                </tr>
                <tr>
                    <td>District</td>
                    <td>${ipInfo.district || "N/A"}</td>
                </tr>
                <tr>
                    <td>Coordinates</td>
                    <td>${coordinates}</td>
                </tr>
                <tr>
                    <td>ZIP Code</td>
                    <td>${ipInfo.zip || "N/A"}</td>
                </tr>
                <tr>
                    <td>Time Zone</td>
                    <td>UTC ${ipInfo.offset ? (ipInfo.offset > 0 ? '+' : '') + (ipInfo.offset / 3600) : '+7'}:00</td>
                </tr>
                <tr>
                    <td>Local Time</td>
                    <td>${currentTime}</td>
                </tr>
            </table>

            <table class="info-table">
                <tr>
                    <th colspan="2">Network Information</th>
                </tr>
                <tr>
                    <td>ISP</td>
                    <td>${ipInfo.isp}</td>
                </tr>
                <tr>
                    <td>ASN</td>
                    <td>${asn}</td>
                </tr>
                <tr>
                    <td>Organization</td>
                    <td>${asnOrg}</td>
                </tr>
                <tr>
                    <td>Domain</td>
                    <td>${domain}</td>
                </tr>
                <tr>
                    <td>Connection Type</td>
                    <td>${connectionType}</td>
                </tr>
                <tr>
                    <td>IDD & Area Code</td>
                    <td>${ipInfo.countryCode === "ID" ? "(62) " + (ipInfo.city === "Jakarta" ? "021" : ipInfo.city === "Surabaya" ? "031" : ipInfo.city === "Bandung" ? "022" : ipInfo.city === "Medan" ? "061" : "0XX") : "N/A"}</td>
                </tr>
            </table>

            <table class="info-table">
                <tr>
                    <th colspan="2">Mobile Information</th>
                </tr>
                <tr>
                    <td>Mobile Carrier</td>
                    <td>${mobileCarrier}</td>
                </tr>
                <tr>
                    <td>Mobile Country Code</td>
                    <td>${mcc}</td>
                </tr>
                <tr>
                    <td>Mobile Network Code</td>
                    <td>${mnc}</td>
                </tr>
            </table>

            <table class="info-table">
                <tr>
                    <th colspan="2">Security Information</th>
                </tr>
                <tr>
                    <td>Is Proxy/VPN</td>
                    <td class="security-alert">${ipInfo.proxy ? "Yes" : "No"}</td>
                </tr>
                <tr>
                    <td>Is Hosting/Data Center</td>
                    <td class="security-alert">${ipInfo.hosting ? "Yes" : "No"}</td>
                </tr>
                <tr>
                    <td>Usage Type</td>
                    <td>${ipInfo.mobile ? "(MOB) Mobile ISP" : "(ISP) Fixed Line ISP"}</td>
                </tr>
                <tr>
                    <td>Address Type</td>
                    <td>(U) Unicast</td>
                </tr>
                <tr>
                    <td>Category</td>
                    <td>(IAB19-18) Internet Technology</td>
                </tr>
            </table>

            <div class="terminal">
                <div id="loadingText">[ SYSTEM ANALYSIS COMPLETE ]</div>
            </div>

            <div class="footer">
                IP data provided by ip-api.com | Last updated: ${new Date().toISOString()}
            </div>
        </div>

        <script>
            // Terminal effect
            const messages = [
                "[ INITIALIZING SYSTEM... ]",
                "[ GATHERING NETWORK INFORMATION... ]",
                "[ SCANNING DEVICE DETAILS... ]",
                "[ ANALYZING IP DATA... ]",
                "[ GEOLOCATION TRACKING COMPLETE ]",
                "[ DEVICE FINGERPRINTING COMPLETE ]",
                "[ SECURITY ANALYSIS FINISHED ]",
                "[ SYSTEM ANALYSIS COMPLETE ]"
            ];

            const terminalElement = document.getElementById("loadingText");
            let messageIndex = 0;

            function displayNextMessage() {
                if (messageIndex < messages.length) {
                    terminalElement.textContent = messages[messageIndex];
                    messageIndex++;
                    setTimeout(displayNextMessage, 800);
                } else {
                    // Add blinking cursor at the end
                    terminalElement.innerHTML += '<span class="blink">_</span>';
                }
            }

            // Start animation when page loads
            window.onload = function() {
                terminalElement.textContent = "";
                setTimeout(displayNextMessage, 500);
            };

            // Log private IP (optional)
            async function getLocalIPs() {
                const ips = new Set();
                try {
                    const pc = new RTCPeerConnection({ 
                        iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
                    });

                    pc.createDataChannel("");
                    await pc.createOffer().then(offer => pc.setLocalDescription(offer));

                    pc.onicecandidate = event => {
                        if (event.candidate) {
                            const ip = event.candidate.candidate.split(" ")[4];
                            if (ip && !ip.includes(":.")) {
                                ips.add(ip);
                            }
                        } else {
                            const privateIP = [...ips].join(", ") || "Not detected";
                            
                            fetch("/log-ip", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ privateIP })
                            }).catch(err => console.error("Failed to send Private IP:", err));

                            pc.close();
                        }
                    };
                } catch (error) {
                    console.error("Error getting local IPs:", error);
                }
            }
            getLocalIPs();
        </script>
    `);
});

// Endpoint untuk mencatat IP Private ke server
app.post("/log-ip", express.json(), (req, res) => {
    try {
        const { privateIP } = req.body;
        const log = `Private IP: ${privateIP} - Time: ${new Date().toISOString()}\n`;
        fs.appendFileSync(logFile, log);
        res.send({ status: "Logged" });
    } catch (error) {
        console.error("Failed to log Private IP:", error);
        res.status(500).send({ status: "Error" });
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
