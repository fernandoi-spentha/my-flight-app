import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'public')));

app.get('/api/flight', async (req, res) => {
  const { number, date } = req.query;
  if (!number) return res.status(400).json({ error: 'missing' });
  const API_KEY = process.env.AERODATABOX_KEY || '2fb54a8e4fmsh09082c6f80a8bcep15c30';
  console.log('KEY check:', !!API_KEY);
  if (!API_KEY) return res.json({ error: 'no-key', fallback: true, env: Object.keys(process.env).filter(k => k.indexOf('AERO') >= 0) });
  try {
    const fd = date || new Date().toISOString().split('T')[0];
   var url = 'https://aerodatabox.p.rapidapi.com/flights/number/' + encodeURIComponent(number);
if (fd) url = url + '/' + fd;
const r1 = await fetch(url, {
      headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' }
    });
    if (!r1.ok) return res.status(404).json({ error: 'not found' });
    const flights = await r1.json();
    if (!flights || !flights.length) return res.status(404).json({ error: 'not found' });
    const f = flights[0];
    const depIata = f.departure && f.departure.airport && f.departure.airport.iata;
    const arrIata = f.arrival && f.arrival.airport && f.arrival.airport.iata;
    if (!depIata || !arrIata) return res.status(404).json({ error: 'no airports' });
    const depAP = await getAP(depIata, API_KEY);
    const arrAP = await getAP(arrIata, API_KEY);
    const depT = f.departure && f.departure.scheduledTime && f.departure.scheduledTime.utc;
    const arrT = f.arrival && f.arrival.scheduledTime && f.arrival.scheduledTime.utc;
    var dur = null;
    if (depT && arrT) {
      dur = Math.round((new Date(arrT) - new Date(depT)) / 60000);
      if (dur < 0) dur = dur + 1440;
    }
    var model = f.aircraft && f.aircraft.model;
    res.json({
      flight: { number: number.toUpperCase(), airline: f.airline && f.airline.name, date: fd },
      departure: { iata: depIata, name: depAP.name, city: depAP.city, lat: depAP.lat, lon: depAP.lon },
      arrival: { iata: arrIata, name: arrAP.name, city: arrAP.city, lat: arrAP.lat, lon: arrAP.lon },
      aircraft: { model: model, type: detectAC(model), reg: f.aircraft && f.aircraft.reg },
      durationMin: dur
    });
  } catch (e) {
    console.error('API error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

async function getAP(iata, key) {
  try {
    const r = await fetch('https://aerodatabox.p.rapidapi.com/airports/iata/' + iata, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' }
    });
    if (!r.ok) return { lat: null, lon: null, name: null, city: null };
    const d = await r.json();
    return { lat: d.location && d.location.lat, lon: d.location && d.location.lon, name: d.fullName || d.shortName, city: d.municipalityName || d.shortName };
  } catch (e) {
    return { lat: null, lon: null, name: null, city: null };
  }
}

function detectAC(m) {
  if (!m) return 'A320';
  m = m.toUpperCase();
  if (m.indexOf('A321') >= 0) return 'A321';
  if (m.indexOf('A320') >= 0 && m.indexOf('NEO') >= 0) return 'A320neo';
  if (m.indexOf('A320') >= 0) return 'A320';
  if (m.indexOf('A319') >= 0) return 'A319';
  if (m.indexOf('A330') >= 0) return 'A330';
  if (m.indexOf('A350') >= 0) return 'A350';
  if (m.indexOf('737') >= 0 && m.indexOf('MAX') >= 0) return 'B38M';
  if (m.indexOf('737') >= 0) return 'B738';
  if (m.indexOf('787') >= 0) return 'B787';
  if (m.indexOf('777') >= 0) return 'B777';
  if (m.indexOf('E190') >= 0) return 'E190';
  if (m.indexOf('E195') >= 0) return 'E195';
  if (m.indexOf('ATR') >= 0) return 'ATR';
  return 'A320';
}

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('MyFlight v2 running on port ' + PORT);
});
