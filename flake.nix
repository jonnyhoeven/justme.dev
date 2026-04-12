{
  description: "justme.dev development environment";

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
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            # Node.js environment
            nodejs_22
            # Build tools
            pkg-config
            libvips
            
            # Python environment for ETL
            (python3.withPackages (ps: with ps; [
              pyyaml
              requests
            ]))
            ruff
          ];

          shellHook = ''
            echo "❄️  justme.dev Nix DevShell Loaded"
            echo "Node version: $(node --version)"
            echo "Python version: $(python3 --version)"
            
            # Ensure local node_modules/.bin is in PATH
            export PATH="$PWD/node_modules/.bin:$PATH"
            
            # Reminder for Python virtual environment if needed
            if [ ! -d ".venv" ]; then
              echo "💡 Note: Python .venv not found. Run 'python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt' if you prefer a local venv."
            fi
          '';
        };
      });
}
