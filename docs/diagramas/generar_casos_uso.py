"""Genera casos de uso UML en SVG, PNG y PlantUML, sin dependencias de red."""
from pathlib import Path
from html import escape
import textwrap
from PIL import Image, ImageDraw, ImageFont
import zipfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'casos-de-uso'
OUT.mkdir(parents=True, exist_ok=True)
ACTORS = {
 'est': 'Estudiante', 'doc': 'Docente tutor', 'coord': 'Coordinador de tutoría',
 'admin': 'Administrador (DBU)', 'serv': 'Profesional de servicio',
 'vice': 'Vicerrectorado', 'dec': 'Decano', 'user': 'Usuario del sistema',
}
# Cada asociación es participación en una función, no una secuencia ni un permiso global.
DIAGRAMS = [
 ('01-general', 'Vista general del SIT',
  ['est','doc','coord','serv'], ['admin','vice','dec'], [
   ('G01','Solicitar y consultar tutoría',['est','doc','coord','admin']),
   ('G02','Registrar acompañamiento tutorial',['doc']),
   ('G03','Gestionar el periodo y asignaciones',['coord','admin']),
   ('G04','Gestionar derivaciones',['doc','serv','admin']),
   ('G05','Evaluar y consultar resultados',['est','coord','admin']),
   ('G06','Consultar informes e indicadores',['doc','coord','admin','vice']),
   ('G07','Gestionar amonestaciones',['dec','coord','admin']),
   ('G08','Administrar configuración institucional',['admin','coord','vice']),
  ]),
 ('02-acceso-cuenta', 'Acceso y cuenta personal', ['user'], [], [
   ('AC01','Iniciar sesión',['user']),
   ('AC02','Recuperar contraseña',['user']),
   ('AC03','Actualizar perfil personal',['user']),
   ('AC04','Cambiar contraseña',['user']),
   ('AC05','Consultar notificaciones',['user']),
   ('AC06','Cerrar sesión',['user']),
  ]),
 ('03-estudiante', 'Portal del estudiante', ['est'], [], [
   ('ES01','Solicitar tutoría',['est']),
   ('ES02','Consultar estado y respuesta',['est']),
   ('ES03','Consultar sesiones propias',['est']),
   ('ES04','Consultar lugar o enlace de sesión',['est']),
   ('ES05','Responder evaluación de tutoría',['est']),
   ('ES06','Registrar sugerencias en evaluación',['est']),
  ]),
 ('04-acompanamiento', 'Acompañamiento del docente tutor', ['doc'], ['coord','admin'], [
   ('AT01','Consultar estudiantes y expediente',['doc','coord','admin']),
   ('AT02','Registrar entrevista inicial',['doc']),
   ('AT03','Registrar persona de red de apoyo',['doc']),
   ('AT04','Atender solicitud de tutoría',['doc','coord','admin']),
   ('AT05','Programar sesión individual o grupal',['doc']),
   ('AT06','Reprogramar o cancelar sesión',['doc']),
   ('AT07','Registrar asistencia y evidencias',['doc']),
   ('AT08','Registrar seguimiento tutorial',['doc']),
   ('AT09','Consultar alertas de riesgo',['doc','coord','admin']),
  ]),
 ('05-periodo', 'Preparación y gestión del periodo', ['coord'], ['admin'], [
   ('PE01','Pedir listas a las escuelas',['coord','admin']),
   ('PE02','Importar o registrar estudiantes',['coord','admin']),
   ('PE03','Importar docentes tutores',['admin']),
   ('PE04','Asignar docente por ciclo',['coord','admin']),
   ('PE05','Solicitar aceptación del docente',['coord','admin']),
   ('PE06','Reasignar estudiante con motivo',['coord','admin']),
   ('PE07','Gestionar plan semestral y resolución',['coord','admin']),
   ('PE08','Consultar versiones del plan',['coord','admin']),
   ('PE09','Cerrar periodo académico',['admin']),
  ]),
 ('06-derivaciones', 'Derivación y atención especializada', ['doc'], ['serv','admin'], [
   ('DE01','Crear derivación a un servicio',['doc']),
   ('DE02','Consultar casos autorizados',['doc','serv','admin']),
   ('DE03','Registrar recepción del caso',['serv','admin']),
   ('DE04','Registrar atención y observaciones',['serv','admin']),
   ('DE05','Cerrar caso derivado',['serv','admin']),
   ('DE06','Descargar constancia de derivación',['doc','serv','admin']),
   ('DE07','Adjuntar constancia firmada',['doc','serv','admin']),
   ('DE08','Supervisar derivaciones de servicios',['admin']),
  ]),
 ('07-informes-evaluacion', 'Informes y evaluación del servicio', ['doc','coord'], ['admin','vice'], [
   ('IN01','Consultar horarios y asistencia',['doc','coord','admin']),
   ('IN02','Elaborar informe semestral propio',['doc']),
   ('IN03','Consultar informe consolidado',['admin','vice']),
   ('IN04','Consultar indicadores',['coord','admin','vice']),
   ('IN05','Consultar resultados de evaluación',['coord','admin']),
   ('IN06','Consultar sugerencias de estudiantes',['coord','admin']),
   ('IN07','Habilitar o cerrar evaluación',['admin']),
   ('IN08','Exportar informes autorizados',['doc','coord','admin','vice']),
  ]),
 ('08-administracion', 'Administración y supervisión institucional', ['admin'], ['coord','vice','dec'], [
   ('AD01','Gestionar usuarios, roles y servicios',['admin']),
   ('AD02','Vincular cuenta del estudiante',['admin','coord']),
   ('AD03','Configurar correos de escuelas',['admin','coord']),
   ('AD04','Gestionar sedes',['admin','vice']),
   ('AD05','Gestionar catálogos y parámetros',['admin']),
   ('AD06','Configurar identidad visual',['admin']),
   ('AD07','Consultar bitácora de auditoría',['admin']),
   ('AD08','Consultar amonestaciones',['admin','coord','dec']),
   ('AD09','Emitir amonestación',['admin','dec']),
  ]),
]

