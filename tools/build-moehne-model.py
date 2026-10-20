"""In Blender ausführen: Blender -b --python tools/build-moehne-model.py.

Eigene didaktische Rekonstruktion, keine Vermessung oder Fotogrammetrie.
Hauptmaße nach Ruhrverband. Krümmung, Gelände, Details und Standpunkte angenähert.
Exports: bearbeitbare .blend, .glb, lokale Web-Meshdaten, gerenderte Vorschau.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "assets" / "moehne"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for block in bpy.data.materials:
    bpy.data.materials.remove(block)

def material(name, color, roughness=0.85):
    m = bpy.data.materials.new(name)
    linear = tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in color)
    m.diffuse_color = (*linear, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*linear, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return m

stone = material("Heller Grauwacke-Stein", (0.60, 0.58, 0.52))
stone_dark = material("Fugen und Steinlagen", (0.43, 0.43, 0.38))
cap = material("Kronenweg und Abdeckungen", (0.76, 0.74, 0.67))
roof = material("Schieferdächer", (0.19, 0.23, 0.23))
land = material("Schematisches Gelände", (0.55, 0.61, 0.46))
land_side = material("Geländesockel", (0.43, 0.48, 0.37))
water = material("Wasser – Stausee", (0.29, 0.47, 0.51), 0.28)
water_low = material("Wasser – Ausgleichsweiher", (0.36, 0.54, 0.56), 0.36)
window = material("Öffnungen und Tore", (0.12, 0.16, 0.15))

def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def box(name, loc, scale, mat, angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler.z = angle
    obj.data.materials.append(mat)
    return obj

R = 500.0  # Darstellungsannahme, kein belegtes historisches Radiusmaß.
SWEEP = 650.0 / R
HEIGHT = 40.3

def at(t, offset=0, z=0):
    a = (t - 0.5) * SWEEP
    return ((R + offset) * math.sin(a), (R + offset) * math.cos(a) - R, z)

def strip(name, z0, z1, near0, far0, near1, far1, mat, steps=120):
    verts = []
    for i in range(steps + 1):
        t = i / steps
        verts += [at(t, near0, z0), at(t, far0, z0), at(t, near1, z1), at(t, far1, z1)]
    faces = []
    for i in range(steps):
        a, b = 4*i, 4*(i+1)
        faces += [(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)]
    faces += [(0,1,3,2),(steps*4,steps*4+2,steps*4+3,steps*4+1)]
    return mesh(name, verts, faces, mat)

# Rechteckiger, ruhiger Geländesockel. Keine erfundene topografische Vermessung.
box("Geländesockel", (0, -95, -12), (1600, 1400, 24), land_side)
box("Talboden", (0, -95, 0.05), (1600, 1400, 0.1), land)
# Hohe Uferseiten schließen die Schauseite ab. Höhen sind nur eine Darstellung.
for side in [-1, 1]:
    verts=[(side*300,-100,0),(side*800,-700,0),(side*800,605,0),(side*300,100,0),
           (side*360,-100,48),(side*800,-700,58),(side*800,605,65),(side*360,100,48)]
    mesh("Schematisches Ufer " + str(side), verts, [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], land)

# Stauseeausschnitt: schließt an die gekrümmte Wasserseite an, keine volle Seeform.
lake=[at(i/120,2,35.6) for i in range(121)] + [(670,605,35.6),(-670,605,35.6)]
mesh("Stausee – nur Ausschnitt", lake, [tuple(range(len(lake)))], water)
pool=[(-125,-160,0.5),(-210,-220,0.5),(-180,-430,0.5),(-30,-555,0.5),(140,-470,0.5),(195,-295,0.5),(110,-175,0.5)]
mesh("Ausgleichsweiher – schematische Lage", pool, [tuple(range(len(pool)))], water_low)
box("Abfluss der Möhne", (25,-650,0.3), (35,300,0.4), water_low)

# 650 m gekrümmte Krone, 40,3 m Höhe, 34,2 m Fuß und 6,25 m Kronenbreite.
strip("Bruchstein-Gewichtsstaumauer",0,HEIGHT,-32.2,2,-4.25,2,stone)
strip("Kronenweg",HEIGHT,HEIGHT+0.35,-4.25,2,-4.25,2,cap)
strip("Wasserseitige Brüstung",HEIGHT+0.35,HEIGHT+1.4,1.5,2.1,1.5,2.1,cap)
strip("Luftseitige Brüstung",HEIGHT+0.35,HEIGHT+1.4,-4.5,-3.9,-4.5,-3.9,cap)

# Sichtbare horizontale Steinlagen als zurückhaltende geometrische Gliederung.
for row in range(1,24):
    z = row * 1.65
    if z >= HEIGHT: break
    face_offset = -32.2 + 27.95*(z/HEIGHT)
    strip("Steinlage %02d" % row,z,z+0.10,face_offset-0.08,face_offset+0.07,face_offset-0.08,face_offset+0.07,stone_dark)

# Entlastungsöffnungen als dunkle Einsätze, bewusst geometrisch vereinfacht.
for i in range(105):
    t=(i+0.5)/105
    a=(t-.5)*SWEEP
    box("Entlastungsöffnung %03d"%i,at(t,-4.5,38.6),(2.1,.32,1.2),window,-a)

for number,t in enumerate([.26,.74],1):
    a=(t-.5)*SWEEP
    box("Hallenaufbau %d"%number,at(t,-1.2,43.7),(31,11,7),stone,-a)
    for delta in [-9,0,9]:
        local=Vector(at(t,-7.0,43.2))+Vector((math.cos(a)*delta,-math.sin(a)*delta,0))
        box("Torbogen dunkel",local,(5,.3,5),window,-a)
    box("Turm %d"%number,at(t,-1.1,49.7),(9,10,10),stone,-a)
    x,y,z=at(t,-1.1,54.7)
    # Schieferdach als vierseitiger, hoher Pyramidenkörper.
    vs=[(-5.8,-6,0),(5.8,-6,0),(5.8,6,0),(-5.8,6,0),(0,0,13)]
    verts=[(x+vx*math.cos(a)+vy*math.sin(a),y-vx*math.sin(a)+vy*math.cos(a),z+vz)for vx,vy,vz in vs]
    mesh("Schieferdach %d"%number,verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)],roof)
    for delta in [-10,10]:
        v=Vector(at(t,8,23))+Vector((math.cos(a)*delta,-math.sin(a)*delta,0))
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=3.5,depth=43,location=v)
        bpy.context.object.name="Schieberturm – vereinfacht"
        bpy.context.object.data.materials.append(stone)
        v.z=45.1
        bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=4.4,radius2=0,depth=4.6,location=v)
        bpy.context.object.name="Schieberturmdach"
        bpy.context.object.data.materials.append(roof)

# Provisorischer Durchlass unter der Mauer als anschauliches kleines Detail.
for t in [.26,.74]:
    box("Ablassmund – Lage schematisch",at(t,-31,4),(9,7,7),window,-(t-.5)*SWEEP)

def to_web(v):
    return [round(float(v[0]),4),round(float(v[2]),4),round(float(-v[1]),4)]

pois=[
    {"id":"krone","title":"Die Mauerkrone","position":to_web(at(.5,-1,45)),"text":"Der Kronenweg verbindet die Ufer. Im Modell folgt seine Mittellinie einem 650 Meter langen Bogen. Brüstungen und Öffnungen sind vereinfacht.","photo":"mauer"},
    {"id":"gewicht","title":"Der breite Mauerfuß","position":to_web((0,-29,7)),"text":"Unten ist die Gewichtsstaumauer wesentlich breiter als oben: maximal 34,2 Meter gegenüber 6,25 Metern an der Krone. Das Gelände ist hier nur schematisch modelliert.","photo":"zerstoerung"},
    {"id":"tuerme","title":"Hallenaufbauten und Türme","position":to_web(at(.74,-1,63)),"text":"Die markanten Aufbauten gehören zur Architektur von Franz Brantzky. Die kleineren, wasserseitigen Schiebertürme haben eine andere Funktion. Architekturdetails im Modell sind angenähert.","photo":"entwurf"},
    {"id":"speicher","title":"Der Stausee","position":to_web((90,180,37)),"text":"Das Modell zeigt nur einen Ausschnitt des Stauraums, nicht den gesamten Möhnesee. Die Wasserhöhe dient der Anschauung und ist kein aktueller Messwert.","photo":"panorama"},
    {"id":"weiher","title":"Der Ausgleichsweiher","position":to_web((0,-340,2)),"text":"Unterhalb der Hauptmauer liegt der Ausgleichsweiher. Seine Ufer sind im Modell frei vereinfacht; er ist nicht eines der Vorbecken an Möhne und Heve.","photo":"vorbecken"},
    {"id":"bresche","title":"Die Bresche von 1943","position":to_web(at(.5,-3,28)),"text":"Ungefähr in der Mauermitte entstand 1943 die große Lücke. Das Modell zeigt den intakten heutigen Zustand, keine Rekonstruktion der damaligen Bruchkanten.","photo":"bruch"}
]
spots=[
    {"id":"gesamt","title":"Gesamtansicht von der Luftseite","position":to_web((0,-600,2.0)),"target":to_web((0,-25,24)),"focal":28,"range":[24,35],"text":"24–35 mm: Mauer und Landschaft passen gemeinsam ins Bild. 28 mm ist hier der Ausgangspunkt. Die niedrige Perspektive macht die Höhe sichtbar.","photo":"mauer"},
    {"id":"kronenblick","title":"Entlang der Mauerkrone","position":to_web(at(.10,-1,43.4)),"target":to_web(at(.74,-1,48)),"focal":50,"range":[35,50],"text":"35–50 mm: der Kronenweg führt den Blick zu den Türmen. Der Standpunkt liegt im Modell auf dem Kronenweg; kleine Schritte vor Ort verändern die Überlagerung der Türme.","photo":"entwurf"},
    {"id":"turmdetail","title":"Die Türme als Detail","position":to_web((160,-260,2.0)),"target":to_web(at(.74,-1,52)),"focal":85,"range":[70,100],"text":"70–100 mm: ein engerer Ausschnitt betont Turm und Dach. Am selben Standpunkt verändert die Brennweite den Ausschnitt; die Perspektive ändert sich erst mit dem Standort.","photo":"mauer"},
    {"id":"uferblick","title":"Schräger Blick vom Modellufer","position":to_web((470,-260,55)),"target":to_web((-30,-15,27)),"focal":35,"range":[28,50],"text":"28–50 mm: der schräge Blick zeigt die Krümmung und die unterschiedlichen Wasserstände. Dieser erhöhte Punkt ist ein reiner Modellstandpunkt, kein nachgewiesener öffentlicher Aussichtspunkt.","photo":"vorbecken"}
]
for item in pois+spots:
    empty=bpy.data.objects.new(("POI_" if "focal"not in item else "FOTOSPOT_")+item["id"],None)
    bpy.context.collection.objects.link(empty)
    x,y,z=item["position"]
    empty.location=(x,-z,y)
    empty.empty_display_type="SPHERE"
    empty.empty_display_size=6
    empty["Hinweis"]=item["text"]

# Materialweise zusammengefasste Dreiecke: exakt dieselbe Blender-Geometrie im Web.
groups={}
deps=bpy.context.evaluated_depsgraph_get()
for obj in list(bpy.context.scene.objects):
    if obj.type!="MESH": continue
    evaluated=obj.evaluated_get(deps)
    data=evaluated.to_mesh()
    data.calc_loop_triangles()
    for triangle in data.loop_triangles:
        mat=obj.data.materials[triangle.material_index]
        g=groups.setdefault(mat.name,{"name":mat.name,"color":list(mat.diffuse_color[:3]),"positions":[]})
        for index in triangle.vertices:
            g["positions"].extend(to_web(obj.matrix_world @ data.vertices[index].co))
    evaluated.to_mesh_clear()
payload={"generator":"Blender "+bpy.app.version_string,"units":"metres","dimensions":{"crestLength":650,"maxHeight":40.3,"baseWidth":34.2,"crestWidth":6.25},"limits":"Didaktisches Anschauungsmodell; Krümmungsradius, Gelände, Ufer, Gebäude- und Fotostandpunkte sind angenähert. Kein Vermessungsmodell.","meshes":list(groups.values()),"pois":pois,"spots":spots}
(OUT/"moehne-modell.json").write_text(json.dumps(payload,separators=(",",":"),ensure_ascii=False),encoding="utf8")

# Szene für eine lokale Vorschau, auch bei fehlendem WebGL.
bpy.ops.object.camera_add(location=(880,-1100,690))
camera=bpy.context.object
camera.name="Gesamtansicht"
direction=Vector((0,-40,10))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=1450
camera.data.clip_end=10000
bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='SUN',location=(0,-200,800))
bpy.context.object.name="Sonnenlicht"
bpy.context.object.rotation_euler=(math.radians(25),math.radians(-20),math.radians(-35))
bpy.context.object.data.energy=3
bpy.context.scene.world.use_nodes=True
bpy.context.scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.82,.84,.80,1)
bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=24
scene.render.resolution_x=1440
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/"moehne-vorschau.png")
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"moehnetalsperre.blend"))
bpy.ops.export_scene.gltf(filepath=str(OUT/"moehnetalsperre.glb"),export_format='GLB',use_selection=False,export_cameras=False,export_lights=False)
bpy.ops.render.render(write_still=True)
print("MOEHNE_MODEL_READY",len(groups),"materials",sum(len(g['positions'])//9 for g in groups.values()),"triangles")
