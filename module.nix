{ config, lib, pkgs, ... }: with lib; let
  cfg = config.services.websane;
  opts = {
    enable = mkOption {
      type = types.bool;
      default = false;
      description = "Enable Websane";
    };
    port = mkOption {
      type = types.port;
      description = "Port to listen on";
      default = 8080;
    };
    scandir = mkOption {
      type = types.path;
      description = "Scan directory";
      default = "/tmp/scans";
    };
  };
in {
  options.services.websane = opts;

  config = mkIf cfg.enable {
    systemd = {
      services.websane = {
        environment = {
          UIPORT = cfg.port;
          SCANIMAGE_BIN = "${pkgs.sane-backends}/bin/scanimage";
          CONVERT_BIN = "${pkgs.imagemagick}/bin/convert";
          SCANDIR = cfg.scandir;
        };
        script = "${pkgs.websane}/bin/websane";
      };
    };

    hardware.sane.enable = true;
  };
}
