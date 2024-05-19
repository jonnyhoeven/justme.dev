This VitePress site is hosted from GitHub.io pages at [www.Justme.dev](https://www.justme.dev).

## Setup / Requirements

### OpenAI API key

Only needed if generating content from OpenAI.

### Updated env file

Copy the .env.example file to .env and fill in the required fields.

```bash
cp .env.example .env
```

#### Node version manager

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

#### Python & pip

```bash
sudo apt install python3
python3 -m pip install --upgrade pip
```

#### Install dependencies

```bash
npm install
pip install -r requirements.txt
```

## How to use

### OpenAI generated content

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

- Create request files in the `requests` folder, for example: [logseq.yaml](openai/request/logseq.yaml).
- Run the `npm run docs:generate` command to generate the markdown files.
- Or push to main to let the GitHub action do the work.
- The OpenAI response will be saved in the [response](./openai/response-old) folder.
- The generated markdown will be saved in a sub folder defined by `request type` using the same name as the request file
  and the suffix `.md`.
- Rename/delete corresponding [response](./openai/response-old) files to force the script to retrieve data from `openai`
  again.
