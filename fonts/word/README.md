# Font parts for Word export

These full ODTTF parts are generated from the repository's existing desktop font
files and the shared Fondamento files. They are loaded only when an actual cut
is used in a Word export, and embedded inside that document. No glyph subsetting:
the exported text remains editable with the full font's supported characters.

`data/schriftsetzer-word-fonts.json` records the source, original license path,
embedding flags, family/style, obfuscation key and checksum for every cut.
Copyright and license metadata in the fonts are retained. License files remain
at the original paths, not duplicated here.

Variable sources are frozen to the selected weight and the other axes' default
values with fontTools' named-instance naming. Where an upstream instance name
is absent, a weight suffix identifies that cut in Word. Outlines are not redesigned.
Rebuild with `scripts/build-schriftsetzer-word-fonts.py` (fontTools required).
ODTTF follows WordprocessingML's first-32-byte obfuscation; it is not encryption.
