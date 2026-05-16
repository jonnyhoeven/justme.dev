---
project: pnpm
user: pnpm
gitlink: https://github.com/pnpm/pnpm
githost: https://raw.githubusercontent.com/
branch: main
readmeFile: README.md
type: blog
title: 'Migrating from npm to pnpm: Securing the Supply Chain'
date: 2026-05-16
year: 2026
month: May
outline: deep
summary: Why we migrated to pnpm, how it prevents phantom dependencies, and implementing a 24-hour minimum release age to protect against compromised packages.
fetchReadme: false
editLink: true
image: /images/pnpm.webp
externalUrl: https://pnpm.io/
fetchML: false
---

<!--suppress ALL, CheckEmptyScriptTag, HtmlUnknownAttribute -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Push for a Better Package Manager

When dealing with modern web applications, the node ecosystem is often the largest vector for supply chain attacks. Recently, after yet another high-profile compromise in the `npm` ecosystem, we made the strategic decision to migrate our platform entirely from `npm` to `pnpm`.

While `pnpm` is widely praised for its incredible speed and efficient disk usage, the primary driver for our migration was **security**.

## Why pnpm is Inherently More Secure

By default, standard `npm` (and Yarn v1) utilizes a **hoisted (flat) `node_modules` directory**. This means that if you install a package like `express`, all of `express`'s dependencies are pushed up to the root level of your `node_modules` folder.

This creates a dangerous security vulnerability known as **Phantom Dependencies**:

1. Your application code can successfully `require()` or `import` a library that you never explicitly listed in your `package.json`.
2. If a malicious actor compromises a deep transitive dependency, it becomes trivially easy for an attacker to exploit access to your runtime environment.

### The Strict Structure

`pnpm` solves this by using a strict, symlinked `node_modules` structure. If a package is not explicitly declared in your `package.json`, your code **cannot access it**. This isolation eliminates phantom dependencies entirely, significantly reducing the attack surface of your application.

## Defeating "Smash and Grab" Attacks

One of the most common supply chain attacks relies on speed. An attacker compromises a popular package, publishes a malicious update, and relies on automated CI/CD pipelines to instantly pull the compromised version before the community notices.

To combat this, we implemented a **24-hour Minimum Release Age**.

### The 24-Hour Wait Period

Historical data shows that the vast majority of malicious packages are discovered, reported, and removed from the registry within the first few hours of publication.

By enforcing a cooldown period, `pnpm` will automatically refuse to install any package version that was published less than 24 hours ago.

You can easily configure this in your project by adding an `.npmrc` file to your root directory:

```ini
# Require packages to be published for at least 24 hours (1440 minutes)
minimumReleaseAge=1440
```

With this simple setting, if an attacker publishes a poisoned update at 3:00 AM, our automated pipelines will refuse to fetch it. By the time 24 hours have passed, the registry maintainers will have already nuked the package.

## Handling Emergency Patches

Security policies must be flexible to be effective. If an emergency zero-day vulnerability is discovered and a patch is released, waiting 24 hours to install the fix is unacceptable.

`pnpm` accounts for this. You can bypass the minimum release age for specific, trusted packages:

```ini
minimumReleaseAge=1440
minimumReleaseAgeExclude=my-critical-framework,security-patch-lib
```

## Conclusion

Migrating from `npm` to `pnpm` was a seamless process thanks to tools like `corepack`. Between strict dependency isolation and built-in protections against zero-day compromised packages, `pnpm` provides a vastly superior security posture for any Node.js project.

<ArticleFooter :frontmatter="$frontmatter"/>
