---
project: nixpkgs
user: NixOS
gitlink: https://github.com/NixOS/nixpkgs
githost: https://raw.githubusercontent.com/
branch: main
readmeFile: README.md
type: blog
title: "Declarative Infrastructure at Scale: Using NixOS on AWS EC2 via Custom AMIs for Immutable Production Environments"
date: 2025-12-04
outline: deep
intro: |
  NixOS is more than just a Linux distribution; it's a paradigm shift for infrastructure management. By leveraging NixOS 
  on AWS EC2, organizations can achieve truly immutable infrastructure, where every server is a reproducible artifact 
  defined by code, eliminating configuration drift and simplifying compliance.
fetchReadme: false
editLink: true
image: /images/nixos.webp
externalUrl: https://nixos.org/
fetchML: false
---

<!--suppress ALL, CheckEmptyScriptTag, HtmlUnknownAttribute -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Enterprise Case for NixOS

In enterprise environments, configuration drift is a silent killer of reliability. Traditional configuration management
tools (Ansible, Chef, Puppet) attempt to converge a system to a desired state, but they often leave behind artifacts or
fail to account for manual changes.

**NixOS** solves this fundamentally. It treats the entire operating system configuration as a pure function:
`f(configuration.nix) -> System`. This means:

1. **Reproducibility**: A server built today is identical to one built six months from now, given the same input.
2. **Atomic Rollbacks**: Every change is a new generation. If a deployment fails, rolling back is instantaneous and
   guaranteed to work.
3. **Immutable Infrastructure**: Instead of patching running servers, you deploy new, immutable AMIs (Amazon Machine
   Images) generated directly from your Nix configuration.

## Building Custom AWS AMIs with Nix

One of the most powerful applications of NixOS in the cloud is the ability to build custom AMIs declaratively. Instead
of maintaining "golden images" with Packer and shell scripts, you define your image in Nix.

### Example: Defining an AWS Image

Using `nixos-generators`, you can output an AMI directly from your configuration.

```nix
{ pkgs, modulesPath, ... }: {
  imports = [ "${modulesPath}/virtualisation/amazon-image.nix" ];
  
  # System Configuration
  networking.hostName = "production-web-01";
  services.openssh.enable = true;

  # Application Stack
  environment.systemPackages = with pkgs; [
    nginx
    postgresql
    awscli2
  ];

  # Security Hardening
  security.sudo.wheelNeedsPassword = false;
  users.users.deploy = {
    isNormalUser = true;
    extraGroups = [ "wheel" ];
    openssh.authorizedKeys.keys = [ "ssh-ed25519 AAA..." ];
  };
}
```

Running `nix build .#amazonImage` produces an AMI that can be directly uploaded to AWS.

## Infrastructure as Code: Terraform & NixOS

Integrating NixOS into a Terraform workflow creates a powerful synergy. Terraform manages the cloud resources (VPC,
Security Groups, EC2 Instances), while NixOS manages the instance internals.

By passing the NixOS configuration via **user_data** or using a custom AMI ID, you ensure that the instance boots into
the exact state defined in your repository.

```hcl
resource "aws_instance" "web" {
  ami           = var.nixos_ami_id
  instance_type = "t3.medium"
  
  # NixOS configuration can also be injected here for runtime configuration
  user_data = file("configuration.nix") 
}
```

## Scaling with Auto Scaling Groups (ASG)

Because NixOS configurations are deterministic, scaling becomes trivial. An Auto Scaling Group can launch hundreds of
instances, and each one will be an exact replica of the others. There is no "convergence time" or "provisioning scripts"
that might fail on some nodes but not others. The instance boots, reads its configuration (or uses the pre-baked AMI),
and is ready to serve traffic immediately.

## Conclusion

Adopting NixOS for AWS infrastructure moves beyond simple automation to **provable correctness**. It allows teams to
treat servers like ephemeral containers, reducing maintenance overhead and increasing system reliability. For
organizations looking to scale their operations while maintaining strict control over their environments, NixOS offers a
compelling, modern solution.
