---
title: Grumpy Ipsum
date: 2020-05-21
image: /images/cvti.jpg
githost: https://github.com
user: jonnyhoeven
project_name: grumpyipsum
languages: Vue | PHP
---
Grumpy ipsum, the crowdsourcing negative Lorem Ipsum generator
This web project uses vue frontend with a laravel/eloquent backend to crowdsource negative content
for use instead of positive content. The project is a work in progress and is not yet ready for users.
---

# {{ $frontmatter.title }}

<img :src="$frontmatter.image" class="articleImage">



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
