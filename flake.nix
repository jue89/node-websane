{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: flake-utils.lib.eachDefaultSystem (system: let
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    packages = rec {
      websane = import ./websane pkgs;
      batch-scan = import ./batch-scan pkgs;
      sort-tool = import ./sort-tool pkgs;
      default = websane;
    };
  }) // {
    overlays.default = import ./overlay.nix;
    nixosModules.default = import ./module.nix;
  };
}
