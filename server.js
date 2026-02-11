import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(join(__dirname, 'public')));

// API: Flight lookup via AeroDataBox
app.get('/api/flight', async (req, res) => {
  const { number, date } = req.query;

  if (!number) {
    return res.status(400).json({ error: 'Falta el número de vuelo' });
  }

  const API_KEY = process.env.AERODATABOX_KEY;
  if (!API_KEY) {
    return res.status(200).json({ error: 'API key no configurada', fallback: true });
  }

  try {
    const flightDate = date || new Date().toISOString().split('T')[0];
    const flightUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(number)}/${flightDate}`;

    const flightRes = await fetch(flightUrl, {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    });

    if (!flightRes.ok) {
      if (flightRes.status === 404) {
        return res.status(404).json({ error: 'Vuelo no encontrado' });
      }
      throw new Error(`AeroDataBox error: ${flightRes.status}`);
    }

    const flights = await flightRes.json();
    if (!flights || flights.length === 0) {
      return res.status(404).json({ error: 'Vuelo no encontrado para esa fecha' });
    }

    const f = flights[0];
    const depIata = f.departure?.airport?.iata;
    const arrIata = f.arrival?.airport?.iata;

    if (!depIata || !arrIata) {
      return res.status(404).json({ error: 'Datos de aeropuerto no disponibles' });
    }

    // Get airport coordinates
    const [depAirport, arrAirport] = await Promise.all([
      fetchAirport(depIata, API_KEY),
      fetchAirport(arrIata, API_KEY),
    ]);

    // Duration
    const depTime = f.departure?.scheduledTime?.utc || f.departure?.scheduledTime?.local;
    const arrTime = f.arrival?.scheduledTime?.utc || f.arrival?.scheduledTime?.local;
    let durationMin = null;
    if (depTime && arrTime) {
      durationMin = Math.round((new Date(arrTime) - new Date(depTime)) / 60000);
      if (durationMin < 0) durationMin += 1440;
    }

    // Aircraft type
    const acType = detectAircraftType(f.aircraft?.model);

    return res.json({
      flight: {
        number: number.toUpperCase(),
        airline: f.airline?.name || null,
        date: flightDate,
      },
      departure: {
        iata: depIata,
        name: depAirport.name || f.departure?.airport?.name,
        city: depAirport.city || null,
        lat: depAirport.lat,
        lon: depAirport.lon,
        scheduledLocal: f.departure?.scheduledTime?.local || null,
        terminal: f.departure?.terminal || null,
      },
      arrival: {
        iata: arrIata,
        name: arrAirport.name || f.arrival?.airport?.name,
        city: arrAirport.city || null,
        lat: arrAirport.lat,
        lon: arrAirport.lon,
        scheduledLocal: f.arrival?.scheduledTime?.local || null,
        terminal: f.arrival?.terminal || null,
      },
      aircraft: {
        model: f.aircraft?.model || null,
        type: acType,
        reg: f.aircraft?.reg || null,
      },
      durationMin: durationMin,
    });

  } catch (err) {
    console.error('Flight API error:', err);
    return res.status(500).json({ error: 'Error al buscar el vuelo: ' + err.message });
  }
});

async function fetchAirport(iata, apiKey) {
  try {
    const url = `https://aerodatabox.p.rapidapi.com/airports/iata/${iata}`;
    const r = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    });
    if (!r.ok) return { lat: null, lon: null, name: null, city: null };
    const data = await r.json();
    return {
      lat: data.location?.lat || null,
      lon: data.location?.lon || null,
      name: data.fullName || data.shortName || null,
      city: data.municipalityName || data.shortName || null,
    };
  } catch {
    return { lat: null, lon: null, name: null, city: null };
  }
}

function detectAircraftType(model) {
  if (!model) return 'A320';
  const m = model.toUpperCase();
  if (m.includes('A320') && m.includes('NEO')) return 'A320neo';
  if (m.includes('A321')) return 'A321';
  if (m.includes('A319')) return 'A319';
  if (m.includes('A320')) return 'A320';
  if (m.includes('A330')) return 'A330';
  if (m.includes('A350')) return 'A350';
  if (m.includes('A380')) return 'A380';
  if (m.includes('737') && m.includes('MAX')) return 'B38M';
  if (m.includes('737')) return 'B738';
  if (m.includes('787')) return 'B787';
  if (m.includes('777')) return 'B777';
  if (m.includes('E190') || m.includes('ERJ-190')) return 'E190';
  if (m.includes('E195')) return 'E195';
  if (m.includes('ATR')) return 'ATR';
  if (m.includes('CRJ') || m.includes('DASH')) return 'CRJ';
  return 'A320';
}

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MyFlight running on port ${PORT}`);
});
