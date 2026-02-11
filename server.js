import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'public')));

var COORDS = {
  MAD:[40.47,-3.56],BCN:[41.30,2.08],PMI:[39.55,2.74],AGP:[36.68,-4.50],
  ALC:[38.28,-0.56],VLC:[39.49,-0.47],SVQ:[37.42,-5.90],BIO:[43.30,-2.91],
  SCQ:[42.90,-8.42],TFS:[28.04,-16.57],LPA:[27.93,-15.39],ACE:[28.95,-13.61],
  FUE:[28.45,-13.86],IBZ:[38.87,1.37],MAH:[39.86,4.22],OVD:[43.56,-6.03],
  ZAZ:[41.67,-1.04],VGO:[42.23,-8.63],SDR:[43.43,-3.82],GRX:[37.19,-3.78],
  XRY:[36.74,-6.06],LEI:[36.84,-2.37],REU:[41.15,1.17],GRO:[41.90,2.76],
  LHR:[51.47,-0.45],LGW:[51.15,-0.18],STN:[51.89,0.24],LTN:[51.87,-0.37],
  MAN:[53.35,-2.28],BHX:[52.45,-1.75],EDI:[55.95,-3.37],GLA:[55.87,-4.43],
  BRS:[51.38,-2.72],NCL:[55.04,-1.69],LPL:[53.33,-2.85],EMA:[52.83,-1.33],
  FCO:[41.80,12.24],MXP:[45.63,8.72],LIN:[45.45,9.28],NAP:[40.89,14.29],
  BGY:[45.67,9.70],VCE:[45.51,12.35],BLQ:[44.53,11.29],PSA:[43.68,10.39],
  CTA:[37.47,15.07],PMO:[38.18,13.09],
  CDG:[49.01,2.55],ORY:[48.72,2.36],MRS:[43.44,5.21],NCE:[43.66,7.22],
  LYS:[45.73,5.08],TLS:[43.63,1.37],BOD:[44.83,-0.72],NTE:[47.15,-1.61],
  AMS:[52.31,4.76],BRU:[50.90,4.48],
  FRA:[50.03,8.57],MUC:[48.35,11.79],BER:[52.36,13.51],DUS:[51.29,6.77],
  HAM:[53.63,9.99],CGN:[50.87,7.14],STR:[48.69,9.22],
  LIS:[38.78,-9.14],OPO:[41.24,-8.68],FAO:[37.01,-7.97],
  ZRH:[47.46,8.55],GVA:[46.24,6.11],BSL:[47.59,7.53],
  VIE:[48.11,16.57],PRG:[50.10,14.26],WAW:[52.17,20.97],
  CPH:[55.62,12.66],OSL:[60.19,11.10],ARN:[59.65,17.94],HEL:[60.32,24.97],
  ATH:[37.94,23.94],IST:[41.26,28.74],SAW:[40.90,29.31],
  DUB:[53.43,-6.27],KEF:[63.99,-22.62],
  JFK:[40.64,-73.78],EWR:[40.69,-74.17],LAX:[33.94,-118.41],
  MIA:[25.80,-80.29],ORD:[41.97,-87.91],
  DOH:[25.26,51.57],DXB:[25.25,55.36],AUH:[24.43,54.65],
  BOG:[4.70,-74.15],GRU:[23.43,-46.47],EZE:[-34.82,-58.54],
  MEX:[19.44,-99.07],PTY:[9.07,-79.38],SCL:[-33.39,-70.79],
  SDQ:[18.43,-69.67],CUN:[21.04,-86.88],SJO:[9.99,-84.21],
  PEK:[40.08,116.58],PVG:[31.14,121.81],NRT:[35.76,140.39],
  HND:[35.55,139.78],ICN:[37.46,126.44],SIN:[1.35,103.99],
  BKK:[13.68,100.75],HKG:[22.31,113.91],
  SYD:[-33.95,151.18],MEL:[-37.67,144.84],
  JNB:[-26.14,28.25],CPT:[-33.96,18.60],CMN:[33.37,-7.59],
  CAI:[30.12,31.41],ADD:[8.98,38.80],NBO:[-1.32,36.93],
};

