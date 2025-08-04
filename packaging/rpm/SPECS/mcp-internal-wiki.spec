Name:           mcp-internal-wiki
Version:        1.0.0
Release:        1%{?dist}
Summary:        Model Context Protocol server for internal wiki content

License:        MIT
URL:            https://github.com/your-org/mcp-internal-wiki
Source0:        %{name}-%{version}.tar.gz

BuildArch:      noarch
BuildRequires:  nodejs >= 18.0.0
BuildRequires:  npm
Requires:       nodejs >= 18.0.0
Requires:       systemd

%description
MCP Internal Wiki Server enables seamless integration of internal wiki
content with VS Code and other MCP-compatible editors. Features include
real-time content fetching, intelligent caching, AI-powered relevance
scoring, and comprehensive authentication support.

Key features:
* Multi-source wiki integration with authentication
* Enterprise-grade performance optimization  
* Modular agent-based architecture
* VS Code integration via MCP protocol
* Docker containerization support
* NixOS and Linux distribution packages

%prep
%setup -q

%build
npm ci --only=production
npm run build

%install
rm -rf $RPM_BUILD_ROOT

# Create directories
mkdir -p $RPM_BUILD_ROOT/usr/bin
mkdir -p $RPM_BUILD_ROOT/usr/lib/systemd/system
mkdir -p $RPM_BUILD_ROOT/etc/mcp-internal-wiki
mkdir -p $RPM_BUILD_ROOT/usr/share/mcp-internal-wiki

# Install application files
cp -r dist node_modules package.json $RPM_BUILD_ROOT/usr/share/mcp-internal-wiki/
cp bin/mcp-wiki-server.js $RPM_BUILD_ROOT/usr/bin/mcp-wiki-server
cp mcp-internal-wiki.service $RPM_BUILD_ROOT/usr/lib/systemd/system/
cp mcp.config.json $RPM_BUILD_ROOT/etc/mcp-internal-wiki/mcp.config.json.example

# Make binary executable
chmod +x $RPM_BUILD_ROOT/usr/bin/mcp-wiki-server

%pre
getent group mcp >/dev/null || groupadd -r mcp
getent passwd mcp >/dev/null || \
    useradd -r -g mcp -d /var/lib/mcp -s /sbin/nologin \
    -c "MCP Internal Wiki Server" mcp
exit 0

%post
%systemd_post mcp-internal-wiki.service

%preun
%systemd_preun mcp-internal-wiki.service

%postun
%systemd_postun_with_restart mcp-internal-wiki.service
if [ $1 -eq 0 ] ; then
    getent passwd mcp >/dev/null && userdel mcp
    getent group mcp >/dev/null && groupdel mcp
fi

%files
%defattr(-,root,root,-)
/usr/bin/mcp-wiki-server
/usr/lib/systemd/system/mcp-internal-wiki.service
/usr/share/mcp-internal-wiki/
%config(noreplace) /etc/mcp-internal-wiki/mcp.config.json.example
%attr(755,mcp,mcp) /etc/mcp-internal-wiki

%changelog
* %(date "+%a %b %d %Y") MCP Internal Wiki Team <maintainer@example.com> - 1.0.0-1
- Initial RPM release
- Enterprise-ready MCP server with agent architecture
- VS Code integration and performance optimization
- Multi-platform support (Linux, NixOS, Docker)
