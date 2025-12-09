# ChefByte Documentation

This folder contains the MkDocs documentation for ChefByte.

## Local Development

```bash
# Install dependencies
pip install mkdocs-material mkdocs-minify-plugin

# Serve locally
cd docs-site
mkdocs serve

# Build static site
mkdocs build
```

## Deployment

The documentation is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

### Custom Domain Setup

To use `docs.chefbyte.app`:

1. In your domain registrar, add a CNAME record:
   - Name: `docs`
   - Value: `jbrinkw.github.io`

2. In the GitHub repo settings → Pages:
   - Set custom domain to `docs.chefbyte.app`

## Structure

```
docs-site/
├── mkdocs.yml          # Configuration
├── docs/
│   ├── index.md        # Home page
│   ├── getting-started.md
│   ├── features/       # Feature documentation
│   │   ├── scanner.md
│   │   ├── inventory.md
│   │   ├── shopping.md
│   │   ├── meal-plan.md
│   │   ├── recipes.md
│   │   ├── macros.md
│   │   ├── walmart.md
│   │   └── settings.md
│   ├── advanced/       # Advanced topics
│   │   ├── liquidtrack.md
│   │   └── api.md
│   └── assets/
│       ├── screenshots/
│       └── stylesheets/
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions
```


