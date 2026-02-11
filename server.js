import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'public')));

var AIRPORTS = {};

app.get('/api/flight', async (req, res) => {
  var number = req.query.number;
  if (!number) return res.status(400).json({ error: 'missing' });
  number = number.toUpperCase().replace(/\s/g, '');
  var API_KEY = process.env.AVIATIONSTACK_KEY || '29db7c5a9fc74671e4d83355587f7db2';
  try {
    var url = 'http://api.aviationstack.com/v1/flights?access_key=' + API_KEY + '&flight_iata=' + encodeURIComponent(number) + '&limit=1';
    var r = await fetch(url);
    if (!r.ok) return res.status(500).json({ error: 'API error ' + r.status });
    var data = await r.json();
    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    var f = data.data[0];
    var depIata = f.departure && f.departure.iata;
    var arrIata = f.arrival && f.arrival.iata;
    if (!depIata || !arrIata) return res.status(404).json({ error: 'Sin datos de aeropuerto' });
    var depTime = f.departure && f.departure.scheduled;
    var arrTime = f.arrival && f.arrival.scheduled;
    var dur = null;
    if (depTime && arrTime) {
      dur = Math.round((new Date(arrTime) - new Date(depTime)) / 60000);
      if (dur < 0) dur = dur + 1440;
    }
    var acModel = null;
    if (f.aircraft && f.aircraft.iata) acModel = f.aircraft.iata;
    res.json({
      flight: {
        number: number,
        airline: f.airline && f.airline.name,
        date: f.flight_date,
        status: f.flight_status
      },
      departure: {
        iata: depIata,
        name: f.departure.airport,
        city: null,
        lat: null,
        lon: null,
        scheduled: f.departure.scheduled,
        terminal: f.departure.terminal
      },
      arrival: {
        iata: arrIata,
        name: f.arrival.airport,
        city: null,
        lat: null,
        lon: null,
        scheduled: f.arrival.scheduled,
        terminal: f.arrival.terminal
      },
      aircraft: {
        model: acModel,
        type: detectAC(acModel),
        reg: f.aircraft && f.aircraft.registration
      },
      durationMin: dur
    });
  } catch (e) {
    console.error('API error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

function detectAC(m) {
  if (!m) return 'A320';
  m = m.toUpperCase();
  if (m.indexOf('321') >= 0) return 'A321';
  if (m.indexOf('32N') >= 0) return 'A320neo';
  if (m.indexOf('320') >= 0) return 'A320';
  if (m.indexOf('319') >= 0) return 'A319';
  if (m.indexOf('330') >= 0) return 'A330';
  if (m.indexOf('350') >= 0) return 'A350';
  if (m.indexOf('380') >= 0) return 'A380';
  if (m.indexOf('73H') >= 0 || m.indexOf('73X') >= 0) return 'B38M';
  if (m.indexOf('738') >= 0 || m.indexOf('73') >= 0) return 'B738';
  if (m.indexOf('787') >= 0 || m.indexOf('78') >= 0) return 'B787';
  if (m.indexOf('777') >= 0 || m.indexOf('77') >= 0) return 'B777';
  if (m.indexOf('E90') >= 0 || m.indexOf('E190') >= 0) return 'E190';
  if (m.indexOf('E95') >= 0 || m.indexOf('E195') >= 0) return 'E195';
  if (m.indexOf('AT') >= 0) return 'ATR';
  if (m.indexOf('CR') >= 0) return 'CRJ';
  return 'A320';
}

app.get('*', function(req, res) {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('MyFlight v3 on port ' + PORT);
});
