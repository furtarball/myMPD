---
layout: page
permalink: /installation/prebuild-packages
title: Prebuild packages
---

## Prebuild packages from openSUSE Build Service

- [Project homepage](https://build.opensuse.org/package/show/home:jcorporation/myMPD)
- [Repositories](https://download.opensuse.org/repositories/home:/jcorporation/)

Download the appropriated package for your distribution and install it with the package manager.

Following distributions are supported:

- Arch
- Debian
- Fedora
- Raspian
- openSUSE
- Ubuntu

### Debian Installation

When installing on Debian, the easiest way is to configure your package manager to securely download from the jcorporation repository.
It allows you to use apt's native update mechanism to upgrade myMPD instead of having to manually download the deb package for each new release.

```
# Download JCorporation's signing key locally and install it in a dedicated keyring
curl http://download.opensuse.org/repositories/home:/jcorporation/Debian_11/Release.key | gpg --no-default-keyring --keyring /usr/share/keyrings/jcorporation.github.io.gpg --import

# ⚠️ VERIFY the fingerprint of the downloaded key (A37A ADC4 0A1C C6BE FB75  372F AA09 B8CC E895 BD7D - home:jcorporation OBS Project <home:jcorporation@build.opensuse.org>) 
gpg --no-default-keyring --keyring /usr/share/keyrings/jcorporation.github.io.gpg --fingerprint

# Get Debian VERSION_ID from os-release file
source /etc/os-release
echo $VERSION_ID

# Add JCorporation APT repository and ensure releases are signed with the repository's official keys
cat <<EOF > /etc/apt/sources.list.d/jcorporation.list
deb [signed-by=/usr/share/keyrings/jcorporation.github.io.gpg] http://download.opensuse.org/repositories/home:/jcorporation/Debian_$VERSION_ID/ ./
EOF
cat /etc/apt/sources.list.d/jcorporation.list

# Install MyMPD
apt update
apt install mympd
 ```

## Dependencies

- libpcre2: for pcre support (8 bit runtime files)
- OpenSSL >= 1.1.0 (optional): for https support
- libid3tag (optional): to extract embedded albumart
- flac (optional): to extract embedded albumart
- liblua >= 5.3.0 (optional): for scripting myMPD
