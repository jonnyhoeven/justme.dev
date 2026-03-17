---
project: harvester
user: harvester
gitlink: https://github.com/harvester/harvester
githost: https://github.com
branch: master
readmeFile: README.md
type: blog
title: "Hybrid Cloud Strategies: Bridging Harvester HCI and AWS Outposts for Low-Latency Workloads"
date: 2023-04-13
outline: deep
intro: |
   Harvester is a modern, open-source Hyperconverged Infrastructure (HCI) solution built on Kubernetes. This article 
   explores how Harvester can serve as a cost-effective, on-premises foundation for hybrid cloud architectures, 
   seamlessly integrating with AWS Outposts and EKS Anywhere to deliver low-latency workloads at the edge.
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

## The Hybrid Cloud Challenge

Enterprises are increasingly adopting hybrid cloud strategies to balance the scalability of public clouds like AWS with
the data sovereignty and latency requirements of on-premises infrastructure. **Harvester** provides a compelling
solution by offering a cloud-native HCI platform that runs on bare metal, effectively turning your datacenter into a
private cloud region.

## Harvester: Kubernetes-Native HCI

Unlike traditional virtualization platforms (VMware, Nutanix), Harvester is built *on top of* Kubernetes. This means:

1. **Unified Management**: VMs and Containers are managed side-by-side using the same Kubernetes API.
2. **Rancher Integration**: Seamlessly deploy Kubernetes clusters on top of Harvester VMs, managed centrally via
   Rancher.
3. **Cost Efficiency**: Open-source and hardware-agnostic, reducing licensing costs compared to proprietary HCI
   solutions.

## Integrating with AWS Hybrid Services

For organizations leveraging AWS, Harvester acts as the perfect on-premises counterpart.

### AWS Outposts & EKS Anywhere

While AWS Outposts extends AWS infrastructure to your datacenter, it can be cost-prohibitive for smaller edge locations.
Harvester can fill this gap by running **EKS Anywhere** clusters on bare metal or VMs. This allows you to maintain a
consistent Kubernetes operational model across:

* **AWS Region**: EKS (Elastic Kubernetes Service)
* **On-Premises Core**: AWS Outposts
* **Edge Locations**: Harvester running EKS Anywhere

### Data Gravity and Latency

By deploying Harvester at the edge, you can process data locally before sending aggregated insights to AWS S3 or
DynamoDB. This architecture minimizes latency for real-time applications (IoT, manufacturing) and reduces egress costs.

## Architecture: The Edge-to-Cloud Continuum

1. **Edge**: Harvester clusters running on commodity hardware, hosting local applications and data ingestion services.
2. **Core**: A central Rancher management plane (potentially on AWS) orchestrating these edge clusters.
3. **Cloud**: AWS services for long-term storage, analytics, and global distribution.

## Conclusion

Harvester bridges the gap between traditional virtualization and modern cloud-native infrastructure. By adopting
Harvester as part of a broader hybrid cloud strategy involving AWS, organizations can achieve the flexibility of the
cloud with the performance and control of on-premises hardware. It empowers teams to build resilient, low-latency
architectures that span from the edge to the cloud.

<ArticleFooter :frontmatter="$frontmatter"/>
