# MyFlight ✈️

**Tu copiloto narrativo. Sabe lo que vas a sentir antes de despegar.**

## Estructura

```
myflight/
├── server.js          ← Servidor Express (API + frontend)
├── public/
│   └── index.html     ← La app completa
├── package.json
└── README.md
```

## Despliegue en Railway

1. Sube este código a tu repositorio de GitHub
2. Ve a railway.com → Sign up con GitHub
3. New Project → Deploy from GitHub repo → elige "myflight"
4. Railway detecta Node.js automáticamente y despliega
5. Ve a Settings → Networking → Generate Domain (te da una URL pública)
6. (Opcional) En Variables, añade: AERODATABOX_KEY = tu API key

## APIs

| API | Uso | Coste |
|-----|-----|-------|
| AeroDataBox | Datos de vuelo | Gratis 300 calls/mes |
| Open-Meteo | Meteorología | Gratis |
