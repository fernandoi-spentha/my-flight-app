import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'public')));

// ============================================================
// AIRPORT COORDINATES
// ============================================================
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
  TNG:[35.73,-5.92],RAK:[31.61,-8.04],AGA:[30.33,-9.41],FEZ:[33.93,-4.98],
  NDR:[34.99,-3.03],OUJ:[34.79,-1.92],ESU:[31.40,-9.68],
  ALG:[36.69,3.22],TUN:[36.85,10.23],ORN:[35.62,-0.62],
};

// ============================================================
// TIMEZONE HELPERS
// ============================================================
function getUtcOffset(tzName, date) {
  try {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: tzName, timeZoneName: 'shortOffset' });
    var parts = fmt.formatToParts(date);
    var tzPart = parts.find(function(p) { return p.type === 'timeZoneName'; });
    if (!tzPart) return null;
    var val = tzPart.value.replace('GMT', '');
    if (!val || val === '') return 0;
    var sign = val.charAt(0) === '-' ? -1 : 1;
    val = val.replace(/^[+-]/, '');
    var hm = val.split(':');
    return sign * ((parseInt(hm[0]) || 0) * 60 + (parseInt(hm[1]) || 0));
  } catch(e) { return null; }
}

function localToUtc(timeStr, tzName) {
  var clean = timeStr.replace(/[+-]\d{2}:\d{2}$/, '');
  var date = new Date(clean + 'Z');
  var offsetMin = getUtcOffset(tzName, date);
  if (offsetMin === null) return date;
  return new Date(date.getTime() - offsetMin * 60000);
}

function distKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// WEATHER CACHE — 1 hour TTL
// ============================================================
var weatherCache = {};
var CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheKey(lat, lon, hour) {
  // Round coords to 0.5 degree grid for cache efficiency
  var rLat = (Math.round(lat * 2) / 2).toFixed(1);
  var rLon = (Math.round(lon * 2) / 2).toFixed(1);
  return rLat + ',' + rLon + '@' + hour;
}

function getCached(key) {
  var entry = weatherCache[key];
  if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry.data;
  if (entry) delete weatherCache[key];
  return null;
}

function setCache(key, data) {
  weatherCache[key] = { data: data, ts: Date.now() };
  // Prune old entries every 100 inserts
  var keys = Object.keys(weatherCache);
  if (keys.length > 500) {
    var now = Date.now();
    for (var i = 0; i < keys.length; i++) {
      if ((now - weatherCache[keys[i]].ts) > CACHE_TTL) delete weatherCache[keys[i]];
    }
  }
}

// ============================================================
// OPEN-METEO WEATHER FETCHING
// ============================================================
async function fetchPointWeather(lat, lon, targetDate) {
  var target = targetDate || new Date();
  var targetHour = target.toISOString().substring(0, 13); // e.g. "2026-02-16T15"
  var key = cacheKey(lat, lon, targetHour);
  var cached = getCached(key);
  if (cached) return cached;

  try {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
      + '&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover'
      + '&hourly=cloud_cover_1000hPa,cloud_cover_925hPa,cloud_cover_850hPa,cloud_cover_700hPa,cloud_cover_600hPa,cloud_cover_500hPa,cloud_cover_400hPa,cloud_cover_300hPa,cloud_cover_250hPa,cloud_cover_200hPa,cape,lifted_index,windspeed_300hPa,windspeed_250hPa,windspeed_200hPa,windspeed_500hPa,windspeed_700hPa,windspeed_850hPa'
      + '&forecast_days=2&timezone=UTC';

    var r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var d = await r.json();
    var c = d.current;
    var h = d.hourly;

    // Find best hourly index
    var bestIdx = 0;
    if (h.time && h.time.length > 0) {
      var targetMs = target.getTime();
      var minDiff = Infinity;
      for (var ti = 0; ti < h.time.length; ti++) {
        var diff = Math.abs(new Date(h.time[ti] + 'Z').getTime() - targetMs);
        if (diff < minDiff) { minDiff = diff; bestIdx = ti; }
      }
    }

    var profile = [
      {hPa:1000, altM:100,   cover: h.cloud_cover_1000hPa[bestIdx]},
      {hPa:925,  altM:750,   cover: h.cloud_cover_925hPa[bestIdx]},
      {hPa:850,  altM:1500,  cover: h.cloud_cover_850hPa[bestIdx]},
      {hPa:700,  altM:3000,  cover: h.cloud_cover_700hPa[bestIdx]},
      {hPa:600,  altM:4200,  cover: h.cloud_cover_600hPa[bestIdx]},
      {hPa:500,  altM:5500,  cover: h.cloud_cover_500hPa[bestIdx]},
      {hPa:400,  altM:7200,  cover: h.cloud_cover_400hPa[bestIdx]},
      {hPa:300,  altM:9200,  cover: h.cloud_cover_300hPa[bestIdx]},
      {hPa:250,  altM:10400, cover: h.cloud_cover_250hPa[bestIdx]},
      {hPa:200,  altM:11800, cover: h.cloud_cover_200hPa[bestIdx]}
    ];

    var cL = Math.max(profile[0].cover, profile[1].cover, profile[2].cover);
    var cM = Math.max(profile[3].cover, profile[4].cover, profile[5].cover);
    var cH = Math.max(profile[6].cover, profile[7].cover, profile[8].cover, profile[9].cover);

    var cape = (h.cape && h.cape[bestIdx] != null) ? h.cape[bestIdx] : 0;
    var liftedIdx = (h.lifted_index && h.lifted_index[bestIdx] != null) ? h.lifted_index[bestIdx] : 0;
    var ws300 = (h.windspeed_300hPa && h.windspeed_300hPa[bestIdx]) || 0;
    var ws250 = (h.windspeed_250hPa && h.windspeed_250hPa[bestIdx]) || 0;
    var ws200 = (h.windspeed_200hPa && h.windspeed_200hPa[bestIdx]) || 0;
    var ws500 = (h.windspeed_500hPa && h.windspeed_500hPa[bestIdx]) || 0;
    var ws700 = (h.windspeed_700hPa && h.windspeed_700hPa[bestIdx]) || 0;
    var ws850 = (h.windspeed_850hPa && h.windspeed_850hPa[bestIdx]) || 0;

    var result = {
      temp: Math.round(c.temperature_2m),
      ws: Math.round(c.wind_speed_10m),
      wd: Math.round(c.wind_direction_10m),
      cL: Math.round(cL), cM: Math.round(cM), cH: Math.round(cH),
      profile: profile,
      real: true,
      forecastHour: h.time[bestIdx],
      cape: Math.round(cape),
      liftedIdx: Math.round(liftedIdx),
      // Shear: max of adjacent-layer differences near cruise altitude
      // 200-250hPa (~11800-10400m), 250-300hPa (~10400-9200m), 300-500hPa (~9200-5500m)
      cruiseShear: Math.round(Math.max(
        Math.abs(ws200 - ws250),
        Math.abs(ws250 - ws300),
        Math.abs(ws300 - ws500) * 0.5  // scale down because 3700m span vs ~1200m for the others
      )),
      cruiseWind: Math.round(Math.max(ws300, ws250, ws200)),
      lowWind: Math.round(ws850)
    };

    setCache(key, result);
    return result;
  } catch(e) {
    console.log('Weather API error for', lat, lon, e.message);
    return null;
  }
}

