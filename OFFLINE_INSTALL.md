# FlippedPOS — offline install (Windows + Docker)

Runs the whole system on one PC: the app, its database, and the till interface.
It keeps working without internet; it only needs a connection to check the
shop's licence — on first login, and roughly every 6 hours after that.

## Before you start

Install **Docker Desktop for Windows** from <https://www.docker.com/products/docker-desktop/>.
Choose the WSL2 backend when asked. Start it, and wait until it says
**Engine running**.

## Install

1. Copy the `FlippedPos_Offline_<date>_<id>.zip` onto the PC.
2. Right-click it → **Extract All**. Pick a permanent folder, e.g. `C:\FlippedPOS`
   (not Downloads — the app lives here from now on).
3. Open the extracted folder and double-click **`start.bat`**.

The first run builds the application and takes about 3–5 minutes. Later starts
take a few seconds. When it finishes, your browser opens on the till
automatically at <http://localhost:3001>.

`start.bat` also creates a `.env` file the first time and puts a security key in
it that is unique to this PC. There is nothing to fill in by hand.

## Day to day

| Task | How |
|---|---|
| Start | double-click `start.bat` |
| Stop | double-click `stop.bat` |
| Open the till | <http://localhost:3001> |
| See what it's doing | `docker compose logs -f app` |

The app starts by itself whenever Docker Desktop starts, so in normal use you
only run `start.bat` once.

## Settings

Open `.env` in Notepad. The ones worth knowing:

- **`APP_PORT`** — change it if something else on the PC already uses 3001
  (e.g. `APP_PORT=3005`), then run `start.bat` again.
- **`APP_URL`** — set this to the PC's network address if other tills or a phone
  will connect to it, e.g. `http://192.168.1.50:3001`.
- **`MASTER_API_URL`** — where the licence is checked. Leave it alone unless
  told otherwise.

## Your data

The database lives in a Docker volume called `pgdata` and survives restarts,
updates and PC reboots.

Back it up:

```
docker compose exec db pg_dump -U flippedpos flippedpos > backup.sql
```

Restore it:

```
type backup.sql | docker compose exec -T db psql -U flippedpos -d flippedpos
```

`stop.bat` keeps your data. Only `docker compose down -v` erases it.

## Updating

Extract the new zip **beside** the old folder, copy your existing `.env` into
it, and run `start.bat` there. The database is shared, so your data carries
over.

If you are coming from a package built before September 2026, the containers
were named differently. Run this once in the *old* folder first, or the new one
cannot claim the port:

```
docker compose down
```

## If it doesn't start

| Message | What to do |
|---|---|
| `Docker is not running` | Start Docker Desktop, wait for **Engine running**, try again |
| `port is already allocated` | Set `APP_PORT` in `.env` to a free port, run `start.bat` again |
| `set JWT_SECRET in .env` | Delete `.env` and run `start.bat` — it writes a fresh one |
| Browser shows nothing | Give it a minute on first run, then `docker compose logs app` |