// Get UTC offset in minutes for a timezone name at a given date
function getUtcOffset(tzName, date) {
  try {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      timeZoneName: 'shortOffset'
    });
    var parts = fmt.formatToParts(date);
    var tzPart = parts.find(function(p) { return p.type === 'timeZoneName'; });
    if (!tzPart) return null;
    // tzPart.value is like "GMT+1", "GMT-5", "GMT+5:30", "GMT"
    var val = tzPart.value.replace('GMT', '');
    if (!val || val === '') return 0;
    var sign = val.charAt(0) === '-' ? -1 : 1;
    val = val.replace(/^[+-]/, '');
    var hm = val.split(':');
    var hours = parseInt(hm[0]) || 0;
    var mins = parseInt(hm[1]) || 0;
    return sign * (hours * 60 + mins);
  } catch(e) {
    return null;
  }
}

// Convert local time string + timezone to real UTC timestamp
function localToUtc(timeStr, tzName) {
  // timeStr is like "2026-02-11T16:05:00+00:00" but it's actually local time
  // Strip the fake +00:00 and parse as local
  var clean = timeStr.replace(/[+-]\d{2}:\d{2}$/, '');
  var date = new Date(clean + 'Z'); // Parse as if UTC
  var offsetMin = getUtcOffset(tzName, date);
  if (offsetMin === null) return date; // fallback
  // Subtract offset to get real UTC
  return new Date(date.getTime() - offsetMin * 60000);
}

// Calculate distance in km between two coords (haversine)
function distKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/flight', async function(req, res) {
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
    var depCoords = COORDS[depIata] || null;
    var arrCoords = COORDS[arrIata] || null;

    // Duration: use timezone-corrected calculation
    var depTime = f.departure && f.departure.scheduled;
    var arrTime = f.arrival && f.arrival.scheduled;
    var depTz = f.departure && f.departure.timezone;
    var arrTz = f.arrival && f.arrival.timezone;
    var dur = null;
    var depUtc = null;
    var arrUtc = null;

    if (depTime && arrTime && depTz && arrTz) {
      depUtc = localToUtc(depTime, depTz);
      arrUtc = localToUtc(arrTime, arrTz);
      dur = Math.round((arrUtc - depUtc) / 60000);
      if (dur < 0) dur = dur + 1440;
    }

    // Fallback: estimate from distance if timezone conversion failed or dur seems wrong
    if ((!dur || dur < 20) && depCoords && arrCoords) {
      var dist = distKm(depCoords[0], depCoords[1], arrCoords[0], arrCoords[1]);
      dur = Math.round(dist / 13.5 + 30); // ~810 km/h cruise + 30 min taxi/climb/descent
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
        lat: depCoords ? depCoords[0] : null,
        lon: depCoords ? depCoords[1] : null,
        scheduled: f.departure.scheduled,
        scheduledLocal: depTime,
        terminal: f.departure.terminal,
        timezone: depTz
      },
      arrival: {
        iata: arrIata,
        name: f.arrival.airport,
        city: null,
        lat: arrCoords ? arrCoords[0] : null,
        lon: arrCoords ? arrCoords[1] : null,
        scheduled: f.arrival.scheduled,
        scheduledLocal: arrTime,
        terminal: f.arrival.terminal,
        timezone: arrTz
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
  if (m.indexOf('73H') >= 0 || m.indexOf('7M8') >= 0) return 'B38M';
  if (m.indexOf('738') >= 0 || m.indexOf('73') >= 0) return 'B738';
  if (m.indexOf('787') >= 0 || m.indexOf('78') >= 0) return 'B787';
  if (m.indexOf('777') >= 0 || m.indexOf('77') >= 0) return 'B777';
  if (m.indexOf('E90') >= 0) return 'E190';
  if (m.indexOf('E95') >= 0) return 'E195';
  if (m.indexOf('AT') >= 0) return 'ATR';
  if (m.indexOf('CR') >= 0) return 'CRJ';
  return 'A320';
}

app.get('*', function(req, res) {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('MyFlight v5 on port ' + PORT);
});
