---
project: ollama
user: ollama
gitlink: https://github.com/ollama/ollama
githost: https://github.com
branch: master
readmeFile: README.md
type: blog
title: "Ollama: Revolutionizing AI in IntelliJ Idea"
date: 2025-02-02
outline: deep
intro: |
  In today's fast-paced software development environment, integrating advanced AI tools like Ollama can significantly 
  enhance productivity and streamline your workflow. In this blog post, we'll explore how Ollama, 
  a powerful AI assistant integrated into IntelliJ Idea, can transform your coding experience.
fetchReadme: false
editLink: true
image: /images/ollama.webp
languages: Go
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## What is Ollama?
Ollama is an open-source local AI model service that runs on your own computer.

- Easily download and run Large Language Models
- Usable on most hardware without dedicated graphics; albeit slower and less accurate
- Repository with a large selection of specialized models
- No need to share data with external services 
- Opensource

When installed within IntelliJ Idea, it acts as a bridge between powerful AI models and the code editor. 

With Ollama, you can:

- Access advanced AI tools directly from your IDE
- Generate high-quality documentation
- Create well-structured comments with AI-powered suggestions
- Automate repetitive tasks, like writing commit messages.

Without dedicated hardware it's slightly unbearable running 1.5 billion parameters with `deepseek-r1`.
Simple things like writing small git commit messages work fine, however once the context increases beyond a few 1000 lines 
of code your really notice the processing limits.

Since it's a network service/api you can just install Ollama on any machine on your local network containing dedicated hardware 
and host it on your local/vpn network. Check out the [Ollama Docker container](https://hub.docker.com/r/ollama/ollama) if you're into that.

## Install Ollama:

(source)[https://ollama.com/]

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Start Ollama:

```bash
ollama run deepseek-r1:1.5b
#>>> Send a message (/? for help)
```

To stop output press `CTRL+C`, type`/bye` to exit.

## Connect your IDE to Ollama

### IntelliJ Idea
Since we have our OpenAI api running with our working language model, lets set up our IDE and start using it.
Go to `Settings` → `Tools` → `AI assistant` → `Third party AI providers` → `Enable Ollama`.

[source](https://ollama.com/blog/continue-code-assistant)


Set your connection to: `http://localhost:11434`  (Default)

Open the IntelliJ AI assistant and set the Model to `Ollama` - `Deepseek-r1:1.5b`.

Depending on your device, you might want to download bigger models to improve performance and accuracy,
check out more [Ollama models](https://ollama.com/search).


## Manage models
To install new models, e.g. `codellama:7b`

```bash
ollama pull codellama:7b
```

List installed or remove downloaded models:

```bash
ollama list
ollama rm codellama:7b
```

## Uninstall Ollama

```bash
sudo systemctl disable ollama
sudo rm /etc/systemd/system/ollama.service
sudo rm $(which ollama)
sudo rm -r /usr/share/ollama 
sudo userdel ollama 
sudo groupdel ollama
```
