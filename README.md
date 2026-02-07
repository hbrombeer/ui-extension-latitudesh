# ui-extension-latitudesh

A [Rancher Dashboard Extension](https://extensions.rancher.io/) that provides a custom UI for the [Latitude.sh Docker Machine node driver](https://github.com/latitudesh/docker-machine-driver-latitudesh). It replaces the default schema-driven form with dynamic dropdowns populated from the Latitude.sh API.

This extension works natively in the **RKE2/K3s** cluster creation flow in Rancher v2.9+.

## Components

### Cloud Credential (`cloud-credential/latitudesh.vue`)
Provides a form for entering the Latitude.sh API token. Rancher stores the token as a Kubernetes Secret and manages it as a cloud credential.

### Machine Config (`machine-config/latitudesh.vue`)
Provides the server configuration form with dynamic dropdowns:

| Field | Source | Required |
|-------|--------|----------|
| Project | `GET /projects` | Yes |
| Region | `GET /regions` | Yes |
| Plan | `GET /plans?filter[in_stock]=true` | Yes |
| Operating System | `GET /plans/operating_systems` | Yes |
| Hostname | Text input | No |
| SSH Key | `GET /ssh_keys` | No |
| User Data | `GET /user_data` | No |

All API calls are proxied through Rancher (`/meta/proxy/api.latitude.sh/...`) using the stored cloud credential for authentication. No CORS issues.

## Prerequisites

- Rancher v2.9+ with the Dashboard UI
- The [`docker-machine-driver-latitudesh`](https://github.com/latitudesh/docker-machine-driver-latitudesh) binary registered as a Node Driver
- `api.latitude.sh` added to the Node Driver's whitelist domains
- Node.js 18+ and yarn (for development)

## Development

### 1. Install dependencies

```bash
yarn install
```

### 2. Start the dev server

```bash
API=https://your-rancher-instance.com yarn dev
```

This starts a local development server. The extension is served at `https://127.0.0.1:8005`.

### 3. Load in Rancher (Developer Load)

1. In Rancher, go to your user avatar > **Preferences**
2. Enable **Extension developer features**
3. Go to **Extensions** > **Developer Load**
4. Enter the URL from the dev server output (e.g. `https://127.0.0.1:8005/pkg/latitudesh-0.1.0/latitudesh-0.1.0.umd.min.js`)

### 4. Test

1. Go to **Cluster Management** > **Create**
2. Select **Latitude.sh** as the infrastructure provider
3. Create or select a cloud credential (API token)
4. The machine config form should show dynamic dropdowns

## Building for Production

```bash
yarn build-pkg latitudesh
```

Output is generated in the `dist-pkg/` directory.

## Publishing

Two GitHub Actions workflows are included under `.github/workflows/` and ready to use. Both are triggered automatically when you create a **Tagged Release** on GitHub, or can be run manually via **workflow_dispatch**.

> **Important:** The root `package.json` name (`ui-extension-latitudesh`) **must** differ from the extension package folder name (`latitudesh`). This is already configured correctly.

---

### Option A: Helm Chart via gh-pages

Publishes Helm charts to the `gh-pages` branch so the repository can be used as a Helm repo.

**Workflow:** `.github/workflows/build-extension-charts.yml`

#### One-time setup

1. Create a `gh-pages` branch in your GitHub repository:

```bash
git checkout --orphan gh-pages
git rm -rf .
git commit --allow-empty -m "Init gh-pages"
git push origin gh-pages
git checkout main
```

2. Go to repository **Settings** > **Pages** and set **Source** to **GitHub Actions**.

#### Creating a release

The tag name **must** match the extension package folder name + version from `pkg/latitudesh/package.json`:

```
latitudesh-<version>
```

Example for version `0.1.0`:

```bash
git tag latitudesh-0.1.0
git push origin latitudesh-0.1.0
```

Then create a **Release** on GitHub from this tag (type: **released**, not draft).

The workflow automatically builds the Helm chart and publishes it to `gh-pages`.

#### Installing in Rancher

1. **Apps** > **Repositories** > **Create**
2. Set the URL to `https://latitudesh.github.io/ui-extension-latitudesh`
3. Go to **Extensions** and install **Latitude.sh**

---

### Option B: Extension Catalog Image (Container Registry)

Publishes a container image to `ghcr.io` for air-gapped environments or private registries.

**Workflow:** `.github/workflows/build-extension-catalog.yml`

#### Creating a release

The tag name **must** match the root `package.json` name + version:

```
ui-extension-latitudesh-<version>
```

Example for version `0.1.0`:

```bash
git tag ui-extension-latitudesh-0.1.0
git push origin ui-extension-latitudesh-0.1.0
```

Then create a **Release** on GitHub from this tag.

The workflow builds and pushes the image to `ghcr.io/latitudesh/ui-extension-latitudesh`.

#### Installing in Rancher (air-gapped)

1. Pull/mirror the image: `ghcr.io/latitudesh/ui-extension-latitudesh:0.1.0`
2. In Rancher: **Extensions** > **Manage Repositories** > add the registry
3. Install the extension from the catalog

---

### Manual Publishing

Build and publish without GitHub Actions:

```bash
# Helm charts (to a branch)
yarn publish-pkgs -s "latitudesh/ui-extension-latitudesh" -b "gh-pages"

# Container image (to a registry)
yarn publish-pkgs -c -p -r ghcr.io -o "latitudesh"
```

Requires: git, node >= 12, yarn, jq, yq >= 4, helm >= 3 (plus docker for ECI).

## Project Structure

```
ui-extension-latitudesh/
├── .github/
│   └── workflows/
│       ├── build-extension-charts.yml   # Helm chart CI/CD
│       └── build-extension-catalog.yml  # Container image CI/CD
├── pkg/
│   └── latitudesh/
│       ├── index.ts                     # Extension entry point
│       ├── package.json                 # Extension metadata
│       ├── cloud-credential/
│       │   └── latitudesh.vue           # API Token form
│       ├── machine-config/
│       │   └── latitudesh.vue           # Server config dropdowns
│       └── l10n/
│           └── en-us.yaml              # English translations
├── package.json                         # Root dependencies (@rancher/shell)
├── tsconfig.json                        # TypeScript config
├── nuxt.config.ts                       # Build config
├── .gitignore
└── README.md
```

## Related

- [docker-machine-driver-latitudesh](https://github.com/latitudesh/docker-machine-driver-latitudesh) -- The Go-based Docker Machine driver for Latitude.sh
- [Latitude.sh API Reference](https://www.latitude.sh/docs/api-reference/) -- Full API documentation
- [Rancher UI Extensions](https://extensions.rancher.io/) -- Official Rancher extension docs

## License

Apache 2.0
