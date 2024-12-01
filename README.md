This VitePress site is hosted from GitHub.io pages at [justme.dev](https://justme.dev).

## Requirements

### Node version manager

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

#### Install dependencies

```bash
npm install
```

## How to use

### Generate content

Downloads readme files from GitHub repositories.

```bash
npm run docs:generate
```

### Development

```bash
npm run docs:dev
```

### Build

```bash
npm run docs:build
```

### Preview build

```bash
npm run docs:preview
```

### Deploy

Commit to the `main` branch to
trigger [deployment](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml).

## Notes

- Create request files in the `requests` folder.
- Run the `npm run docs:generate` command to generate the markdown files locally.
- When pushing to `main` GitHub action does `generate`, `build` and `deploy`.
- The generated markdown will be saved in a sub folder defined by `request type` using the same name as the request file
  and the suffix `.md`.
- Delete corresponding `response.bin` in `./openai/response` to force the script to retrieve data from `openai`
  again.