// ============================================================
// ROUTE WEATHER — fetch all points with rate limit protection
// ============================================================
async function fetchRouteWeather(depLat, depLon, arrLat, arrLon, depTimeISO, durationMin) {
  var depUTC = new Date();
  if (depTimeISO) {
    var parsed = new Date(depTimeISO);
    if (!isNaN(parsed.getTime())) depUTC = parsed;
  }
  var dur = durationMin || 150;
  var durMs = dur * 60000;

  // Dynamic sampling: one point every ~15 min
  var numPoints = Math.max(4, Math.min(20, Math.round(dur / 15)));
  var points = [];
  for (var i = 0; i <= numPoints; i++) {
    var frac = i / numPoints;
    var lat = depLat + (arrLat - depLat) * frac;
    var lon = depLon + (arrLon - depLon) * frac;
    var passTime = new Date(depUTC.getTime() + frac * durMs);
    points.push({ frac: frac, lat: lat, lon: lon, passTime: passTime });
  }

  // Fetch with small delay between requests to avoid 429
  var results = [];
  for (var j = 0; j < points.length; j++) {
    var w = await fetchPointWeather(points[j].lat, points[j].lon, points[j].passTime);
    results.push(w);
    // Small delay between requests (skip if cached)
    if (j < points.length - 1 && w && w.real) {
      await new Promise(function(r) { setTimeout(r, 100); });
    }
  }

  var route = [];
  for (var k = 0; k < points.length; k++) {
    route.push({ frac: points[k].frac, w: results[k] });
  }

  return {
    origin: results[0],
    destination: results[results.length - 1],
    route: route
  };
}

// ============================================================
// AIRCRAFT DETECTION
// ============================================================
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

// ============================================================
// FLIGHT API ENDPOINT
// ============================================================
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

    var depTime = f.departure && f.departure.scheduled;
    var arrTime = f.arrival && f.arrival.scheduled;
    var depTz = f.departure && f.departure.timezone;
    var arrTz = f.arrival && f.arrival.timezone;
    var dur = null;
    var depUtc = null;

    if (depTime && arrTime && depTz && arrTz) {
      depUtc = localToUtc(depTime, depTz);
      var arrUtc = localToUtc(arrTime, arrTz);
      dur = Math.round((arrUtc - depUtc) / 60000);
      if (dur < 0) dur = dur + 1440;
    }

    if ((!dur || dur < 20) && depCoords && arrCoords) {
      var dist = distKm(depCoords[0], depCoords[1], arrCoords[0], arrCoords[1]);
      dur = Math.round(dist / 13.5 + 30);
    }

    var acModel = null;
    if (f.aircraft && f.aircraft.iata) acModel = f.aircraft.iata;

    // Fetch route weather from server (cached, rate-limited)
    var weather = null;
    if (depCoords && arrCoords && dur) {
      try {
        var depTimeUTC = depUtc ? depUtc.toISOString() : null;
        weather = await fetchRouteWeather(
          depCoords[0], depCoords[1],
          arrCoords[0], arrCoords[1],
          depTimeUTC, dur
        );
      } catch(e) {
        console.log('Route weather fetch failed:', e.message);
      }
    }

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
      durationMin: dur,
      weather: weather
    });
  } catch (e) {
    console.error('API error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', function(req, res) {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('MyFlight v6 on port ' + PORT);
});
