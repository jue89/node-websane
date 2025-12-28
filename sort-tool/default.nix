{ stdenv, lib, exiftool, makeWrapper, ... } : stdenv.mkDerivation {
  name = "sort-helper";
  src = ./.;
  nativeBuildInputs = [ makeWrapper ];
  installPhase = ''
    mkdir -p $out/bin
    cp sort-pdf.sh $out/bin/sort-pdf
    chmod +x $out/bin/sort-pdf
    wrapProgram $out/bin/sort-pdf \
      --prefix PATH : ${lib.makeBinPath [ exiftool ]}
  '';
}
