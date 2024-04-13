---
branch: master
date: 2020-05-21
fetchML: false
fetchReadme: true
githost: https://raw.githubusercontent.com
image: /images/grumpyipsum.jpg
intro: Grumpy ipsum, the crowd-sourced negative Lorem Ipsum generator This web project uses vue frontend with a laravel/eloquent
  backend to crowdsource negative content for use instead of positive content. The project is a work in progress and is not
  yet ready for users.
languages: Vue, PHP
outline: deep
project: grumpyipsum
readmeFile: README.md
title: Grumpy Ipsum
type: project
user: jonnyhoeven
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

Grumpy Ipsum is a crowd-sourced negative Lorem Ipsum generator. The project is a work in progress and is not yet ready for users. 

## Project environment
```
docker-compose build && docker-compose up -d && docker-compose logs -f
docker-compose up
```

## Hostnames
```
127.0.0.1 www.grumpyipsum.com
```


## Connecting to docker shell
```

docker-compose exec web bash
```

## Project setup
```
npm install
```

```
composer install
```


### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

