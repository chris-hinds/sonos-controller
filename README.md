# Kyuu

A local-first iOS controller for your Sonos speakers. No Sonos account required — everything runs on your own network.

> **This is an early beta.** Things may break. Feedback is very welcome.

---

## What it is

Kyuu is a native iOS app that controls your Sonos speakers directly over UPnP/SSDP — the same protocol Sonos uses internally. It talks to a lightweight server you run on your local network. No cloud, no account, no round trips.

Currently focused on **music playback**. Other content types are on the roadmap.

**Features:**
- Now Playing with progress bar
- Full playback control — play/pause, skip, shuffle, repeat
- Volume control per room
- Favorites / library browsing
- Queue management — view, reorder, jump to track
- Multi-room — switch between all speakers and groups
- Auto-discovery — the app scans your network to find the server automatically

---

## Getting started

You need to run the Kyuu server on a machine on the **same network as your Sonos speakers**. Then install the iOS app and it will find the server automatically.

### 1. Run the server

**Docker (recommended):**

```bash
docker run -d \
  --network host \
  --restart unless-stopped \
  --name kyuu \
  ghcr.io/that-creative/kyuu:latest
```

Or with Docker Compose:

```bash
curl -O https://raw.githubusercontent.com/that-creative/kyuu/main/docker-compose.yml
docker compose up -d
```

> Host networking is required for UPnP/SSDP speaker discovery. Docker Desktop on macOS/Windows does not support host networking — use a Linux machine or Raspberry Pi for Docker, or wait for the native binaries below.

**Binaries (coming soon):**

Mac and Windows binaries are in the works for those who don't want to run Docker. Linux and Raspberry Pi binaries are available on the [releases page](https://github.com/that-creative/kyuu/releases).

> **macOS 26 beta:** Compiled binaries are not yet compatible with macOS 26 due to a Bun limitation. Use Docker or run the server directly with `bun run apps/server/src/index.ts`.

### 2. Install the iOS app

The app is currently in **TestFlight beta**. [Join here →](https://testflight.apple.com/join/xxxxxxxx)

Once installed, open the app and tap **Scan Network** — it will find your server automatically. Or enter the server address manually (e.g. `http://192.168.1.x:3001`).

---

## Raspberry Pi

A Pi makes a great always-on host. Docker works well, or use the ARM64 binary:

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
- Make sure your phone and the server machine are on the same Wi-Fi network
- Try entering the server address manually: `http://<machine-ip>:3001`

**Port already in use**
```bash
PORT=8080 ./kyuu-linux-x64
```

---

## License

MIT
