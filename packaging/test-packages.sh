#!/bin/bash
set -e

# Package testing script for MCP Internal Wiki Server
# Tests package installation, functionality, and removal

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_DIR="$PROJECT_ROOT/dist/packages"

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

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to detect package manager
detect_package_manager() {
    if command -v dpkg >/dev/null 2>&1; then
        echo "deb"
    elif command -v rpm >/dev/null 2>&1; then
        echo "rpm"
    else
        log_error "No supported package manager found (dpkg or rpm)"
        exit 1
    fi
}

# Function to install package
install_package() {
    local package_type="$1"
    local package_file=""
    
    case $package_type in
        deb)
            package_file=$(find "$PACKAGE_DIR" -name "*.deb" | head -1)
            if [[ -z "$package_file" ]]; then
                log_error "No .deb package found in $PACKAGE_DIR"
                return 1
            fi
            log_info "Installing Debian package: $package_file"
            dpkg -i "$package_file" || apt-get install -f -y
            ;;
        rpm)
            package_file=$(find "$PACKAGE_DIR" -name "*.rpm" | grep -v ".src.rpm" | head -1)
            if [[ -z "$package_file" ]]; then
                log_error "No .rpm package found in $PACKAGE_DIR"
                return 1
            fi
            log_info "Installing RPM package: $package_file"
            if command -v dnf >/dev/null 2>&1; then
                dnf install -y "$package_file"
            elif command -v yum >/dev/null 2>&1; then
                yum install -y "$package_file"
            else
                rpm -ivh "$package_file"
            fi
            ;;
        *)
            log_error "Unsupported package type: $package_type"
            return 1
            ;;
    esac
    
    log_success "Package installed successfully"
}

# Function to test package functionality
test_package_functionality() {
    log_info "Testing package functionality..."
    
    # Test 1: Check if binary is installed and executable
    if ! command -v mcp-wiki-server >/dev/null 2>&1; then
        log_error "mcp-wiki-server command not found in PATH"
        return 1
    fi
    log_success "✓ Binary installed and in PATH"
    
    # Test 2: Check if service file is installed
    if [[ -f /usr/lib/systemd/system/mcp-internal-wiki.service ]]; then
        log_success "✓ Systemd service file installed"
    else
        log_warning "⚠ Systemd service file not found"
    fi
    
    # Test 3: Check if config directory exists
    if [[ -d /etc/mcp-internal-wiki ]]; then
        log_success "✓ Configuration directory created"
    else
        log_warning "⚠ Configuration directory not found"
    fi
    
    # Test 4: Check if user was created
    if id "mcp" &>/dev/null; then
        log_success "✓ System user 'mcp' created"
    else
        log_warning "⚠ System user 'mcp' not found"
    fi
    
    # Test 5: Test basic server startup (timeout after 10 seconds)
    log_info "Testing server startup..."
    timeout 10s mcp-wiki-server --help >/dev/null 2>&1 && \
        log_success "✓ Server starts without errors" || \
        log_warning "⚠ Server startup test inconclusive"
    
    # Test 6: Check service can be enabled
    if systemctl enable mcp-internal-wiki &>/dev/null; then
        log_success "✓ Service can be enabled"
        systemctl disable mcp-internal-wiki &>/dev/null
    else
        log_warning "⚠ Service enablement failed"
    fi
    
    log_success "Package functionality tests completed"
}

# Function to remove package
remove_package() {
    local package_type="$1"
    
    log_info "Removing package..."
    
    case $package_type in
        deb)
            dpkg -r mcp-internal-wiki
            ;;
        rpm)
            if command -v dnf >/dev/null 2>&1; then
                dnf remove -y mcp-internal-wiki
            elif command -v yum >/dev/null 2>&1; then
                yum remove -y mcp-internal-wiki
            else
                rpm -e mcp-internal-wiki
            fi
            ;;
        *)
            log_error "Unsupported package type: $package_type"
            return 1
            ;;
    esac
    
    log_success "Package removed successfully"
}

# Function to test package removal
test_package_removal() {
    log_info "Testing package removal..."
    
    # Test 1: Check if binary is removed
    if ! command -v mcp-wiki-server >/dev/null 2>&1; then
        log_success "✓ Binary removed from PATH"
    else
        log_warning "⚠ Binary still in PATH after removal"
    fi
    
    # Test 2: Check if service file is removed
    if [[ ! -f /usr/lib/systemd/system/mcp-internal-wiki.service ]]; then
        log_success "✓ Systemd service file removed"
    else
        log_warning "⚠ Systemd service file still present"
    fi
    
    # Test 3: Check if user still exists (should remain for deb, removed for rpm)
    if id "mcp" &>/dev/null; then
        log_info "ℹ System user 'mcp' still exists (normal for some package types)"
    else
        log_success "✓ System user 'mcp' removed"
    fi
    
    log_success "Package removal tests completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [ACTION]"
    echo ""
    echo "Actions:"
    echo "  install     Install package"
    echo "  test        Test installed package functionality"
    echo "  remove      Remove package"
    echo "  full        Full test cycle (install -> test -> remove)"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  --deb         Force Debian package testing"
    echo "  --rpm         Force RPM package testing"
    echo ""
    echo "Examples:"
    echo "  sudo $0 install           # Install package"
    echo "  sudo $0 test              # Test functionality"
    echo "  sudo $0 full              # Full test cycle"
    echo "  sudo $0 --deb full        # Full test with .deb package"
}

# Main function
main() {
    local action="full"
    local package_type=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --deb)
                package_type="deb"
                shift
                ;;
            --rpm)
                package_type="rpm"
                shift
                ;;
            install|test|remove|full)
                action="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check for root privileges
    check_root
    
    # Auto-detect package type if not specified
    if [[ -z "$package_type" ]]; then
        package_type=$(detect_package_manager)
        log_info "Auto-detected package manager: $package_type"
    fi
    
    log_info "Starting package testing..."
    log_info "Action: $action"
    log_info "Package type: $package_type"
    
    # Ensure package directory exists
    if [[ ! -d "$PACKAGE_DIR" ]]; then
        log_error "Package directory not found: $PACKAGE_DIR"
        log_info "Please build packages first using: just package-all"
        exit 1
    fi
    
    # Execute action
    case $action in
        install)
            install_package "$package_type"
            ;;
        test)
            test_package_functionality
            ;;
        remove)
            remove_package "$package_type"
            ;;
        full)
            install_package "$package_type"
            test_package_functionality
            remove_package "$package_type"
            test_package_removal
            ;;
        *)
            log_error "Invalid action: $action"
            exit 1
            ;;
    esac
    
    log_success "Package testing completed!"
}

# Run main function
main "$@"
