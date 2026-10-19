"""Build full, editable Word font parts from the existing licensed local fonts.

Requires fontTools. No downloads. Variable fonts become named static instances,
with all other axes pinned to their defaults. No glyph subsetting. Instance
names identify the actual weight; missing upstream names receive a weight suffix.
Only embedding with unrestricted/editable rights is allowed. License metadata
and glyphs are retained. Output is DOCX-obfuscated ODTTF, not a new font family.
"""
import concurrent.futures
import hashlib
import io
import json
import math
import functools
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fonts/word"

@functools.lru_cache(maxsize=None)
def desktop_sources(family_id):
    choices = []
    for path in sorted((ROOT / "fonts/typografie" / family_id).glob("*.ttf")):
        font = TTFont(path)
        italic = bool(font["OS/2"].fsSelection & 1)
        axis = next((a for a in font["fvar"].axes if a.axisTag == "wght"), None) if "fvar" in font else None
        choices.append((path, italic, axis.minValue if axis else font["OS/2"].usWeightClass, axis.maxValue if axis else font["OS/2"].usWeightClass))
        font.close()
    return choices

def build(task):
    family, file, weight = task
    source = ROOT / file["path"].replace(".woff2", ".ttf")
    if not source.exists():
        source = next(path for path, italic, low, high in desktop_sources(family["id"]) if italic == (file["style"] == "italic") and low <= weight <= high)
    font = TTFont(source)
    rights = font["OS/2"].fsType
    if rights & (0x2 | 0x4 | 0x200):
        return {"familyId":family["id"], "weight":weight, "style":file["style"],
                "name":font["name"].getDebugName(1), "fsType":rights, "blocked":True,
                "license":family["license"], "licensePath":family["licensePath"]}
    if "fvar" in font:
        axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
        axes["wght"] = weight
        try:
            font = instantiateVariableFont(font, axes, updateFontNames=True)
        except ValueError:
            # A few upstream STAT tables omit an otherwise valid UI weight.
            # Give this embedded-only instance an unambiguous legacy family.
            font = instantiateVariableFont(TTFont(source), axes, updateFontNames=False)
            italic = file["style"] == "italic"
            legacy = family["name"] + " " + str(weight)
            sub = "Italic" if italic else "Regular"
            values = {1:legacy, 2:sub, 4:legacy+(" Italic" if italic else ""),
                      6:(family["id"]+"-"+str(weight)+("Italic" if italic else "")),
                      16:legacy, 17:sub}
            for record in font["name"].names:
                if record.nameID in values:
                    record.string = values[record.nameID].encode(record.getEncoding())
            font["OS/2"].fsSelection &= ~(0x20 | 0x1 | 0x40)
            font["OS/2"].fsSelection |= 1 if italic else 0x40
            font["head"].macStyle = 2 if italic else 0
    assert "fvar" not in font
    font.recalcTimestamp = False
    stream = io.BytesIO()
    font.flavor = None
    font.save(stream)
    raw = stream.getvalue()
    digest = hashlib.sha256(raw).hexdigest()
    keyhex = digest[:32].upper()
    key = "{" + "-".join([keyhex[:8],keyhex[8:12],keyhex[12:16],keyhex[16:20],keyhex[20:]]) + "}"
    mask = bytes.fromhex(keyhex)[::-1]
    obfuscated = bytearray(raw)
    for i in range(32):
        obfuscated[i] ^= mask[i % 16]
    relative = f"fonts/word/{family['id']}-{weight}-{file['style']}.odttf"
    (ROOT / relative).write_bytes(obfuscated)
    flags = font["OS/2"].fsSelection
    return {"familyId":family["id"], "weight":weight, "style":file["style"],
            "name":font["name"].getDebugName(1), "bold":bool(flags & 0x20),
            "italic":bool(flags & 1), "path":relative, "key":key,
            "fsType":rights, "source":str(source.relative_to(ROOT)).replace("\\", "/"),
            "license":family["license"], "licensePath":family["licensePath"],
            "sha256":hashlib.sha256(obfuscated).hexdigest()}

if __name__ == "__main__":
    catalogue = json.loads((ROOT / "data/typografie-fonts.json").read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    tasks = []
    for family in catalogue["families"]:
        for file in family["files"]:
            weights = file["weight"]
            if isinstance(weights, list):
                weights = range(math.ceil(weights[0]/100)*100, math.floor(weights[1])+1, 100)
            else:
                weights = [weights]
            tasks.extend((family, file, weight) for weight in weights)
    unique = {}
    for task in tasks:
        family, file, weight = task
        key = (family["id"], file["style"], weight)
        if key not in unique or file["path"].startswith("fonts/typografie/"):
            unique[key] = task
    tasks = list(unique.values())
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        faces = list(pool.map(build, tasks))
    manifest = {"description":"Full local font parts for editable DOCX embedding; no glyph subsetting", "faces":faces}
    (ROOT / "data/schriftsetzer-word-fonts.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
    print(f"Built {len(faces)} embeddable faces for {len(catalogue['families'])} families", flush=True)
