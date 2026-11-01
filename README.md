# Rueda de Casino Simulator

Ein Simulator für Salsa Rueda (Rueda de Casino) im Browser: Paare tanzen im Kreis, du bist der Cantante und rufst die Figuren an.

**Live:** https://oblomov-dev.github.io/test/

## Funktionen

- Paare im Kreis (3–10), Tempo 40–260 BPM, Beat-für-Beat vor- und zurückspulen
- Tanzen **auf 1** oder **auf 2** (contratiempo)
- Füße mit Fußform, Gewichtsfuß, Spuren, Kollisionswarnung, Hände, Abstandsmaße
- Figuren: Guapea, Dame, Dame dos, Enchufla, Enchufla doble, Adiós, Exhíbela, Sombrero, Setenta, Arriba, Abajo
- Musik: eigene Audiodatei (mit Tempoerkennung) oder **Spotify-Link** über den offiziellen Embed-Player – der Zähler läuft synchron zur Abspielposition
- Band mit 16 Instrumenten (echte Samples), Partitur mit Betonungszeile, Salsa- und Son-Stil, sechs fertige Songs
- 3D-Ansicht: Gliederpuppen mit Knie- und Ellbogen-IK, Cuban Motion, frei drehbare Kamera
- Editor für Schrittfolgen und Figuren (JSON)

Keine Installation nötig – einfach `index.html` über einen Webserver öffnen (wegen der nachgeladenen Samples nicht per `file://`), z. B.:

```sh
python3 -m http.server 8000
```

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Simulator (2D, Band, Partitur, Bedienung) |
| `samples.json` | Instrumenten-Samples als MP3 (Base64), gerendert aus GeneralUser GS |
| `lib/rueda3d.js` | 3D-Ansicht mit inverser Kinematik |
| `lib/three.module.min.js`, `lib/addons/` | three.js r160 |

## Lizenzen und Credits

- Eigener Code: siehe [LICENSE](LICENSE)
- Instrumenten-Samples: gerendert aus **GeneralUser GS v1.471** von S. Christian Collins – http://www.schristiancollins.com – Lizenz: [GENERALUSER-GS-LICENSE.txt](GENERALUSER-GS-LICENSE.txt)
- **three.js** (MIT) – https://threejs.org – Lizenz: [lib/THREE-LICENSE.txt](lib/THREE-LICENSE.txt)
- Die Songs sind eigene Arrangements über gängige Akkordfolgen.
