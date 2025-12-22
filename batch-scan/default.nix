{ rustPlatform, pkg-config, sane-backends, libclang, ... } : rustPlatform.buildRustPackage {
  name = "batch-scan";
  src = ./.;

  cargoDeps = rustPlatform.importCargoLock {
    lockFile = ./Cargo.lock;
    outputHashes = {
      "sane-scan-0.1.3" = "sha256-FX9E++l1Q6Ox0zS5a+x3tPGU25yhG3HbvM1LCiHGddw=";
    };
  };

  env = {
    LIBCLANG_PATH = "${libclang.lib}/lib";
    CPATH = "${sane-backends}/include";
  };

  nativeBuildInputs = [ pkg-config ];

  buildInputs = [ sane-backends ];
}
