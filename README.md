This VitePress site is hosted from GitHub.io pages at [justme.dev](https://justme.dev).

## Requirements

### OpenAI API key

Only needed if generating content from OpenAI.

```bash
cp .env.example .env
```

Copy the [.env.example](https://github.com/jonnyhoeven/justme.dev/blob/main/.env.example) file to `.env` and fill in the
required fields.

### Node version manager

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

### Python & pip

*Only needed if generating content from OpenAI.*

```bash
sudo apt install python3
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Install dependencies

```bash
npm install
```

## How to use

### Generate content

Downloads readme files from GitHub repositories and when configured connects to the OpenAI API to generate content.

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

- Create request files in the `requests` folder,
  [open-ai-usage.yaml.example](https://github.com/jonnyhoeven/justme.dev/blob/main/openai/request/open-ai-usage.yaml.example).
- Run the `npm run docs:generate` command to generate the markdown files locally.
- When pushing to `main` GitHub action does `generate`, `build` and `deploy`.
- The OpenAI response will be saved in the response folder.
- The generated markdown will be saved in a sub folder defined by `request type` using the same name as the request file
  and the suffix `.md`.
- Delete corresponding `response.bin` in `./openai/response` to force the script to retrieve data from `openai`
  again.
