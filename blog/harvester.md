---
project: harvester
user: harvester
gitlink: https://github.com/harvester/harvester
githost: https://github.com
branch: master
readmeFile: README.md
type: blog
title: "Converged Reliability: Strategic Hybrid Cloud with Harvester and Rancher"
date: 2023-04-13
year: 2023
month: Apr
outline: deep
intro: |
  Cloud-Native doesn't always mean "In the Cloud." During recent 
  infrastructure projects, Harvester was used to transform bare-metal 
  hardware into a private cloud, bridging the gap between legacy VMs 
  and modern Kubernetes workloads with a single, unified control plane.
fetchReadme: false
editLink: true
image: /images/harvester.webp
languages: Go, Shell, Other
fetchML: false
---

<!--suppress CheckEmptyScriptTag, CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Challenge: The "Legacy Island" Problem

Throughout a career in infrastructure, environments have been managed where modern Kubernetes clusters lived alongside "Legacy Islands". This created a dual-ops burden: one team for VMware/Nutanix and another for Kubernetes.

For mission-critical infrastructure, this operational fragmentation was a risk. A method was needed to manage VMs with the same GitOps and SRE principles used for containers.

## The Strategy: Unified Hyperconverged Infrastructure (HCI)

Early experience in **Integrating Physical Systems (AV, DMX, Camera systems)** taught that every endpoint—no matter its age—should be addressable via a central API. **Harvester** was selected as the HCI foundation because it is built on Kubernetes, allowing for:

1. **Unified Control Plane:** Manage both VMs and Containers side-by-side using **Rancher**.
2. **Kubernetes-Native Storage:** Leveraging Longhorn for distributed, block-level storage across bare-metal nodes.
3. **Hardware Efficiency:** Reclaiming underutilized resources by consolidating legacy VM workloads onto the same hardware as high-performance K8s clusters.

## Implementation: Turning Bare Metal into a Cloud API

Harvester was deployed on commodity hardware, effectively building a private cloud region. This allowed the SRE team to use **Terraform** and **Crossplane** to provision VMs just as easily as provisioning S3 buckets in AWS.

```yaml
# A strategic Harvester VM definition managed via Kubernetes APIs
apiVersion: devices.harvesterhci.io/v1beta1
kind: VirtualMachine
metadata:
  name: legacy-windows-service
spec:
  runStrategy: RerunOnFailure
  template:
    spec:
      domain:
        cpu: { cores: 4 }
        memory: { guest: 8Gi }
        devices:
          disks:
            - name: rootdisk
              bootOrder: 1
      volumes:
        - name: rootdisk
          containerDisk:
            image: harvester/os-images:windows-2022
```

By bringing the VM into the Kubernetes namespace, the same **Cilium** network policies and **OpenTelemetry** monitoring could be applied to legacy services as to microservices.

## Impact: Operational Simplicity and 30% Better Utilization

The move to Harvester fundamentally changed the approach to hybrid-cloud:

*   **Unified Operations:** The SRE team now manages the entire lifecycle of both VMs and Containers through a single GitOps pipeline (ArgoCD + Rancher).
*   **Hardware Rightsizing:** Bare-metal hardware utilization was improved by 30% by eliminating the overhead of proprietary virtualization licenses and separate management stacks.
*   **Edge Resilience:** Harvester enables the operation of a "Cloud-in-a-Box" at remote edge locations, ensuring that critical crisis management tools remain available even if the connection to the central AWS region is severed.

## Conclusion

Harvester represents the logical conclusion of the "Everything as Code" movement. Treating virtualization as just another Kubernetes workload removes the silos that slow down enterprise innovation.

Whether integrating **DMX lighting** or **Enterprise SQL databases**, the goal remains the same: to build a system that is unified, auditable, and resilient. Harvester is the foundation that makes this possible in a hybrid-cloud world.

<ArticleFooter :frontmatter="$frontmatter"/>
