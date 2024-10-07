---
title: CloudNative Postgres
type: post
date: 2024-04-15
image: /images/pg.webp
fetchReadme: false
fetchML: false
githost: https://raw.githubusercontent.com/
user: cloudnative-pg
project: cloudnative-pg
branch: main
languages: Go, Shell
editLink: true
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

# Cloud Native PostgreSQL

## Introduction

Cloud Native PostgreSQL is a Kubernetes operator that automates the management of PostgreSQL clusters. It is designed to
be a fully-featured PostgreSQL operator that can be used to deploy, manage, and scale PostgreSQL clusters in a
Kubernetes environment. The operator is built using the Operator Framework, which is a toolkit that provides a set of
tools and best practices for building Kubernetes operators. Cloud Native PostgreSQL is designed to be easy to use and to
provide a seamless experience for developers and operators who are familiar with PostgreSQL.

## Features

Cloud Native PostgreSQL provides a number of features that make it easy to deploy and manage PostgreSQL clusters in a
Kubernetes environment. Some of the key features of Cloud Native PostgreSQL include:

- Automated deployment of PostgreSQL clusters
- Automated scaling of PostgreSQL clusters
- Automated failover and recovery of PostgreSQL clusters
- Support for high availability and disaster recovery
- Integration with Kubernetes RBAC for access control
- Integration with Kubernetes monitoring and logging tools
- Support for custom PostgreSQL configurations, extensions and backups/restores.

## Documentation

Check out the Cloud Native PostgreSQL documentation [here](https://cloudnative-pg.io/documentation/1.24/) for more
information.

## Run a Cluster on K3D locally

If you followed the [workshop](/projects/workshop), you can try out Cloud Native PostgreSQL using K3D locally. After
installing the agent, you can deploy a PostgreSQL cluster by applying the following cluster definition:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: cluster-example
spec:
  instances: 3
  storage:
    size: 1Gi
```
