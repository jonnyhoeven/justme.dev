---
type: blog
title: Running MinIO in a Kubernetes Cluster for PostgreSQL WAL Archiving
date: 2024-10-23
outline: deep
intro: |
    MinIO is a high-performance, S3-compatible object storage solution that can be deployed in a Kubernetes cluster. This
    article explains how to set up MinIO in a Kubernetes cluster and use it with the PostgreSQL CloudNative Operator to
    enable Write-Ahead Logging (WAL) archiving to a self-hosted MinIO S3 bucket.
fetchReadme: false
editLink: true
image: /images/minio.webp
languages: Kubernetes, PostgreSQL
externalUrl: https://min.io/
fetchML: false
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## Overview

MinIO provides a scalable and high-performance object storage solution that is compatible with Amazon S3 APIs. By
deploying MinIO in a Kubernetes cluster, you can leverage its capabilities for various use cases, including PostgreSQL
WAL archiving. The PostgreSQL CloudNative Operator simplifies the management of PostgreSQL clusters in Kubernetes and
supports WAL archiving to S3-compatible storage.

## Prerequisites

- A running Kubernetes cluster
- `kubectl` configured to interact with your cluster
- Helm installed for deploying MinIO Operator & Tenant
- PostgreSQL CloudNative Operator installed

## Deploying MinIO in Kubernetes

Check out the official docs:

- Install
  the [MinIO Operator](https://min.io/docs/minio/kubernetes/upstream/operations/install-deploy-manage/deploy-operator-helm.html)
- Deploy a [MinIO Tenant](https://min.io/docs/minio/kubernetes/upstream/operations/deploy-manage-tenants.html)

You can use kubernetes to sign certificates so you can use internal kubedns names for your minio tenant.
If you want to host your MinIO Tenant externally you can use NGINX ingress to do the tls termination.

The MinIO console can be handy to create/manage buckets or users.
After creating a bucket you can configure the Postgres CloudNative Operator to enable WAL archiving to the new S3
bucket.

Cluster example:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: my-postgres-cluster
spec:
  instances: 3
  walArchiving:
    enabled: true
    s3:
      bucket: postgres-wal
      endpoint: http://minio.minio.svc.cluster.local:9000
      accessKey: myaccesskey
      secretKey: mysecretkey
```

Create a Cloud Native Postgres Operator `Scheduled Backup` or `Backup` Custom Resource Definition to start WAL archiving
using Barman to your bucket.

### Debugging

If you don't see files appearing in your bucket:

- Check the Postgres Operator Pod logs what's wrong or to see which Postgres Node is being sourced
  for [Barman](https://cloudnative-pg.io/documentation/1.16/backup_recovery/) to export to your S3 bucket.
- Check the logs in the Postgres Cluster Node Pod currently exporting.

> [!TIP]
> MySQL Operator can also be configured to use MinIO for backups.

## Conclusion

You can install MinIO in a Kubernetes cluster with ease using helm and configure the PostgreSQL CloudNative Operator to
enable WAL archiving to your self-hosted MinIO S3 bucket.

This setup ensures that your Postgres WAL files are securely archived and easily accessible for recovery purposes.
Having everything important in a few S3 compatible buckets allows for easier offsite backups and disaster recovery.

For more information, you can check out the [MinIO](https://docs.min.io/) or
[PostgreSQL CloudNative Operator](https://cloudnative-pg.io/) documentation.


