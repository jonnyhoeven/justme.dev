---
type: blog
title: "Automating High-Availability PostgreSQL on AWS: A Deep Dive into Trusted Postgres Architect (TPA)"
date: 2024-03-28
outline: deep
intro: |
  Deploying production-ready PostgreSQL clusters requires more than just `apt-get install`. Trusted Postgres Architect 
  (TPA) by EDB brings Infrastructure as Code (IaC) principles to database orchestration, allowing you to provision, 
  configure, and manage highly available clusters on AWS EC2 with Ansible-driven automation.
fetchReadme: false
editLink: true
image: /images/edb.webp
languages: Python, Jinja, Shell, Dockerfile
fetchML: false
---

<!--suppress ALL, CheckEmptyScriptTag, HtmlUnknownAttribute -->

<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Problem: Database Sprawl and Configuration Drift

In many organizations, database provisioning is a bottleneck. Developers spin up RDS instances with default settings, or
ops teams manually configure EC2 instances, leading to "snowflake" servers that are impossible to patch or upgrade
consistently.

Trusted Postgres Architect (TPA) solves this by treating the database cluster topology as code. It generates an
inventory and configuration file (`config.yml`) that defines everything from the OS kernel parameters to the Postgres
`postgresql.conf` settings.

## Architecture: TPA on AWS

TPA supports multiple architectures, but a common high-availability pattern on AWS involves:

1. Primary Node: Handles read/write traffic.
2. Standby Nodes: Synchronous or asynchronous replicas across Availability Zones (AZs) for disaster recovery.
3. Barman: For backup and recovery, storing WAL files in S3.
4. PgBouncer: For connection pooling.

### Provisioning with TPA

TPA integrates directly with AWS APIs to provision the necessary EC2 instances, VPCs, and Security Groups.

```bash
# Generate a configuration for an AWS cluster
tpaexec configure --architecture M1 \
  --platform aws --region us-east-1 \
  --instance-type t3.medium \
  --distribution Debian11 \
  --postgres-version 15 \
  my-cluster
```

This command generates a `config.yml` that you can version control.

### Configuration Management

The power of TPA lies in its ability to apply changes idempotently. Need to change `max_connections` or install a new
extension? Update the `config.yml` and run:

```bash
tpaexec deploy my-cluster
```

TPA uses Ansible under the hood to ensure that all nodes in the cluster are updated safely, respecting the replication
lag and minimizing downtime.

## Immutable Infrastructure vs. TPA

While immutable infrastructure (replacing servers instead of updating them) is popular for stateless apps, databases
have state (data). TPA bridges this gap by allowing you to manage stateful pets (database servers) with the discipline
of cattle. It automates the "Day 2" operations—patching, minor version upgrades, and configuration tuning—that are often
neglected.

## Conclusion

For organizations that need more control than RDS provides (e.g., specific extensions, custom kernel tuning) but don't
want the operational overhead of manual management, TPA offers a robust, code-first approach to running PostgreSQL on
AWS.

<ArticleFooter :frontmatter="$frontmatter"/>
