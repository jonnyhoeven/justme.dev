---
type: blog
title: "Scaling Postgres on AWS: Implementing CloudNativePG with S3 Object Lock and Cross-Region Replication for Ransomware Protection"
date: 2024-10-23
outline: deep
intro: |
  Enterprise-grade PostgreSQL deployments require robust disaster recovery strategies. This article explores how to 
  leverage CloudNativePG on Kubernetes to implement immutable backups using S3 Object Lock and Cross-Region 
  Replication, ensuring resilience against ransomware and regional failures.
fetchReadme: false
editLink: true
image: /images/minio.webp
languages: Kubernetes, PostgreSQL, AWS
externalUrl: https://min.io/
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## Overview

In the modern threat landscape, ransomware is a top concern for data-intensive applications. Merely having backups is no
longer sufficient; those backups must be immutable. By combining **CloudNativePG** with **Amazon S3 Object Lock** (or
S3-compatible stores like MinIO for hybrid setups), organizations can guarantee that Write-Ahead Logs (WAL) and base
backups cannot be deleted or overwritten for a fixed retention period.

This architecture not only secures data against malicious deletion but also enables **Cross-Region Replication (CRR)**
for disaster recovery, ensuring business continuity even in the event of a total region failure.

## Architecture: Immutable Infrastructure for Data

The core of this solution relies on the separation of compute (PostgreSQL on Kubernetes) and storage (S3).

1. **CloudNativePG Operator**: Manages the PostgreSQL cluster lifecycle, handling automated failover and streaming WAL
   files to object storage.
2. **S3 Object Lock (WORM)**: Enforces a "Write Once, Read Many" policy. Once a WAL file is pushed to S3, it is locked
   for a specified duration (e.g., 30 days), making it immune to ransomware encryption or accidental deletion.
3. **Cross-Region Replication**: AWS S3 automatically replicates these locked objects to a secondary region, providing a
   geographically separated recovery point.

## Implementing WAL Archiving with S3

While this pattern is cloud-native, it can be simulated or implemented on-prem using **MinIO**, which provides full S3
API compatibility including Object Lock support.

### Cluster Configuration

To enable this, we configure the `Cluster` resource to point to our S3 bucket with the appropriate credentials.

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-postgres-cluster
spec:
  instances: 3
  walArchiving:
    enabled: true
    s3:
      bucket: postgres-wal-production
      endpoint: https://s3.us-east-1.amazonaws.com # or your MinIO endpoint
      region: us-east-1
      accessKey:
        name: s3-creds
        key: ACCESS_KEY_ID
      secretKey:
        name: s3-creds
        key: SECRET_ACCESS_KEY
```

### Enabling Object Lock

For AWS S3, Object Lock must be enabled at bucket creation.

```bash
aws s3api create-bucket --bucket postgres-wal-production --object-lock-enabled-for-bucket
```

For MinIO, the process is similar, allowing you to test this "Cloud Native" architecture within a local Kubernetes
environment before deploying to AWS.

## Disaster Recovery & Compliance

This setup directly addresses key compliance requirements:

* **RPO (Recovery Point Objective)**: Near-zero, as WAL files are continuously streamed to S3.
* **RTO (Recovery Time Objective)**: Minimized by using CloudNativePG's bootstrap-from-backup capabilities to spin up a
  new cluster in a DR region.
* **Data Sovereignty & Security**: Using S3 policies and KMS encryption ensures data is encrypted at rest and in
  transit, while Object Lock provides the final layer of defense against data loss.

## Conclusion

Transitioning from simple backups to an immutable, cross-region disaster recovery strategy is essential for enterprise
PostgreSQL deployments. Whether running on AWS EKS with S3 or on-prem with MinIO, the combination of CloudNativePG and
Object Lock provides a battle-tested architecture for protecting critical business data.

For more information, check out
the [MinIO Object Lock Documentation](https://min.io/docs/minio/linux/administration/object-management/object-retention.html)
or the [CloudNativePG Disaster Recovery Guide](https://cloudnative-pg.io/documentation/1.16/backup_recovery/).
