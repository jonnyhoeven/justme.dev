---
type: blog
title: "Platform Engineering with Crossplane: Scaling Your Internal Developer Platform (IDP) on AWS"
date: 2026-03-12
outline: deep
intro: |
  Following our deep dives into NixOS and ArgoCD, the natural progression toward a full Internal Developer Platform (IDP) 
  is managing cloud resources via Kubernetes. With Crossplane, you can treat AWS RDS or S3 buckets just like 
  standard Kubernetes manifests, bringing the power of GitOps to your entire infrastructure.
fetchReadme: false
editLink: true
image: /images/crossplane.webp
languages: Go, YAML, HCL
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## From Infrastructure as Code to Infrastructure as Data

We've already seen how **NixOS** provides deterministic, immutable operating systems and how **ArgoCD** brings GitOps to
application deployments. However, many organizations still manage their cloud resources (like RDS databases, S3 buckets,
and IAM roles) using separate Terraform or Pulumi workflows.

This "context switching" between Kubernetes manifests and HCL/TypeScript creates friction for platform teams. *
*Crossplane** solves this by extending the Kubernetes API to manage external cloud resources. In this model, your
infrastructure becomes "data" (YAML) that lives alongside your applications.

## Why Crossplane for Platform Engineering?

By using Crossplane as the engine for your **Internal Developer Platform**, you gain several key advantages:

1. **Unified API**: Developers only need to interact with Kubernetes APIs to provision both their applications and the
   databases they depend on.
2. **Continuous Reconciliation**: Unlike Terraform, which only checks state during a `plan/apply` run, Crossplane is a
   controller that continuously monitors your cloud resources for drift and automatically fixes them.
3. **Composite Resources (XRDs)**: You can define your own "opinionated" abstractions. Instead of letting developers
   configure every detail of an RDS instance, you can provide a `PostgresInstance` resource that automatically includes
   your company's required security groups, backup policies, and monitoring tags.

## Managing AWS Resources via Manifests

To manage AWS, you install the **Crossplane AWS Provider**. Once configured with the necessary IAM permissions, you can
define resources like an S3 bucket directly in YAML:

```yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-app-assets
spec:
  forProvider:
    region: us-east-1
  deletionPolicy: Delete
```

When you apply this manifest, Crossplane's AWS controller calls the AWS API to create the bucket. If someone manually
changes the bucket settings in the AWS Console, Crossplane will detect the drift and revert it to the state defined in
your YAML.

## The Full GitOps Pipeline: NixOS + ArgoCD + Crossplane

The true power of this stack is realized when these tools work together:

1. **NixOS**: Provides a stable, immutable base for your EKS (Elastic Kubernetes Service) nodes.
2. **Crossplane**: Resides within the cluster, managing the "off-cluster" resources like RDS and S3.
3. **ArgoCD**: Acts as the orchestrator, watching your Git repository and syncing both your application manifests AND
   your Crossplane infrastructure manifests to the cluster.

This creates a **single source of truth** for your entire environment. A single Git commit can now deploy a new version
of your microservice, create the database it needs, and configure the S3 bucket for its assets—all while maintaining the
security and consistency guarantees of the GitOps model.

## Building Your IDP

As you build out your Internal Developer Platform, consider Crossplane's **Composition** feature. Compositions allow you
to bundle multiple cloud resources into a single, high-level API for your developers. This "paves the way" for
developers, allowing them to focus on code while the platform team maintains the underlying infrastructure standards.

## Conclusion

Crossplane is more than just another "Infrastructure as Code" tool; it's the control plane for the modern cloud-native
era. By integrating it with NixOS and ArgoCD, you're not just automating deployments—you're building a robust,
self-healing platform that scales with your organization.

For more details on getting started, check out the [Crossplane documentation](https://docs.crossplane.io/) and
the [AWS Provider repository](https://github.com/crossplane-contrib/provider-aws).

<ArticleFooter :frontmatter="$frontmatter"/>
