# Deeksha Jewellers — Website

A premium, single-page website for **Deeksha Jewellers**, a handmade jewellery business.

## Pages

| File             | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `index.html`     | Homepage — hero, About Us, What We Do, How to Order, Contact |
| `terms.html`     | Terms & Conditions                                  |
| `privacy.html`   | Privacy Policy                                      |

## Contact wiring (all point to the same number)

- **Phone / Call Us:** `tel:+917009081860` (+91 70090 81860)
- **WhatsApp:** `https://wa.me/917009081860` with a pre-filled greeting

There is **no online booking** — orders and enquiries are handled personally on call or WhatsApp.

## Structure

```
├── index.html
├── terms.html
├── privacy.html
└── assets/
    ├── css/style.css      # all styling (gold + ivory premium theme)
    ├── js/main.js         # navbar, mobile menu, scrollspy, reveal animations
    ├── favicon.svg
    ├── hero-fallback.jpg  # local fallback if the hotlinked hero image fails
    └── about-artisan.jpg  # About section photo
```

The homepage hero background is hotlinked from the provided pngtree URL; if it ever
fails to load, `assets/hero-fallback.jpg` is used automatically (`onerror` on the
hero `<img>`).

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Customising

- **Phone / WhatsApp number:** search for `917009081860` across the HTML files.
- **WhatsApp pre-filled message:** edit the `?text=...` query in the `wa.me` links.
- **Hero background:** the `.hero-bg` `src` in `index.html`.
- **Products / services list:** the "What We Do" cards in `index.html`.
