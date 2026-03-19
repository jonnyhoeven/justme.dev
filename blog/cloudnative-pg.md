---
project: cloudnative-pg
user: cloudnative-pg
gitlink: https://github.com/cloudnative-pg/cloudnative-pg
githost: https://raw.githubusercontent.com/
branch: main
readmeFile: README.md
type: blog
title: "Enterprise PostgreSQL on Kubernetes: High Availability and Disaster Recovery with CloudNativePG"
date: 2024-04-15
outline: deep
intro: |
  Running stateful workloads like PostgreSQL on Kubernetes requires a robust operator. CloudNativePG (CNPG) brings 
  enterprise-grade features—automated failover, point-in-time recovery, and rolling updates—to your clusters, enabling 
  you to run mission-critical databases with the same agility as stateless apps.
fetchReadme: false
editLink: true
image: /images/pg.webp
languages: Go, Shell
externalUrl: https://cloudnative-pg.io/
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## Why CloudNativePG?

While managed services like AWS RDS are excellent, they can be costly and lock you into a specific cloud provider. 
CloudNativePG offers a portable, open-source alternative that runs anywhere Kubernetes runs—AWS EKS, Azure AKS, or
on-prem bare metal.

It leverages the Kubernetes API to manage the entire lifecycle of a PostgreSQL cluster, from provisioning to day-2
operations.

## Key Enterprise Features

1. High Availability (HA): CNPG automatically manages primary/standby replication. If the primary pod fails, the
   operator promotes a standby with zero data loss (RPO=0) in synchronous mode.
2. Self-Healing: Failed nodes are automatically detected and replaced. The operator handles the complex logic of
   rewinding the timeline and rejoining the cluster.
3. Rolling Updates: Upgrade PostgreSQL versions or the underlying container image with zero downtime. The operator
   updates replicas first, switches over, and then updates the former primary.

## Disaster Recovery: Point-in-Time Recovery (PITR)

One of the most critical features for enterprise databases is the ability to restore to a specific moment in time (e.g.,
right before a bad SQL query was executed).

CNPG integrates with S3-compatible storage (AWS S3, MinIO, Azure Blob Storage) to continuously archive Write-Ahead
Logs (WAL).

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-db
spec:
  instances: 3
  backup:
    barmanObjectStore:
      destinationPath: s3://my-backup-bucket/
      endpointURL: https://s3.amazonaws.com
      s3Credentials:
        accessKeyId:
          name: s3-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-creds
          key: SECRET_ACCESS_KEY
```

## Monitoring & Observability

CNPG exposes a rich set of Prometheus metrics out of the box. You can visualize query performance, replication lag, and
resource usage in Grafana, giving you the same level of insight as a managed service.

## Conclusion

CloudNativePG empowers organizations to take control of their data infrastructure. By treating the database as a
Kubernetes resource, you gain the benefits of GitOps, portability, and cost savings without sacrificing reliability or
performance.

Check out the [CloudNative PostgreSQL documentation](https://cloudnative-pg.io/documentation/1.24/) for more
information.
