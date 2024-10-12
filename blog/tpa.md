---
project: tpa
user: EnterpriseDB
gitlink: https://github.com/cloudnative-pg/cloudnative-pg
githost: https://raw.githubusercontent.com/
branch: main
readmeFile: README.md
type: blog
title: Trusted Postgres Architect
date: 2024-03-28
outline: deep
intro: |
    Trusted Postgres Architect (TPA) is an orchestration tool that leverages Ansible to deploy Postgres clusters in line
    with EDB's recommendations. TPA encapsulates the best practices followed by EDB, informed by years of experience with
    deploying and supporting Postgres. These recommendations are applicable to both quick testbed setups and production
    environments.
fetchReadme: false
editLink: true
image: /images/edb.png
languages: Python, Jinja, Shell, Dockerfile
fetchML: false
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

TPA is built around a declarative configuration mechanism that allows you to describe a Postgres cluster, from its
topology to the minutest details of its configuration. You can start by running `tpaexec configure` to generate an
initial cluster configuration based on a few high-level choices, such as the Postgres version to install. The default
configuration is ready to use as is, but you can edit it to suit your needs. The generated configuration is a text
file, `config.yml`.

## TPA in Action

Using this configuration, TPA can provision servers, for example, AWS EC2 instances or Docker containers, and any other
resources needed to host the cluster. Alternatively, you can deploy to existing servers or VMs just by specifying
connection details. TPA can also configure the operating system, for example, tweak kernel settings, create users and
SSH keys, install packages, define systemd services, set up log rotation, and so on.

## Extending TPA's Capabilities

TPA can install and configure Postgres and associated components, such as PGD, Barman, pgbouncer, repmgr, and various
Postgres extensions. It can run automated tests on the cluster after deployment. TPA can also deploy future changes to
your configuration, such as changing Postgres settings, installing and upgrading packages, adding new servers, and so
on.

## Conclusion

In conclusion, TPA is a comprehensive orchestration tool that simplifies the deployment and management of Postgres
clusters. Its declarative configuration mechanism, coupled with its ability to provision servers and configure the
operating system, makes it an invaluable tool for managing Postgres clusters. Whether you're setting up a quick testbed
or managing a production environment, TPA can help you structure your projects and stay on top of management tasks with
ease.

<ArticleFooter :frontmatter="$frontmatter"/>
