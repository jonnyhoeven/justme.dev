---
branch: master
date: 2023-04-13
editLink: false
fetchML: true
fetchReadme: false
gitlink: https://github.com/harvester/harvester
image: /images/harvester.webp
intro: Harvester is an open-source, cloud-native hyperconverged infrastructure (HCI) solution built on Kubernetes, designed
  for operators seeking an alternative to traditional HCI offerings. With its integrated virtualization and distributed storage
  capabilities, Harvester runs on bare metal servers and supports both traditional virtual machines (VMs) and containerized
  environments through integration with Rancher. In this blog post, we'll explore what Harvester is, how it can be used for
  edge networks, and its key features.
languages: Go, Shell, Other
messages:
- content: 'You''re a developer writing a blog, Intro using 4 sentences, Blog Post using 10, don''t use "*". Desired format:
    Intro: -||- BlogPost: -||-'
  role: system
- content: 'Write a blog post about harvester and what it does, how it can be used for edge networks. based on the following
    github readme: Harvester is a modern, open, interoperable, hyperconverged infrastructure  (HCI) solution built on Kubernetes.
    It is an open-source alternative designed for operators seeking a cloud-native  HCI solution. Harvester runs on bare metal
    servers and provides integrated virtualization and distributed storage  capabilities. In addition to traditional virtual
    machines (VMs), Harvester supports containerized environments  automatically through integration with Rancher. '
  role: user
model: openchat/openchat-3.5-1210
project: harvester
title: Harvester
total_tokens: 921
type: post
user: harvester
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>
Harvester: An Open-Source, Cloud-Native Hyperconverged Infrastructure Solution  Harvester is an innovative open-source
HCI solution that brings the benefits of Kubernetes to operators looking for a modern, interoperable, and cloud-native
alternative. Built on Kubernetes, Harvester provides a flexible and scalable platform for deploying and managing both
traditional VMs and containerized applications.  One of the key advantages of Harvester is its ability to run on bare
metal servers, which allows it to be deployed in various environments, including edge networks. Edge networks are
distributed computing environments that bring processing and storage closer to the data sources, reducing latency and
improving overall performance. Harvester's support for bare metal deployment makes it an ideal choice for edge computing
scenarios, where traditional HCI solutions may not be suitable due to their reliance on virtualization hypervisors.
Integrated Virtualization and Distributed Storage Capabilities  Harvester offers integrated virtualization and
distributed storage capabilities, enabling operators to create and manage virtual machines and storage resources with
ease. Its distributed storage system ensures that data is evenly distributed across multiple storage nodes, providing
high availability and fault tolerance. Additionally, Harvester supports various storage backends, including Ceph,
Gluster, and NFS, allowing operators to choose the most suitable storage solution for their needs.  Container Support
through Rancher Integration  In addition to traditional VMs, Harvester also supports containerized environments through
its integration with Rancher. Rancher is a popular Kubernetes management platform that simplifies the deployment,
management, and scaling of containerized applications. By integrating with Rancher, Harvester provides a seamless path
for operators to adopt containerized workloads and take advantage of the benefits of Kubernetes, such as improved
scalability, portability, and resource management


<ArticleFooter :frontmatter="$frontmatter"/>
