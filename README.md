# Iris Neumann — KI-Assistenz für sasserath + bitter

Persönliche KI-Assistenz für Thomas und Beate. Phase 1.

## Setup (lokal)

```bash
# 1. Dependencies installieren
npm install

# 2. API-Key konfigurieren
cp .env.example .env.local
# .env.local öffnen und ANTHROPIC_API_KEY eintragen

# 3. Starten
npm run dev
# → http://localhost:3000
```

## Deploy auf Vercel

1. **Vercel-Account** anlegen (kostenlos): https://vercel.com
2. **Repository** auf GitHub pushen
3. **Vercel Projekt** anlegen → GitHub Repo verbinden
4. **Environment Variable** setzen:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Dein API-Key von https://console.anthropic.com/keys
5. **Custom Domain**: In Vercel-Einstellungen `iris.sasserath-bitter.de` eintragen
6. **CNAME bei IONOS**: `iris` → `cname.vercel-dns.com`

Deployment dauert ~2 Minuten, Domain-Propagation bis zu 24h.

## Handy (PWA)

Nach dem Deploy:
- **iOS**: Safari öffnen → Teilen → "Zum Home-Bildschirm" → sieht aus wie eine native App
- **Android**: Chrome öffnen → Menü → "Zum Startbildschirm hinzufügen"

## Features (Phase 1)

| Feature | Status |
|---|---|
| Chat mit Freitext | ✅ |
| Diktat (Deutsch) | ✅ Chrome/Edge |
| Aufgaben anlegen mit Priorität + Datum | ✅ |
| Notizen ablegen | ✅ |
| Protokoll-Extraktion (Call-Notizen einfügen) | ✅ |
| Delegation Thomas ↔ Beate | ✅ |
| Projektkontexte | ✅ |
| PWA (Homescreen-Icon) | ✅ |
| Push-Benachrichtigungen | ❌ Phase 2 |
| Teams-Integration | ❌ Phase 2 |

## DSGVO-Hinweis

Vor produktiver Nutzung: Anthropic DPA abschließen unter https://privacy.anthropic.com/dpa
Keine Klarnamen von Mandanten in Kombination mit sensiblen Daten.

## Daten

Alle Daten liegen lokal im Browser (localStorage). Kein Backend, kein Datenbankserver.
- Private Daten pro Nutzer: `iris_private_thomas` / `iris_private_beate`
- Geteilte Delegationen: `iris_shared_delegation`

Für Delegation zwischen verschiedenen Geräten: Vercel KV (Redis) einbinden — 
dann `lib/storage.ts` auf Server-Side-Storage umstellen (vorbereitet).
