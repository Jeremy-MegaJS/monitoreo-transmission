const ICECAST_ENDPOINT = "https://radiofe.duckdns.org/status-json.xsl";
const REFRESH_INTERVAL_MS = 5000;

const listenersValue = document.getElementById("listeners-value");
const peakValue = document.getElementById("peak-value");
const bitrateValue = document.getElementById("bitrate-value");
const songValue = document.getElementById("song-value");
const statusValue = document.getElementById("status-value");
const lastUpdate = document.getElementById("last-update");
const statusAlert = document.getElementById("status-alert");

let offlineAlertShown = false;

function normalizeSources(sourceNode) {
  if (!sourceNode) {
    return [];
  }

  return Array.isArray(sourceNode) ? sourceNode : [sourceNode];
}

function pickSource(data) {
  const sources = normalizeSources(data?.icestats?.source);

  if (!sources.length) {
    return null;
  }

  return (
    sources.find((source) => Number(source?.listeners ?? 0) >= 0 && source?.listenurl) ||
    sources.find((source) => Number(source?.listeners ?? 0) >= 0) ||
    sources[0]
  );
}

function formatBitrate(bitrate) {
  const numericBitrate = Number(bitrate);
  return Number.isFinite(numericBitrate) && numericBitrate > 0
    ? `${numericBitrate} kbps`
    : "N/D";
}

function formatSongTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    return "Sin informacion de la cancion";
  }

  const normalizedTitle = title
    .replace(/^now playing\s*[:\-]?\s*/i, "")
    .replace(/^current (song|track)\s*[:\-]?\s*/i, "")
    .replace(/^playing\s*[:\-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedTitle) {
    return "Sin informacion de la cancion";
  }

  if (/^info goes here$/i.test(normalizedTitle) || /^info\b/i.test(normalizedTitle)) {
    return "Sin informacion de la cancion";
  }

  return normalizedTitle;
}

function updateTimestamp(message) {
  const formattedDate = new Date().toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  lastUpdate.textContent = `${message} ${formattedDate}`;
}

function renderOnline(source) {
  listenersValue.textContent = String(source?.listeners ?? "0");
  peakValue.textContent = String(source?.listener_peak ?? "0");
  bitrateValue.textContent = formatBitrate(source?.bitrate);
  songValue.textContent = formatSongTitle(source?.title);
  statusValue.textContent = "ONLINE";
  statusValue.classList.remove("offline");
  statusAlert.hidden = true;
  updateTimestamp("Ultima actualizacion correcta:");
  offlineAlertShown = false;
}

function renderOffline(reason) {
  listenersValue.textContent = "--";
  peakValue.textContent = "--";
  bitrateValue.textContent = "--";
  songValue.textContent = "Servidor no disponible";
  statusValue.textContent = "OFFLINE";
  statusValue.classList.add("offline");
  statusAlert.hidden = false;
  updateTimestamp("Sin conexion con la radio desde:");

  if (!offlineAlertShown) {
    window.alert("La radio esta OFFLINE. Contacta al tecnico Jeremy Torres para soporte.");
    offlineAlertShown = true;
  }

  if (reason) {
    console.error("No se pudo cargar el estado de Icecast:", reason);
  }
}

async function fetchRadioStats() {
  try {
    const response = await fetch(`${ICECAST_ENDPOINT}?_=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Respuesta HTTP no valida: ${response.status}`);
    }

    const data = await response.json();
    const source = pickSource(data);

    if (!source) {
      throw new Error("No se encontro una fuente activa en el JSON de Icecast.");
    }

    renderOnline(source);
  } catch (error) {
    renderOffline(error);
  }
}

fetchRadioStats();
window.setInterval(fetchRadioStats, REFRESH_INTERVAL_MS);
