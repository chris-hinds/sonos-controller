# Kyuu

A local-first iOS controller for your Sonos speakers. No Sonos account required — everything runs on your own network.

> **This is an early beta.** Things may break. Feedback is very welcome — open an issue or reach out directly.

---

## iOS App

The app is in **TestFlight beta**.

**[Join the beta →](https://testflight.apple.com/join/vQGcawus)**

Once installed, open the app and tap **Scan Network** — it will find your server automatically. Or enter the server address manually (e.g. `http://192.168.1.x:3001`).

---

## What it is

Kyuu is a native iOS companion controller for Sonos, built around clean UI and focused purely on music playback. It talks to a lightweight server you run on your local network using UPnP/SSDP — the same protocol Sonos uses internally. No cloud, no account, no round trips.

**Features:**
- Now Playing with album art and progress bar
- Full playback control — play/pause, skip, shuffle, repeat
- Volume control per room
- Favorites / library browsing
- Queue management — view, reorder, jump to track
- Multi-room — switch between all speakers and groups
- Auto-discovery — the app scans your network to find the server automatically

---

## Server setup

The Kyuu server must run on a machine on the **same local network as your Sonos speakers**. It handles speaker discovery, state polling, and proxies commands from the app.

### Option A — Binary (easiest)

Download the binary for your platform from the [latest release](https://github.com/that-creative/kyuu/releases/latest):

| Platform | File |
|----------|------|
| macOS Apple Silicon | `kyuu-macos-arm64` |
| macOS Intel | `kyuu-macos-x64` |
| Linux x64 | `kyuu-linux-x64` |
| Linux ARM64 (Raspberry Pi) | `kyuu-linux-arm64` |
| Windows | `kyuu-windows-x64.exe` |

**macOS:**
```bash
chmod +x ./kyuu-macos-arm64
./kyuu-macos-arm64
```

> **Security warning:** macOS will block the binary the first time because it's not signed with an Apple Developer certificate. To allow it, go to **System Settings → Privacy & Security** and click **Open Anyway**. Alternatively, remove the quarantine flag before running:
> ```bash
> xattr -d com.apple.quarantine ./kyuu-macos-arm64
> ```

**Linux:**
```bash
chmod +x ./kyuu-linux-x64
./kyuu-linux-x64
```

**Windows:** Double-click `kyuu-windows-x64.exe`

> **Security warning:** Windows SmartScreen may show an "Unknown publisher" warning. Click **More info → Run anyway** to proceed. The binary is safe — it's simply not signed with a Microsoft-recognised certificate.

The server starts on port 3001. No Node.js or Docker required.

---

### Option B — Docker

Requires Docker on a Linux machine on the same network as your Sonos speakers. Host networking is required for UPnP/SSDP discovery.

> Docker Desktop on macOS/Windows does not support host networking — use the binary instead, or run Docker on a Linux machine or Raspberry Pi.

**Docker Compose (recommended):**
```bash
curl -O https://raw.githubusercontent.com/that-creative/kyuu/main/docker-compose.yml
docker compose up -d
```

**Docker directly:**
```bash
docker run -d \
  --network host \
  --restart unless-stopped \
  --name kyuu \
  ghcr.io/that-creative/kyuu:latest
```

**Custom port:**
```bash
docker run -d \
  --network host \
  -e PORT=8080 \
  --name kyuu \
  ghcr.io/that-creative/kyuu:latest
```

---

### Raspberry Pi

A Pi makes a great always-on host. Use Docker or the ARM64 binary:

```bash
wget https://github.com/that-creative/kyuu/releases/latest/download/kyuu-linux-arm64
chmod +x kyuu-linux-arm64
./kyuu-linux-arm64
```

**Run on boot with systemd:**

```ini
# /etc/systemd/system/kyuu.service
[Unit]
Description=Kyuu — local Sonos controller
After=network.target

[Service]
ExecStart=/home/pi/kyuu-linux-arm64
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now kyuu
```

---

## How it works

```
iOS app  ──HTTP──▶  Kyuu server  ──UPnP──▶  Sonos speakers
                       :3001
```

- **Discovery** — SSDP multicast finds all speakers on the network automatically
- **State** — speaker state is polled and pushed to the app via Server-Sent Events
- **Commands** — playback, volume, and queue commands are proxied directly to the relevant speaker

---

## Troubleshooting

**No speakers found**
- Confirm the server is on the same network as your Sonos system
- If using Docker, ensure `network_mode: host` is set
- Check that no firewall is blocking UDP 1900 (SSDP) or TCP 1400 (UPnP)

**App can't find the server**
- Make sure your phone and the server are on the same Wi-Fi network
- Try entering the server address manually: `http://<machine-ip>:3001`

**Port already in use**
```bash
PORT=8080 ./kyuu-linux-x64
```

---

## License

MIT
