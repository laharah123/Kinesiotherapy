# Required fonts

Place the following font files in this directory before building:

| File | Source |
|---|---|
| `InstrumentSerif-Regular.ttf` | [Google Fonts — Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) |
| `InstrumentSerif-Italic.ttf` | Same package |
| `Inter-Regular.ttf` | [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) |
| `Inter-Medium.ttf` | Same package |
| `Inter-SemiBold.ttf` | Same package |
| `Inter-Bold.ttf` | Same package |

All fonts are open-source (SIL OFL 1.1 / OFL licence).

## Quick download (macOS / Linux)

```bash
# Install Instrument Serif
curl -L "https://fonts.google.com/download?family=Instrument+Serif" -o /tmp/instrument.zip
unzip /tmp/instrument.zip -d /tmp/instrument
cp /tmp/instrument/*.ttf assets/fonts/

# Install Inter
curl -L "https://fonts.google.com/download?family=Inter" -o /tmp/inter.zip
unzip /tmp/inter.zip -d /tmp/inter
cp /tmp/inter/static/Inter-Regular.ttf    assets/fonts/
cp /tmp/inter/static/Inter-Medium.ttf     assets/fonts/
cp /tmp/inter/static/Inter-SemiBold.ttf   assets/fonts/
cp /tmp/inter/static/Inter-Bold.ttf       assets/fonts/
```
