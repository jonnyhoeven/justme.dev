---
project: pgadmin4
user: pgadmin-org
gitlink: https://github.com/pgadmin-org/pgadmin4
githost: https://raw.githubusercontent.com/
branch: main
readmeFile: README.md
type: blog
title: "Secure Data Governance: Scalable Database Management with pgAdmin and OAuth2"
date: 2024-04-18
year: 2024
month: Apr
outline: deep
intro: |
  Granting developers access to production data shouldn't mean compromising on security. 
  pgAdmin was deployed on Kubernetes with OIDC integration, replacing insecure 
  port-forwarding with a centralized, identity-aware portal for the entire 
  Cloud-Native PG fleet.
fetchReadme: false
editLink: true
image: /images/pgadmin.webp
languages: Python, JavaScript, PLpgSQL, Shell, TypeScript, CSS, Other
fetchML: false
---

<!--suppress CheckEmptyScriptTag, CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Challenge: The "Port-Forwarding" Security Gap

During a period of rapid growth, a governance challenge arose: how to provide developers with visibility into their databases without exposing raw ports to the internet. It was discovered that many were using local port-forwarding via `kubectl`, which lacked audit trails and relied on individual IAM permissions that were difficult to rotate.

As an SRE, this "Shadow IT" approach was recognized as a liability. A professional, centralized interface was required that matched **GCP Autopilot** security standards.

## The Strategy: Identity-Aware Access Control

A fundamental lesson in security is that if you make the secure path harder than the "hacky" path, the hacky one will be chosen. The goal was to make a secure, web-based database portal the easiest way for teams to work.

**pgAdmin 4** was chosen in "Server Mode," deployed as a native Kubernetes service. This allowed for:

1. **Eliminate Local Proxies:** By using an Ingress Controller, pgAdmin could be served over a standard HTTPS endpoint.
2. **SSO Integration:** Leveraging an existing identity provider (Google Workspace) via OIDC to manage access at the group level.
3. **Pre-Populated Connections:** Using `servers.json` to automatically discover and list all **CloudNativePG** clusters as they are provisioned.

## Implementation: The Zero-Trust Portal

pgAdmin was deployed using a highly customized Helm chart that prioritizes Zero-Trust principles. Here is a snippet of the identity-driven configuration:

```yaml
# Helm values for an OIDC-integrated pgAdmin deployment
env:
  # Disabling local login to force OAuth2 usage
  pgadmin_config_authentication_sources: "['oauth2', 'internal']"

# Integrating with Google Cloud Identity (OIDC)
extraSecretMounts:
  - name: oauth2-config
    secret: pgadmin-oauth2-secret # Contains Client ID and Secret
    mountPath: /var/lib/pgadmin/oauth2_config.json
    subPath: oauth2_config.json

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Restricting access to internal VPN/Office ranges
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8, 192.168.1.0/24"
  hosts:
    - host: db-portal.internal-sre.cloud
```

## Impact: Auditable, Self-Service Data Access

The transition from individual `kubectl` proxies to a centralized portal transformed the developer experience:

*   **Security Compliance:** Every database query is now associated with a specific user identity via SSO logs, fulfilling internal audit requirements.
*   **Onboarding Speed:** New developers gain instant access to all relevant database schemas on day one, without needing to configure complex local tools.
*   **Infrastructure Consistency:** By managing pgAdmin servers via GitOps, it was ensured that every developer was always looking at the most up-to-date cluster topology (Primary vs. Replicas).

## Conclusion

pgAdmin on Kubernetes is more than a GUI; it's a critical component of a professional SRE toolchain. By providing a secure, identity-aware interface, both developer velocity and security posture have been increased.

As the data platform continues to expand with **BigQuery** and **Vector Databases**, this centralized governance model serves as the blueprint for all internal developer tooling.

<ArticleFooter :frontmatter="$frontmatter"/>
