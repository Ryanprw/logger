const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // You'll need to install this: npm install axios

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure log directory exists
const logDir = path.join(__dirname, ".logs");
const logFile = path.join(logDir, "ip_log.txt");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Function to get user IP
function getClientIP(req) {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    if (ip.includes(",")) ip = ip.split(",")[0].trim();
    ip = ip.replace(/^::ffff:/, "").trim();
    return ip || "Unknown";
}

// Middleware to log IP for each request
app.use((req, res, next) => {
    try {
        const ip = getClientIP(req);
        const userAgent = req.headers["user-agent"] || "Unknown";
        const log = `IP: ${ip} - User Agent: ${userAgent} - Time: ${new Date().toISOString()}\n`;

        fs.appendFileSync(logFile, log);
        console.log(log.trim());
    } catch (error) {
        console.error("Failed to log:", error);
    }

    next();
});

// Main page with hacker-style effects and detailed IP info
app.get("/", async (req, res) => {
    const ip = getClientIP(req);
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
        // Get IP details from ip-api.com
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,as,mobile,proxy,hosting,query,zip`);
        if (response.data && response.data.status === "success") {
            ipInfo = response.data;
        }
    } catch (error) {
        console.error("Failed to fetch IP info:", error);
    }

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

    // Get coordinates formatted nicely
    const coordinates = ipInfo.lat && ipInfo.lon ? `${ipInfo.lat.toFixed(6)}, ${ipInfo.lon.toFixed(6)}` : "Unknown";
    
    // Format ASN
    const asn = ipInfo.as ? ipInfo.as.split(" ")[0] : "Unknown";
    const asnOrg = ipInfo.as ? ipInfo.as.substring(ipInfo.as.indexOf(" ") + 1) : "Unknown";

    // Determine mobile carrier
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
        </style>

        <div class="container">
            <h1>IP Address Information</h1>

            <div class="ip-container">
                <div class="ip-address">${ipInfo.query}</div>
            </div>

            <table class="info-table">
                <tr>
                    <th colspan="2">Location Information</th>
                </tr>
                <tr>
                    <td>Country</td>
                    <td>${ipInfo.country}</td>
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
                    <td>Coordinates</td>
                    <td>${coordinates}</td>
                </tr>
                <tr>
                    <td>ZIP Code</td>
                    <td>${ipInfo.zip || "N/A"}</td>
                </tr>
                <tr>
                    <td>Time Zone</td>
                    <td>${ipInfo.timezone}</td>
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
                    <td>${ipInfo.isp && ipInfo.isp.toLowerCase().includes("telkom") ? "telkom.co.id" : "N/A"}</td>
                </tr>
                <tr>
                    <td>Connection Type</td>
                    <td>${ipInfo.mobile ? "Mobile" : "Fixed Line"}</td>
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
                "[ ANALYZING IP DATA... ]",
                "[ GEOLOCATION TRACKING COMPLETE ]",
                "[ NETWORK DETAILS IDENTIFIED ]",
                "[ SECURITY ANALYSIS FINISHED ]",
                "[ SYSTEM ANALYSIS COMPLETE ]"
            ];

            const terminalElement = document.getElementById("loadingText");
            let messageIndex = 0;

            function displayNextMessage() {
                if (messageIndex < messages.length) {
                    terminalElement.textContent = messages[messageIndex];
                    messageIndex++;
                    setTimeout(displayNextMessage, 1000);
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

            // Log private IP (optional, similar to your original code)
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

// Endpoint for logging private IP to server
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

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
