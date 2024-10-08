---
branch: master
date: 2023-04-13
editLink: true
githost: https://github.com
image: /images/harvester.webp
languages: Go, Shell, Other
project: harvester
title: Harvester
type: post
user: harvester
intro: |
    Harvester is a cutting-edge, open, interoperable, hyperconverged infrastructure (HCI) solution that is built on the
    robust foundation of Kubernetes. It presents itself as an open-source alternative specifically designed for operators
    who are in search of a cloud-native HCI solution.
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

Harvester operates on bare metal servers and offers integrated virtualization and distributed storage capabilities. This
means that it not only supports traditional virtual machines (VMs) but also automatically supports containerized
environments. This is made possible through its seamless integration with Rancher, a complete software stack for teams
adopting containers.

## Harvester for Edge Networks

Edge networks, which bring computation and data storage closer to the location where it is needed, to improve response
times and save bandwidth, can greatly benefit from Harvester. With its cloud-native approach, Harvester can help edge
networks achieve lower latency, higher efficiency, and more robust security. Its ability to run on bare metal servers
means that it can be deployed directly on edge devices, reducing the need for additional network hops and thus further
reducing latency.

## Conclusion

In conclusion, Harvester is a modern, open-source HCI solution that is not only capable of running VMs but also supports
containerized environments. Its integration with Rancher and ability to run on bare metal servers makes it an ideal
solution for edge networks. With Harvester, operators can leverage the power of Kubernetes and cloud-native technologies
to build efficient, secure, and low-latency edge networks.

<ArticleFooter :frontmatter="$frontmatter"/>
