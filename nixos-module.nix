# NixOS module for MCP Internal Wiki Server
{
  config,
  lib,
  pkgs,
  ...
}:
with lib; let
  cfg = config.services.mcp-internal-wiki;
in {
  options.services.mcp-internal-wiki = {
    enable = mkEnableOption "MCP Internal Wiki Server";

    package = mkOption {
      type = types.package;
      default = pkgs.callPackage ./default.nix {};
      description = "The MCP Internal Wiki package to use.";
    };

    wikiUrls = mkOption {
      type = types.listOf types.str;
      default = [];
      description = "List of wiki URLs to reference.";
      example = literalExpression ''
        [
          "https://wiki.nixos.org/wiki/NixOS_Wiki"
          "https://your-company-wiki.example.com"
        ]
      '';
    };

    user = mkOption {
      type = types.str;
      default = "mcp-wiki";
      description = "User account under which the MCP server runs.";
    };

    group = mkOption {
      type = types.str;
      default = "mcp-wiki";
      description = "Group under which the MCP server runs.";
    };
  };

  config = mkIf cfg.enable {
    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      description = "MCP Internal Wiki Server user";
      home = "/var/lib/mcp-internal-wiki";
      createHome = true;
    };

    users.groups.${cfg.group} = {};

    systemd.services.mcp-internal-wiki = {
      description = "MCP Internal Wiki Server";
      after = ["network.target"];
      wantedBy = ["multi-user.target"];

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/mcp-wiki-server";
        Restart = "on-failure";
        User = cfg.user;
        Group = cfg.group;
        WorkingDirectory = "/var/lib/mcp-internal-wiki";
        StateDirectory = "mcp-internal-wiki";
      };

      preStart = ''
        # Create config file
        cat > /var/lib/mcp-internal-wiki/mcp.config.json << EOF
        {
          "wikiUrls": ${builtins.toJSON cfg.wikiUrls}
        }
        EOF
      '';
    };
  };
}
