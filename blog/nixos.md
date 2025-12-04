---
type: blog
title: 'NixOS: My Declarative Homelab'
date: 2025-12-04
outline: deep
intro: |
  NixOS is a unique Linux distribution that brings a functional approach to system configuration. It leverages the Nix 
  package manager to build a system that is reproducible, declarative, and reliable. If you've ever spent hours 
  debugging a misconfigured server or wished you could treat your infrastructure like code, NixOS might be the answer.
fetchReadme: false
editLink: true
image: /images/nixos.webp
externalUrl: https://nixos.org/
fetchML: false
---

<!--suppress ALL, CheckEmptyScriptTag, HtmlUnknownAttribute -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Declarative Dream

In the world of DevOps, Infrastructure as Code (IaC) is the holy grail. Tools like Kubernetes have revolutionized how we
manage applications by allowing us to define the desired state in declarative manifests. NixOS brings this same power to
the operating system itself.

With NixOS, your entire system configuration—from the kernel version and installed packages to user accounts and running
services—is defined in a single file: `/etc/nixos/configuration.nix`.

This approach has several profound advantages:

- **Reproducibility**: You can take a `configuration.nix` file and build an identical system anywhere. This eliminates
  the "it works on my machine" problem and ensures consistency across development, staging, and production environments.
- **Atomic Upgrades**: When you change your configuration, NixOS builds the new system generation in the background. The
  switch to the new configuration is atomic, meaning it either completes successfully or does nothing. If an upgrade
  fails or introduces a bug, you can instantly roll back to the previous generation from the boot menu.
- **Reliability**: Because packages and configurations are isolated from each other, you can install different versions
  of the same software without conflicts. This makes the system incredibly stable and robust.

## My Homelab as Code

I run a homelab for media, game streaming, and experimentation. Previously, this involved managing multiple Proxmox vm's
k3s clusters, containers, systemd services, and a web of configuration and manifest files. With NixOS, I've consolidated
everything into a single `configuration.nix` file.

My setup includes:

- **Media Stack**: Jellyfin for media streaming, along with the full *arr suite (Radarr, Sonarr, Prowlarr) for managing
  content, and Jellyseerr for requests.
- **Game Streaming**: Sunshine for headless, high-performance game streaming from my server's NVIDIA GPU.
- **Networking**: Caddy as a reverse proxy to expose services, with automatic handling of subdomains.

All of these services, their users, firewall rules, and even the NVIDIA driver setup are declared in one place.

## Headless Game Streaming with Sunshine

One of the coolest parts of this setup is running Sunshine for game streaming without a physical monitor attached to the
server. This required some specific Xorg configuration to create a virtual display. With NixOS, this is just another
block of code in my main configuration file. I define a virtual monitor, autologin a dedicated `sunshine` user into a
GNOME session, and ensure the NVIDIA drivers are loaded correctly. The result is a seamless game streaming experience to
any device on my network.

## Flakes and GitOps

While `configuration.nix` provides a powerful way to define a single system, NixOS takes reproducibility and declarative
management a step further with **Nix Flakes**. Flakes are a new, experimental feature that aims to standardize how Nix
projects are structured, built, and consumed.

A Nix Flake essentially bundles all the necessary inputs (like Nixpkgs versions, other flakes, or local paths) and
outputs (like system configurations, packages, or development environments) into a single, version-controlled unit. This
means:

- **Pinning Dependencies**: Flakes automatically pin all external dependencies to specific versions, ensuring that your
  build is always reproducible, regardless of when or where it's built. This solves the "works on my machine" problem
  even more rigorously.
- **Standardized Structure**: Flakes enforce a consistent directory structure, making it easier to share and collaborate
  on Nix projects.
- **Simplified Development Environments**: You can define a `devShell` within your flake, providing a reproducible
  development environment with all the necessary tools and dependencies for a project.

The combination of NixOS's declarative nature and Flakes makes it an excellent candidate for **GitOps**. GitOps is an
operational framework that takes DevOps best practices like version control, collaboration, compliance, and CI/CD, and
applies them to infrastructure automation.

Here's how NixOS and Flakes fit into a GitOps workflow:

- **Source of Truth**: Your entire system configuration, including all services, users, and even hardware-specific
  settings, is defined in a Git repository as a Nix Flake. This repository becomes the single source of truth for your
  infrastructure.
- **Automated Deployment**: Just like Kubernetes with tools like ArgoCD or FluxCD, changes pushed to your Git repository
  can automatically trigger a rebuild and deployment of your NixOS system. This ensures that your running infrastructure
  always matches the state defined in Git.
- **Rollbacks**: If a deployment introduces an issue, you can simply revert the commit in Git, and your system will
  automatically roll back to the previous, working configuration.
- **Auditing and Collaboration**: Every change to your infrastructure is tracked in Git, providing a complete audit
  trail and facilitating collaborative development.
