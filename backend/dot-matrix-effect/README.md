# Randomised dot-matrix effect

The effect is preserved in `index.html`. Open it directly in a browser, or copy its canvas markup, CSS, and script into another page.

## Behaviour

- Radiating rings travel outward from the viewport centre.
- Each dot gets stable variation in phase and intensity, producing an organic glow without random flicker.
- The dots are short, crisp radial capsules rather than large circular blobs.
- Moving the pointer adds a local brightness boost.

## Configuration

Edit the constants at the top of the script:

| Setting | Controls |
| --- | --- |
| `DOT_SPACING` | Grid density; lower is denser. |
| `BASE_RADIUS`, `MAX_RADIUS` | Resting and active dot size. |
| `WAVE_SPEED` | Outward travel speed. |
| `WAVE_FREQUENCY` | Separation between rings. |

For a gentler effect, reduce `MAX_RADIUS`, alpha, and `shadowBlur`. To change colour, update `shadowColor` and the two `fillStyle` values together.
