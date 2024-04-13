This VitePress site is hosted from GitHub.io pages at [www.Justme.dev](https://www.justme.dev).

## Requirements

- Node version manager

```bash
curl -o- https//raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

- VitePress

```bash
npm install
```

## Development

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

Commit to the `main` branch to trigger [deployment](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml).


## Usage

Create request files in the `requests` folder, for example: [logseq.yaml](request/logseq.yaml).

Copy the .env.example file to .env and fill in the required fields.

```bash
cp .env.example .env
```

Create/edit your own request files in the `requests` folder.

Start processing the request files:

```bash
python3 process.py
```

## Notes

- The OpenAI api response will be saved in the [response](response) folder with the same name as the request file.
- The generated markdown will be saved in a sub folder defined by `request type` using the same name as the request file
  and
  the suffix `.md`.
- Delete corresponding `response` files to force the script to retrieve the data from `openai` again.
