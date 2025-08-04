#!/bin/bash
set -e

# Build script for creating distribution packages
# Supports: deb, rpm, and source packages

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION="1.0.0"
PACKAGE_NAME="mcp-internal-wiki"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to build Debian package
build_deb() {
    log_info "Building Debian package..."
    
    if ! command_exists dpkg-deb; then
        log_error "dpkg-deb not found. Please install dpkg-dev package."
        return 1
    fi
    
    # Prepare package directory
    local deb_dir="$PROJECT_ROOT/packaging/debian"
    local build_dir="$PROJECT_ROOT/build/deb"
    
    rm -rf "$build_dir"
    mkdir -p "$build_dir"
    cp -r "$deb_dir" "$build_dir/"
    
    # Copy application files
    mkdir -p "$build_dir/debian/usr/share/mcp-internal-wiki"
    cp -r "$PROJECT_ROOT/dist" "$build_dir/debian/usr/share/mcp-internal-wiki/"
    cp -r "$PROJECT_ROOT/node_modules" "$build_dir/debian/usr/share/mcp-internal-wiki/"
    cp "$PROJECT_ROOT/package.json" "$build_dir/debian/usr/share/mcp-internal-wiki/"
    
    # Copy systemd service
    cp "$PROJECT_ROOT/mcp-internal-wiki.service" "$build_dir/debian/usr/lib/systemd/system/"
    
    # Copy example config
    cp "$PROJECT_ROOT/mcp.config.json" "$build_dir/debian/etc/mcp-internal-wiki/mcp.config.json.example"
    
    # Create wrapper script
    cat > "$build_dir/debian/usr/bin/mcp-wiki-server" << 'EOF'
#!/bin/bash
exec node /usr/share/mcp-internal-wiki/dist/server.js "$@"
EOF
    chmod +x "$build_dir/debian/usr/bin/mcp-wiki-server"
    
    # Build package
    cd "$build_dir"
    dpkg-deb --build debian "${PACKAGE_NAME}_${VERSION}_all.deb"
    
    # Move to dist directory
    mkdir -p "$PROJECT_ROOT/dist/packages"
    mv "${PACKAGE_NAME}_${VERSION}_all.deb" "$PROJECT_ROOT/dist/packages/"
    
    log_success "Debian package created: dist/packages/${PACKAGE_NAME}_${VERSION}_all.deb"
}

# Function to build RPM package
build_rpm() {
    log_info "Building RPM package..."
    
    if ! command_exists rpmbuild; then
        log_error "rpmbuild not found. Please install rpm-build package."
        return 1
    fi
    
    # Create source tarball
    local temp_dir=$(mktemp -d)
    local source_dir="$temp_dir/${PACKAGE_NAME}-${VERSION}"
    
    mkdir -p "$source_dir"
    cp -r "$PROJECT_ROOT"/{src,bin,package.json,tsconfig.json,mcp.config.json,mcp-internal-wiki.service} "$source_dir/"
    
    # Create tarball
    cd "$temp_dir"
    tar -czf "${PACKAGE_NAME}-${VERSION}.tar.gz" "${PACKAGE_NAME}-${VERSION}"
    
    # Copy to SOURCES
    cp "${PACKAGE_NAME}-${VERSION}.tar.gz" "$PROJECT_ROOT/packaging/rpm/SOURCES/"
    
    # Build RPM
    cd "$PROJECT_ROOT"
    rpmbuild --define "_topdir $PWD/packaging/rpm" \
             --define "_builddir $PWD/packaging/rpm/BUILD" \
             --define "_sourcedir $PWD/packaging/rpm/SOURCES" \
             --define "_specdir $PWD/packaging/rpm/SPECS" \
             --define "_rpmdir $PWD/packaging/rpm/RPMS" \
             --define "_srcrpmdir $PWD/packaging/rpm/SRPMS" \
             -ba packaging/rpm/SPECS/mcp-internal-wiki.spec
    
    # Move packages to dist directory
    mkdir -p "$PROJECT_ROOT/dist/packages"
    find "$PROJECT_ROOT/packaging/rpm/RPMS" -name "*.rpm" -exec cp {} "$PROJECT_ROOT/dist/packages/" \;
    find "$PROJECT_ROOT/packaging/rpm/SRPMS" -name "*.rpm" -exec cp {} "$PROJECT_ROOT/dist/packages/" \;
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "RPM packages created in dist/packages/"
}

# Function to create source package
create_source_package() {
    log_info "Creating source package..."
    
    local temp_dir=$(mktemp -d)
    local source_dir="$temp_dir/${PACKAGE_NAME}-${VERSION}"
    
    mkdir -p "$source_dir"
    
    # Copy source files (exclude build artifacts)
    rsync -av --exclude='node_modules' \
              --exclude='dist' \
              --exclude='build' \
              --exclude='*.log' \
              --exclude='.git' \
              --exclude='packaging/*/BUILD' \
              --exclude='packaging/*/RPMS' \
              --exclude='packaging/*/SRPMS' \
              "$PROJECT_ROOT/" "$source_dir/"
    
    cd "$temp_dir"
    tar -czf "${PACKAGE_NAME}-${VERSION}.tar.gz" "${PACKAGE_NAME}-${VERSION}"
    
    mkdir -p "$PROJECT_ROOT/dist/packages"
    mv "${PACKAGE_NAME}-${VERSION}.tar.gz" "$PROJECT_ROOT/dist/packages/"
    
    rm -rf "$temp_dir"
    
    log_success "Source package created: dist/packages/${PACKAGE_NAME}-${VERSION}.tar.gz"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [PACKAGE_TYPE]"
    echo ""
    echo "Package Types:"
    echo "  deb       Build Debian package"
    echo "  rpm       Build RPM package"
    echo "  source    Create source tarball"
    echo "  all       Build all package types"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -v, --verbose Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 deb              # Build only Debian package"
    echo "  $0 rpm              # Build only RPM package"
    echo "  $0 all              # Build all packages"
}

# Main function
main() {
    local package_type="all"
    local verbose=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            deb|rpm|source|all)
                package_type="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting package build process..."
    log_info "Package: $PACKAGE_NAME"
    log_info "Version: $VERSION"
    log_info "Type: $package_type"
    
    # Ensure we're in the project root
    cd "$PROJECT_ROOT"
    
    # Build the project first
    log_info "Building project..."
    npm ci
    npm run build
    
    # Create packages based on type
    case $package_type in
        deb)
            build_deb
            ;;
        rpm)
            build_rpm
            ;;
        source)
            create_source_package
            ;;
        all)
            create_source_package
            build_deb
            build_rpm
            ;;
        *)
            log_error "Invalid package type: $package_type"
            exit 1
            ;;
    esac
    
    log_success "Package build completed!"
    log_info "Packages available in: dist/packages/"
    ls -la "$PROJECT_ROOT/dist/packages/" 2>/dev/null || true
}

# Run main function
main "$@"
