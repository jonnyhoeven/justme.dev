{
  description = "justme.dev development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        
        # Base packages needed for both local dev and CI
        basePackages = with pkgs; [
          nodejs_22
          corepack_22
          (python3.withPackages (ps: with ps; [
            pyyaml
            requests
          ]))
          ruff
        ];
      in
      {
        devShells = {
          # Local development shell (includes ImageMagick)
          default = pkgs.mkShell {
            nativeBuildInputs = basePackages ++ [ pkgs.imagemagick ];
            shellHook = ''
              echo "❄️  justme.dev Nix DevShell (Local) Loaded"
              echo "Node: $(node --version) | Python: $(python3 --version) | ImageMagick: $(convert -version | head -n 1)"
              export PATH="$PWD/node_modules/.bin:$PATH"
            '';
          };

          # Lightweight CI shell (excludes ImageMagick)
          ci = pkgs.mkShell {
            nativeBuildInputs = basePackages;
            shellHook = ''
              echo "❄️  justme.dev Nix CI Shell Loaded"
            '';
          };
        };
      });
}