W=1600
def font(size,bold=False):
 return ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if bold else 'arial.ttf'),size)

def generate(slug,title,left,right,cases):
 H=max(1100,350+len(cases)*105)
 im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', '<rect width="100%" height="100%" fill="white"/>']
 def line(x1,y1,x2,y2,color='#667085',width=2):
  d.line((x1,y1,x2,y2),fill=color,width=width);svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')
 def txt(x,y,text,size=22,bold=False,color='#182230',background=False):
  if background:
   box=d.textbbox((x,y),text,font=font(size,bold),anchor='mm'); box=(box[0]-5,box[1]-3,box[2]+5,box[3]+3)
   d.rectangle(box,fill='white');svg.append(f'<rect x="{box[0]}" y="{box[1]}" width="{box[2]-box[0]}" height="{box[3]-box[1]}" fill="white"/>')
  d.text((x,y),text,font=font(size,bold),fill=color,anchor='mm')
  svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="{size}" font-weight="{"bold" if bold else "normal"}" fill="{color}">{escape(text)}</text>')
 def ellipse(cx,cy,rx,ry,fill='white',color='#24364b'):
  d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=fill,outline=color,width=2)
  svg.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{color}" stroke-width="2"/>')
 txt(800,38,title,32,True)
 txt(800,78,'Sistema Integral de Tutoría · UNTRM',22)
 d.rectangle((320,115,1280,H-80),outline='#24364b',width=2);svg.append(f'<rect x="320" y="115" width="960" height="{H-195}" fill="none" stroke="#24364b" stroke-width="2"/>')
 txt(800,141,'SIT · límite del sistema',19,True)
 pos={}
 for side,actors in [('left',left),('right',right)]:
  for i,a in enumerate(actors):
   x=150 if side=='left' else 1450
   y=220+(i+.5)*(H-400)/max(1,len(actors))
   pos[a]=(x,y,side)
 for i,(cid,label,actors) in enumerate(cases):
  cy=210+i*105
  for a in actors:
   x,y,side=pos[a];line(x+33 if side=='left' else x-33,y,555 if side=='left' else 1045,cy)
 for a,(x,y,side) in pos.items():
  ellipse(x,y-45,17,17);line(x,y-28,x,y+23,'#24364b',3);line(x-33,y-9,x+33,y-9,'#24364b',3);line(x,y+23,x-26,y+58,'#24364b',3);line(x,y+23,x+26,y+58,'#24364b',3)
  for j,t in enumerate(textwrap.wrap(ACTORS[a],21)):txt(x,y+86+j*26,t,21,True,background=True)
 for i,(cid,label,actors) in enumerate(cases):
  cy=210+i*105;ellipse(800,cy,245,43,'#f8fafc')
  txt(800,cy-23,cid,16,True,color='#526276')
  lines=textwrap.wrap(label,37)
  for j,t in enumerate(lines):txt(800,cy+(j-(len(lines)-1)/2)*24+9,t,22)
 txt(800,H-47,'Asociación = participación; el alcance depende del rol, escuela, servicio y periodo.',18)
 txt(800,H-22,'Modelo descriptivo · revisión 18/10/2026 · no representa secuencia de pasos',17,color='#526276')
 svg.append('</svg>');(OUT/f'{slug}.svg').write_text('\n'.join(svg),encoding='utf-8');im.save(OUT/f'{slug}.png',dpi=(200,200))
 p=['@startuml','left to right direction','skinparam shadowing false','skinparam defaultFontName Arial',f'title {title}']
 for a in left+right:p.append(f'actor "{ACTORS[a]}" as {a}')
 p.append('rectangle "SIT UNTRM" {')
 for cid,label,actors in cases:p.append(f'  usecase "{cid}\\n{label}" as {cid}')
 p.append('}')
 for cid,label,actors in cases:
  for a in actors:p.append(f'{a} -- {cid}')
 p+=['note bottom','Alcance restringido por rol, escuela, servicio y periodo.','Autenticación previa, salvo ingreso y recuperación.','end note','@enduml']
 (OUT/f'{slug}.puml').write_text('\n'.join(p)+'\n',encoding='utf-8')

for diagram in DIAGRAMS:generate(*diagram)
with zipfile.ZipFile(OUT/'Diagramas_Casos_Uso_SIT_UNTRM.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(OUT.iterdir()):
  if f.suffix in ['.svg','.png','.puml','.md']:z.write(f,f.name)
print(f'Generados {len(DIAGRAMS)} diagramas en SVG/PNG/PlantUML: {OUT}')
