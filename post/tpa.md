---
branch: main
date: 2024-03-28
editLink: false
fetchML: true
fetchReadme: false
gitlink: https://github.com/EnterpriseDB/tpa
image: /images/tpa.webp
intro: Welcome to our blog post about TPA, the trusted Postgres Architect, and how it can revolutionize the way you structure
  your projects and manage your Postgres clusters. In this post, we'll explore the key features of TPA, its benefits, and
  how it can help you stay on top of your Postgres management game.
languages: Python, Jinja, Shell, Dockerfile
messages:
- content: 'You''re a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences, don''t use
    "*". Desired format: Intro: -||- BlogPost: -||-'
  role: system
- content: 'Write a blog post about TPA trusted Postgres Architect and what it means for structuring projects and staying
    on top of management based on the following github readme: TPA is an orchestration tool that uses Ansible to deploy Postgres
    clusters according to EDB''s recommendations. TPA embodies the best practices followed by EDB, informed by many years
    of hard-earned experience with deploying and  supporting Postgres. These recommendations apply to quick testbed setups
    as well as production environments. TPA is built around a declarative configuration mechanism that you can use to describe
    a Postgres cluster, from its topology to the smallest details of its configuration. Start by running tpaexec configure
    to generate an initial cluster configuration based on a few high-level choices, such as the Postgres version to install.
    The default configuration is ready to use as is, but you can edit it to suit your needs. (The generated configuration
    is a text file, config.yml). Using this configuration, TPA can: Provision servers, for example, AWS EC2 instances or Docker
    containers, and any other resources needed to host the cluster. Or you can deploy to existing servers or VMs just by specifying
    connection details. Configure the operating system, for example, tweak kernel settings, create users and SSH keys, install
    packages, define systemd services, set up log rotation, and so on. Install and configure Postgres and associated components,
    such as PGD, Barman, pgbouncer, repmgr, and various Postgres extensions. Run automated tests on the cluster after deployment.
    Deploy future changes to your configuration, such as changing Postgres settings, installing and upgrading packages, adding
    new servers, and so on.'
  role: user
model: openchat/openchat-3.5-1210
project: tpa
title: Trusted Postgres Architect
total_tokens: 1241
type: post
user: EnterpriseDB
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>
TPA, or Trusted Postgres Architect, is an orchestration tool that leverages Ansible to deploy Postgres clusters in
accordance with EDB's recommendations. With years of experience in deploying and supporting Postgres under its belt, EDB
has distilled its best practices into TPA, making it suitable for both quick testbed setups and production environments.
At the heart of TPA is a declarative configuration mechanism that allows you to describe your Postgres cluster, from its
topology to the most minute details of its configuration. To get started, run tpaexec configure to generate an initial
cluster configuration based on high-level choices, such as the Postgres version to install. While the default
configuration is ready for immediate use, you can edit it to meet your specific needs.  Once you have your configuration
in place, TPA can perform a variety of tasks to provision and manage your Postgres cluster. It can provision servers,
such as AWS EC2 instances or Docker containers, and any other resources needed to host the cluster. Alternatively, you
can deploy to existing servers or VMs by simply specifying connection details.  TPA also takes care of configuring the
operating system, including tasks like tweaking kernel settings, creating users and SSH keys, installing packages,
defining systemd services, setting up log rotation, and more. Furthermore, it installs and configures Postgres and
associated components, such as PGD, Barman, pgbouncer, repmgr, and various Postgres extensions.  One of the most
valuable features of TPA is its ability to run automated tests on the cluster after deployment. This ensures that your
Postgres cluster is functioning optimally and helps you identify and address any issues before they become critical.
Lastly, TPA simplifies the deployment of future changes to your configuration, such as modifying Postgres settings,
installing and upgrading packages, adding new servers, and more. This makes it easy to keep your Postgres cluster up-to-
date and running smoothly.  In conclusion,


<ArticleFooter :frontmatter="$frontmatter"/>
