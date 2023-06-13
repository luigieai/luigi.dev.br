---
title: "Automating my homelab with ansible"
description: "My homelab is starting to increase, as I plan to host more services, I need to take a step back and start automating it"
pubDate: "Jun 12 2023"
heroImage: "/thumbs/post03.webp"
---

# About my homelab
I intend to create a post dedicated to showing all my homelab services and components, but taking a general overview, I started it with 2 computers running 24/7 in my house, 1 computer is for DNS and I'm planning what else to host with him (low cpu core) and another is running proxmox with 3 VM at the time I'm writing this. In my proxmox I have the following virtual machines:
* CSGO - Actually hosts 2 gameservers, CSGO and Project Zomboid
* VPN - Netmaker node where I host a virtual network with a oracle VM, also hosts a teamspeak server for me and my friends
* Containers - I'll write about it further

![Printscreen of my proxmox screen, showing my host settings and VM names](https://img001.prntscr.com/file/img001/is7ioCE8Q86y-MIWxDIZdQ.png)

## Why I need to automate *(and why I was managing manually in 2023)*
Counting baremetal plus VMs, I was with 4 deployed linux boxes to manage. Maybe is a low number in a corporate environmnent, but consideering that is my homelab, and some services is actually production (like DNS server), I belive it's time to get more professional about it, because sometimes after a long week working solving problems in a work incident, you don't wanna spend hours and hours in your weekend fixing your own server to use internet properly because you made a mistake. So I've decided to start with Ansible to configuration management and provisioning, which I'll talk in a moment, and made myself a little roadmap for server automation. 

### The roadmap

* Provisioning and OS configuration with ansible
* Server creation and golden images in proxmox with terraform + packer (maybe [immutable servers in future?](https://devopscube.com/immutable-infrastructure/) who knows)
* Gitops environment for my containers deployment, maybe for all bare metal services later
* Automate everything possible in pipelines, before and after gitops environment step is done, avoiding manual intervetions at max.

So, basically with automations in place and atleast a part of the roadmap to be done, I should have an easier life to maintain my homelab, one of my first creations was a [repo to my homelab](https://github.com/luigieai/homelab), as I'm starting with ansible provisioning automations, I just created an folder named ansible and started creating the roles right away!

## Ansible for the win
If you don't know about ansible, I highly recommend to take a look [here](https://docs.ansible.com/ansible/latest/index.html), basically we can provision and configure our servers with an easy YAML syntax and do multiple tasks at same time and with some consistency... *but seriously, take a look for a proper explaining*

My first objective is to create a role to provision and update all new and old servers, keeping the playbooks and roles simple as possible, and implementing new features or configuration variables only when I feel I need them. So, to get started, I created the new server role, where it does the following tasks:

- SSH Key: Add user ssh key to the server, so we can have passwordless login!
- NoSudo: We disable login prompt for sudo
- Update: Self explanatory, we update the system and reboot the server if needed

For SSH key I came with following: 
```yaml
  - name: Create .ssh directory for {{ ansible_user }}
    file:
      path: "/home/{{ ansible_user }}/.ssh"
      state: directory
      mode: '0700'

  - name: Add public key to authorized_keys file
    authorized_key:
      user: "{{ ansible_user }}"
      state: present
      key: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"
```
Now passwordless sudo:
```yaml
- name: Set paswordless sudo
  lineinfile:
    path: /etc/sudoers
    state: present
    regexp: '^%sudo'
    line: '%sudo ALL=(ALL) NOPASSWD: ALL'
    validate: 'visudo -cf %s'
```
And lastly the system update:
```yaml
---
  - name: Update apt cache and repo
    apt:
      update_cache: yes
      force_apt_get: yes
      cache_valid_time: 3600

  - name: Upgrade packages
    apt:
      upgrade: dist
      force_apt_get: yes

  - name: Check if a reboot is needed
    register: reboot_needed
    stat:
      path: /var/run/reboot-required
      get_md5: no

  - name: Reboot the server if kernel updated
    reboot:
      msg: "Reboot initiated by Ansible for OS updates"
      connect_timeout: 5
      reboot_timeout: 300
      pre_reboot_delay: 0
      post_reboot_delay: 30
      test_command: uptime
    when: reboot_needed.stat.exists
```
Now I have my debian based boxes properly configurated everytime I spin up a new VM! 

## Containers server
Proxmox have the ability to spin up linux containers, but I prefeer to have a VM with portainer installed so I have a more flexibility and a central point to hosts my apps that don't need a separate VM to properly operate. At time i'm writing this, I choose [portainer](https://docs.portainer.io/start/install-ce) because of it's own webGUI (I know i know... CLI is pratical and cooler, but sometimes a nice UI makes the things easier) and mainly because of the [gitops capabilities](https://www.portainer.io/gitops-automation) meaning that I can use my created repo for my homelab to manage containers from a git source of truth using pipelines. This will provide me easy deployment of containers even if I'm far from a computer, as I only would need to trigger the change from git using a pull request or a plain commit. For prerequisites to install portainer we need docker already installed, so I've created the role in ansible for installing docker, and spin up portainer container. To make my life easier, I installed already made roles by community in ansible galaxy, geerlingguy is always my top preferences when installing roles, I learned a lot of ansible seeing his videos/posts and repos, and fortunely we have a docker role created by him, so to get started I need to install the role

```bash
ansible-galaxy install geerlingguy.pip # We'll install pip to spin up containers via ansible
ansible-galaxy install geerlingguy.docker
```

With these roles installed, everything are now so easy, let's create the playbooks:

```yaml
---
- name: Install Docker & PIP (For managing container with ansible)
  include_role:
    name: "{{ item }}"
  with_items:
    - geerlingguy.pip
    - geerlingguy.docker
  vars:
    become: true
    pip_install_packages:
      - name: docker
  tags: installdocker

- name: Create volume for portainer
  community.docker.docker_volume:
    name: portainer_data
  tags: installportainer

- name: Create a portainer container
  community.docker.docker_container:
      name: portainer
      image: portainer/portainer-ce:2.18.3
      state: started
      volumes:
        - portainer_data:/data
        - /var/run/docker.sock:/var/run/docker.sock
      ports: 
        - "8000:8000"
        - "9443:9443"
      restart_policy: "always"
  tags: installportainer
  ```
Success! Now the last step is to test if the portainer initializes! I've already tested and made the first setup, I don't know if we can automate the first portainer setup but probably if we toy a little with docker volumes I should not need to configurate everytime because, only If I want to full reset for a reason. By default you need to access portainer by port 9443, as I described in playbook, but you can easily change by whatever port you want

![My portainer homepage with my local instance already running](https://img001.prntscr.com/file/img001/9DWidENDQU-Ts7mR2GUlEw.png)

Now, I need to setup gitops, but it's another task for another post, now that I have a "base" playbook for spinning my main service up of my homelab, the challenge is continuining automating all the VM's and the proxmox like previously said in my roadmap, I should note that I want to make my homelab opensource so I remember you that you [can check it out yourself my playbooks](https://github.com/luigieai/homelab). I'm always open to feedback, pull requests, or just discussing any topic about it! Thanks very much for the read, if you have any comment you can tag me at any social media that I have or at github topics!
