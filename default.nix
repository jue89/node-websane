{ buildNpmPackage, ... } : buildNpmPackage {
  name = "websane";
  src = ./.;
  npmDepsHash = "sha256-+Cn/YPZToEN3oA5cT3TaNv3bt4ckj8zG3SLnWj5fZXw=";
  dontNpmBuild = true;
}
