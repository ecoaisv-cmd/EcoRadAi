"use strict";

/**
 * ═══════════════════════════════════════════════════════════════════
 * WRAPPER DE ULTRASONIDO para EcoRadAi23.4d
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Este script "envuelve" los métodos de TAMIZAJES_REGISTRY y añade
 * los nuevos prompts al objeto PROMPTS_ESTUDIO, SIN modificar el
 * código original del ecosistema.
 * 
 * Añade 16 estudios de ultrasonido:
 *   - Abdominal, Obstétrica (4 variantes), Cardíaca, Renal, Tiroidea,
 *     Musculoesquelética, Vascular, Pélvica, Mamaria, Prostática,
 *     Testicular, Pediátrica, Partes blandas
 * 
 * Debe ejecutarse DESPUÉS del script principal del HTML.
 * ═══════════════════════════════════════════════════════════════════
 */
(function() {
    "use strict";

    console.log("🚀 [Wrapper US] Iniciando wrapper de estudios de ultrasonido...");

    /* ═══════════════════════════════════════════════════════════
       1. PROTOCOLOS DE ULTRASONIDO (16 estudios)
       ═══════════════════════════════════════════════════════════ */
    const PROTOCOLOS_US = {
        abdomen: {
            titulo: "Ecografía abdominal completa",
            items: [
                "HÍGADO: Vista subcostal derecha e intercostal. Evaluar ecogenicidad vs corteza renal. Medir eje longitudinal (12-15 cm). Evaluar bordes, superficie y lesiones focales. Doppler portal (flujo hepatopetal, velocidad >20 cm/s).",
                "VESÍCULA BILIAR: Vista longitudinal y transversal. Medir pared (<3 mm). Evaluar litiasis (sombra acústica posterior) y signo de Murphy ecográfico.",
                "VÍA BILIAR: Medir colédoco en porta hepatis (<6 mm en adultos, o <1 mm por década +1 mm). Evaluar dilatación de vía intrahepática.",
                "PÁNCREAS: Vista transgástrica o a través del bazo. Medir cabeza (<30 mm), cuerpo (<25 mm), cola (<30 mm). Evaluar ecogenicidad, masas o pseudoquistes.",
                "BAZO: Vista intercostal izquierda. Medir longitud (<12 cm) y grosor (<4 cm). Evaluar lesiones focales.",
                "RIÑONES: Vistas longitudinal y transversal. Medir longitud (10-12 cm), cortical (>7 mm). Evaluar morfología, litiasis, hidronefrosis (gradiente SFU), quistes complejos (Bosniak).",
                "AORTA: Longitudinal y transversal. Medir diámetro máximo (<30 mm). Evaluar aneurisma o trombo mural.",
                "TGI: Evaluar estómago (pared <5 mm en ayunas), duodeno, asas (pared <3 mm). Descartar invaginación o engrosamiento patológico.",
                "LÍQUIDO LIBRE: Evaluar espacios de Morrison, esplenorrenal y fondo de saco de Douglas.",
                "AJUSTES: Ganancia 60-70%, profundidad 12-15 cm. Utilizar armónicos tisulares si disponibles."
            ]
        },
        obstetrica_ge: {
            titulo: "Gestación temprana (<12 sem)",
            items: [
                "SACO GESTACIONAL: Intrauterino. Medir diámetro medio (DMS) para estimar EG (±5 días).",
                "VESÍCULA VITELINA: Visible 6-7 sem. Diámetro <6 mm en 1er trimestre.",
                "EMBRION: Medir LCC para datación precisa (5-10 sem). Latido >120 lpm.",
                "ANEXOS: Evaluar ovarios (descartar cuerpo lúteo hemorrágico) y trompas (descartar ectópico).",
                "CAVIDAD UTERINA: Descartar hematoma subcoriónico, miomas o malformaciones.",
                "AJUSTES: TV 7-10 MHz o TA 3.5-5 MHz. Vejiga llena para TA."
            ]
        },
        obstetrica_t1: {
            titulo: "Primer trimestre (12-14 sem)",
            items: [
                "BIOMETRÍA: LCC (45-84 mm), DBP, CC, CA, LF. Percentiles Intergrowth-21st.",
                "ANATOMÍA FETAL: Cráneo (forma, plexos coroideos), columna (integridad), corazón (4 cámaras), estómago (visible), vejiga (visible).",
                "PLACENTA: Localización (anterior, posterior, fondo, previa). Evaluar inserción.",
                "LÍQUIDO AMNIÓTICO: Medir ILA.",
                "CUELLO UTERINO: Longitud >25 mm.",
                "TN: Translucencia nucal <3.5 mm (FMF).",
                "DOPPLER: Evaluar flujo de ductus venoso (onda A positiva) si necesario.",
                "AJUSTES: Preset obstétrico, ganancia 50-60%."
            ]
        },
        obstetrica_t2: {
            titulo: "Segundo trimestre (15-24 sem)",
            items: [
                "BIOMETRÍA: DBP, CC, CA, LF, peso estimado (EFW). Percentiles Intergrowth-21st.",
                "ANATOMÍA DETALLADA: Cráneo (ventrículos <10 mm, cisterna magna <10 mm), columna, corazón (4 cámaras + tractos), abdomen (estómago, riñones, pared), extremidades (fémur, tibia, húmero).",
                "PLACENTA: Localización, grado Grannum 0-I.",
                "LÍQUIDO: ILA (5-25 cm).",
                "CUELLO: Longitud cervicouterina.",
                "AJUSTES: Preset obstétrico."
            ]
        },
        obstetrica_t3: {
            titulo: "Tercer trimestre (>24 sem)",
            items: [
                "BIOMETRÍA: DBP, CC, CA, LF, EFW. Especial atención a discordancia (ej. CA > CC sugiere macrosomía).",
                "PRESENTACIÓN: Cefálica, podálica, transversa.",
                "PLACENTA: Grado Grannum I-III. Descartar placenta previa.",
                "LÍQUIDO: ILA (5-25 cm). Evaluar oligohidramnios o polihidramnios.",
                "DOPPLER: Umbilical (IR <0.7). ACM (brain-sparing) si RCIU. Arteria uterina (para preeclampsia).",
                "AJUSTES: Preset obstétrico, profundidad ajustada."
            ]
        },
        cardiaca: {
            titulo: "Ecocardiograma transtorácico (ASE 2026)",
            items: [
                "PLAX: VI (DDVI, DSVI), AO, AI, válvula aórtica y mitral.",
                "PSAX: Válvulas (mitral, aórtica, tricúspide, pulmonar), tracto salida VI, septum.",
                "A4C: Cavidades (VI, VD, AI, AD), FEVI (Simpson), función diastólica (flujo mitral + Doppler tisular).",
                "A2C: VI y AI, pared inferior.",
                "SUBCOSTAL: Pericardio, septum.",
                "SUPRAESTERNAL: Arco aórtico.",
                "DOPPLER: Flujo relleno VI (E/A), tiempo deceleración, válvulas (estenosis/insuficiencia).",
                "AJUSTES: Preset cardíaco, alta resolución."
            ]
        },
        renal: {
            titulo: "Ecografía renal y vías urinarias",
            items: [
                "RIÑÓN D: Longitudinal y transversal (decúbito lateral izquierdo o supino). Longitud, cortical, ecogenicidad vs hígado.",
                "RIÑÓN I: Longitudinal y transversal (decúbito lateral derecho). Comparar con D.",
                "ECOGENICIDAD: Normalmente ligeramente hipoecoica o isoecoica vs hígado.",
                "PELVIS RENAL: Diámetro AP (<10 mm sin vejiga llena).",
                "VEJIGA: Suprapúbica. Pared, contenido. Residuo postmiccional (<50 ml).",
                "DOPPLER: IR (<0.7). Descartar trombosis vena renal.",
                "AJUSTES: Preset renal, ganancia 55-65%. Doppler color para flujo."
            ]
        },
        tiroidea: {
            titulo: "Ecografía tiroidea (ACR TI-RADS 2025)",
            items: [
                "LOBULO D: Longitudinal y transversal. Medir AP, T, L. Volumen (<15 ml).",
                "LOBULO I: Longitudinal y transversal. Comparar con D.",
                "ISTMO: Grosor (2-6 mm).",
                "PARÉNQUIMA: Ecogenicidad (homogénea/heterogénea). Descartar tiroiditis (patrón panal de abejas).",
                "NÓDULOS: Número, localización, tamaño (3 ejes), bordes (regulares/espiculados/microlobulados), ecogenicidad (anecoico/hipoecoico/isoecoico/hiperecoico), calcificaciones (micro/macro), vascularización (Doppler).",
                "TI-RADS: Aplicar clasificación ACR 2025 (puntuar y asignar categoría 1-5).",
                "GANGLIOS: Nivel VI y laterales. Tamaño, morfología (índice forma <2 sugiere patología), vascularización.",
                "AJUSTES: Lineal 7-15 MHz, ganancia 50-60%."
            ]
        },
        musk: {
            titulo: "Ecografía musculoesquelética (ESSR 2025)",
            items: [
                "TENDONES: Longitudinal y transversal. Evaluar arquitectura, ecogenicidad, roturas (parciales/completas), derrame en vaina.",
                "MÚSCULOS: Textura (ecogenicidad), hematomas, desgarros.",
                "LIGAMENTOS: Integridad, engrosamiento, lesiones.",
                "ARTICULACION/BURSA: Líquido articular, hipertrofia sinovial (Doppler), bursitis (ej. subacromial, trocantérea).",
                "INSERCIÓN ÓSEA: Entesitis (engrosamiento, hipoecogenicidad, erosiones).",
                "DINÁMICA: Explorar en neutro y estrés dinámico (hombro, codo, tobillo).",
                "AJUSTES: Lineal 7-12 MHz alta resolución."
            ]
        },
        vascular: {
            titulo: "Doppler vascular (SVU 2025)",
            items: [
                "CARÓTIDAS COMUNES: IMT (<0.9 mm). Placas ateromatosas (>1.5 mm).",
                "CARÓTIDAS INTERNAS: Origen. VPS (<125 cm/s), VDF (<40 cm/s).",
                "CARÓTIDAS EXTERNAS: Origen. Flujo baja resistencia.",
                "VERTEBRALES: Segmentos V2-V3. Flujo invertido (síndrome subclavia).",
                "COMPARACION BILATERAL: Comparar siempre ambos lados.",
                "AJUSTES: Doppler color, ángulo <60°, PRF ajustado (evitar aliasing)."
            ]
        },
        pelvica: {
            titulo: "Ecografía pélvica/ginecológica",
            items: [
                "ÚTERO: Longitudinal y transversal. Posición (anteversoflexión/retroversoflexión), dimensiones (5-8 cm).",
                "ENDOMETRIO: Grosor sagital (<5 mm postmenopausia, 2-4 mm folicular, 5-7 mm periovulatorio, 7-15 mm lútea).",
                "OVARIOS: Dimensiones 3 ejes, volumen (2-5 cm). Folículos, quistes (simple/complejo), masas.",
                "DOUGLAS: Líquido libre (normal en fase ovulatoria).",
                "VEJIGA: Pared, contenido. Descartar masas o litiasis.",
                "AJUSTES: Preset ginecológico. Vejiga llena (excepto TV)."
            ]
        },
        mama: {
            titulo: "Ecografía mamaria (ACR BI-RADS 2025)",
            items: [
                "MAMA D: Barrido sistemático por cuadrantes. Ecogenicidad glandular (densidad mamaria).",
                "MAMA I: Barrido sistemático por cuadrantes. Comparar con contralateral.",
                "LESIONES: Localización (reloj y distancia pezón). Forma (ovalada/redonda/irregular), orientación (paralela/no paralela), bordes (circunscritos/microlobulados/espiculados), ecogenicidad (anecoico/hipoecoico/isoecoico/hiperecoico), sombra acústica (posterior sugiere malignidad) o refuerzo (benigno).",
                "CONDUCTOS: Dilatación, contenido (papilomas).",
                "AXILA: Ganglios (tamaño, morfología, pérdida hilio graso).",
                "BI-RADS: Clasificación ACR 2025 (categoría 2-6).",
                "AJUSTES: Lineal 7-15 MHz. Ganancia ajustada para suprimir tejido graso."
            ]
        },
        prostatica: {
            titulo: "Ecografía prostática (AUA/EAU 2025)",
            items: [
                "PRÓSTATA: Transversal y longitudinal. AP, T, L. Volumen (0.52 x AP x T x L, 20-30 ml).",
                "CONTORNOS: Regulares/irregulares (sugiere infiltración).",
                "ECOGENICIDAD: Homogénea/heterogénea.",
                "LESIONES: Número, localización (zona periférica/de transición), tamaño, ecogenicidad.",
                "CÁPSULA: Integridad, rotura.",
                "VESÍCULAS SEMINALES: Tamaño, contenido.",
                "VEJIGA: Residuo postmiccional (<50 ml).",
                "AJUSTES: Convexo 3.5-5 MHz (TA) o transrectal 6-10 MHz."
            ]
        },
        genital_masc: {
            titulo: "Ecografía testicular y escrotal (AUA/EAU 2025)",
            items: [
                "TESTÍCULO D: Longitudinal y transversal. Volumen (15-25 ml).",
                "TESTÍCULO I: Comparar con D.",
                "ECOGENICIDAD: Homogénea/heterogénea.",
                "LESIONES: Masas focales (sugiere neoplasia) o microcalcificaciones.",
                "EPIDÍDIMO: Cabeza (<12 mm), cuerpo, cola. Descartar inflamación (epididimitis).",
                "TÚNICA VAGINAL: Hidrocele (líquido anecoico rodeando testículo).",
                "CORDÓN: Varicocele (>2 mm en reposo, aumenta con Valsalva).",
                "AJUSTES: Lineal 7-15 MHz. Doppler color PRF bajo."
            ]
        },
        pediatrico: {
            titulo: "Ecografía pediátrica (ESPR/EFSUMB 2025)",
            items: [
                "HÍGADO: Tamaño según percentiles por edad. Descartar lesiones (hemangioma, hepatoblastoma).",
                "VESÍCULA: Tamaño según edad. Litiasis (poco frecuente).",
                "BAZO: Tamaño según percentiles.",
                "RIÑONES: Tamaño según percentiles edad/talla (Rosenbaum). Cortical (>5 mm neonatos, >7 mm niños mayores).",
                "PÁNCREAS: Descartar pancreatitis (aumento tamaño, ecogenicidad heterogénea).",
                "INTESTINO: Pared (<3 mm). Descartar invaginación (signo riñón) o EHP (engrosamiento >4 mm, longitud >16 mm).",
                "AORTA: Descartar dilatación o coartación.",
                "AJUSTES: Lineal 5-12 MHz (niños mayores) o convexo 3.5-7 MHz (neonatos)."
            ]
        },
        partes_blandas: {
            titulo: "Ecografía de partes blandas (EFSUMB/AIUM 2025)",
            items: [
                "DESCRIPCIÓN: Evaluar lesión en longitudinal y transversal.",
                "TAMAÑO: Medir 3 dimensiones (AP, T, L).",
                "MORFOLOGÍA: Bordes (regulares/irregulares/lobulados), ecogenicidad (anecoico/hipoecoico/isoecoico/hiperecoico/mixto), sombra acústica posterior o refuerzo (cola de cometa).",
                "VASCULARIZACIÓN: Doppler color (hipervascular o avascular).",
                "ESTRUCTURAS ADYACENTES: Relación con músculos, tendones, vasos, nervios.",
                "AJUSTES: Lineal 7-15 MHz (superficial) o convexo 3.5-7 MHz (profundo)."
            ]
        }
    };

    /* ═══════════════════════════════════════════════════════════
       2. PROMPTS ESPECIALIZADOS (16 estudios)
       ═══════════════════════════════════════════════════════════ */
    const PROMPTS_US = {
        abdomen: `Actúa como radiólogo experto en ecografía abdominal con 15 años de experiencia. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES ESTRUCTURALES:

1. IDENTIFICACIÓN ANATÓMICA (obligatorio):
   - Para CADA órgano abdominal, describe lo que ves Y lo que esperarías ver normalmente.
   - Si un órgano no es completamente visible, indica "No completamente evaluado por [razón]".
   - Sugiere mediciones basadas en referencias anatómicas.
   - Incluye siempre el valor de referencia normal para cada medición.

2. PATRONES PATOLÓGICOS (obligatorio):
   - Busca activamente estos patrones:
     * HÍGADO: esteatosis (ecogenicidad aumentada > riñón), cirrosis (bordes irregulares), lesiones focales.
     * VESÍCULA: litiasis (sombras), colecistitis (pared >4mm), pólipos.
     * VÍAS BILIARES: dilatación (colédoco >6mm), litiasis.
     * PÁNCREAS: pancreatitis (aumento de tamaño, heterogeneidad), masas.
     * BAZO: esplenomegalia (>12cm), lesiones.
     * RIÑONES: hidronefrosis (>10mm), litiasis, masas (>4cm), quistes.
     * AORTA: aneurisma (>30mm).
     * TGI: engrosamiento parietal (>5mm).

3. MEDICIONES Y REFERENCIAS (obligatorio):
   - Para CADA órgano visible: medición estimada, valor de referencia normal, fuente, interpretación.

4. CORRELACIÓN CLÍNICA (obligatorio):
   - Relaciona cada hallazgo con el motivo de consulta y antecedentes.
   - Construye diagnóstico diferencial basado en patrones.

5. DIAGNÓSTICO DIFERENCIAL (obligatorio):
   - Proporciona 3 diagnósticos diferenciales con porcentaje de probabilidad.
   - Para cada uno: qué hallazgo lo sustenta y qué lo descartaría.

DATOS CLÍNICOS:
Paciente: {NOMBRE}, {EDAD} años, {SEXO}.
Motivo: {MOTIVO}
Antecedentes: {ANTECEDENTES}
Equipo: {EQUIPO} | Transductor: {TRANSDUCTOR} | Frecuencia: {FRECUENCIA} MHz

FORMATO EXACTO (sin títulos extras):
1. DATOS CLÍNICOS RELEVANTES: Análisis del contexto clínico.

2. HALLAZGOS POR ÓRGANO:
   - HÍGADO: [descripción]. Medición: [valor] (normal: [rango] según [fuente]). Interpretación: [normal/anormal]. Patrón: [normal/esteatosis/cirrosis/lesión].
   - VESÍCULA BILIAR: [descripción].
   - VÍAS BILIARES: [descripción].
   - PÁNCREAS: [descripción].
   - BAZO: [descripción].
   - RIÑONES: [descripción D e I].
   - AORTA: [descripción].
   - TGI: [descripción].
   - LÍQUIDO LIBRE: [descripción].

3. TABLA DE MEDICIONES:
   | Parámetro | Valor | Referencia | Fuente | Interpretación |

4. PATRONES PATOLÓGICOS IDENTIFICADOS:
   - [lista de patrones detectados]

5. ANÁLISIS CLÍNICO:
   - Correlación de hallazgos con síntomas.
   - Diagnóstico principal con evidencia.
   - Diagnósticos diferenciales (3 con %):
     * Diagnóstico 1 (XX%): Sustentado por [hallazgo]. Descartado por [hallazgo].
     * Diagnóstico 2 (XX%): Sustentado por [hallazgo]. Descartado por [hallazgo].
     * Diagnóstico 3 (XX%): Sustentado por [hallazgo]. Descartado por [hallazgo].

6. RECOMENDACIONES:
   - Estudios complementarios (con justificación).
   - Seguimiento (plazo).
   - Derivación si aplica.

REGLAS ESTRICTAS DE FORMATO:
- Responde EXCLUSIVAMENTE en español médico formal.
- NO incluyas razonamientos internos, cálculos matemáticos, ni texto en inglés.
- NO uses frases como "Wait", "Let me", "Actually", "Hmm", "Note:", "I will", "Maybe", "Perhaps".
- NO expliques tu proceso de pensamiento. Solo el informe médico final.
- NO incluyas notas al pie, advertencias técnicas, ni descargos de responsabilidad.
REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- NO uses almohadillas para títulos.
- NO uses bloques de código con acentos graves.
- Para enumerar usa "1.", "2.".
- Para listar usa guion simple.
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- TODAS las palabras en español deben llevar tilde y eñe según corresponda.
- NUNCA reemplaces ñ por n: riñón, tamaño, año, niño, señal, muñeca, pequeño, dueño, España, compañía, montaña, campaña, sueño.
- Tildes en -ción, -sión: hipertensión, diagnóstico, evaluación, presión, función, medicación, duración, validación, derivación, nutrición, cardiología, hepatología, nefrología.`,

        obstetrica_ge: `Actúa como especialista en medicina materno-fetal con 15 años de experiencia. Tu conocimiento incluye embriología, anatomía fetal temprana y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: saco gestacional intrauterino (5-6 sem), vesícula vitelina (6-7 sem), embrión (7-8 sem), latido (>120 lpm).
2. Si no ves alguna estructura, indica "No visible a esta edad gestacional".
3. Patrones: embarazo ectópico (ausencia de saco intrauterino + masa anexial), molar (panal de abejas), amenaza de aborto (hematoma subcoriónico), gemelar.
4. 3 diagnósticos diferenciales con %.
5. Calcula la fecha probable de parto.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Saco, vitelina, embrión (LCC), latido, anexos, cavidad uterina.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ISUOG 2026, NICE 2026.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas. Nunca reemplaces ñ por n.`,

        obstetrica_t1: `Actúa como especialista en medicina materno-fetal con 15 años de experiencia, primer trimestre (12-14 sem). Tu conocimiento incluye embriología, anatomía fetal y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Biometría: LCC (45-84mm), DBP, CC, CA, LF. Percentiles Intergrowth-21.
2. Anatomía: cráneo, columna, corazón (4 cámaras), estómago, vejiga.
3. Placenta, líquido (ILA), cuello (>25mm), TN (<3.5mm).
4. Patrones: aneuploidías (TN aumentada), defectos de tubo neural, cardiopatías.
5. 3 diagnósticos diferenciales con %.
6. Calcula la fecha probable de parto.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Biometría, anatomía, placenta, líquido, cuello, TN.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ISUOG 2026, FMF 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        obstetrica_t2: `Actúa como especialista en medicina materno-fetal con 15 años de experiencia, segundo trimestre (15-24 sem). Tu conocimiento incluye embriología, anatomía fetal y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Biometría: DBP, CC, CA, LF, peso estimado. Percentiles Intergrowth-21.
2. Anatomía completa: cráneo (ventrículos, cisterna magna), columna, corazón (4 cámaras + tractos), abdomen, extremidades.
3. Placenta (grado 0-I), ILA (5-25 cm), cuello (>25 mm).
4. Patrones: anomalías estructurales, restricción crecimiento, placenta previa.
5. 3 diagnósticos diferenciales con %.
6. Calcula la fecha probable de parto.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Biometría, anatomía, placenta, ILA, cuello.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ISUOG 2026, AIUM 2026.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        obstetrica_t3: `Actúa como especialista en medicina materno-fetal con 15 años de experiencia, tercer trimestre (>24 sem). Tu conocimiento incluye embriología, anatomía fetal y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Biometría: DBP, CC, CA, LF, peso estimado. Percentiles Intergrowth-21.
2. Presentación (cefálica/podálica/transversa), latido, movimientos.
3. Placenta (grado I-III), ILA (5-25 cm).
4. Doppler umbilical: IR <0.7. Doppler cerebral media (si indicado).
5. Patrones: restricción crecimiento (peso <p3), macrosomía (>p97), oligohidramnios (<5cm), polihidramnios (>25cm), preeclampsia.
6. 3 diagnósticos diferenciales con %.
7. Calcula la fecha probable de parto.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Biometría, presentación, placenta, ILA, Doppler.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ISUOG 2026, ACOG 2026.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        cardiaca: `Actúa como cardiólogo imagenólogo con 15 años de experiencia, ecocardiografía ASE 2023. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Vistas: PLAX, PSAX, A4C, A2C, subcostal, supraesternal.
2. Mediciones: DDVI (<57mm), DSVI (<40mm), SIV (6-10mm), PPVI (6-10mm), FEVI (>55%), TAPSE (>17mm).
3. Patrones: disfunción sistólica (FEVI <55%), diastólica, hipertrofia (>10mm), dilatación, valvulopatías, derrame (>5mm).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Vistas, cavidades, válvulas, derrame.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ASE 2026, ESC 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        renal: `Actúa como radiólogo especialista en ecografía renal con 15 años de experiencia. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: riñón D, riñón I, vejiga, uréteres (si visibles).
2. Mide: longitud (10-12cm), cortical (>7mm), IR (<0.7).
3. Patrones: hidronefrosis (>10mm), litiasis (sombras), masas (>4cm), quistes (Bosniak), ERC (cortical <7mm).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Riñón D, Riñón I, vejiga.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: EFSUMB 2025, KDIGO 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        tiroidea: `Actúa como endocrinólogo imagenólogo con 15 años de experiencia, ecografía tiroidea ACR TI-RADS 2023. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: lóbulo D, lóbulo I, istmo, nódulos, ganglios.
2. Mide: volumen (<15ml), istmo (2-6mm).
3. Patrones TI-RADS: composición (quístico/sólido/mixto), ecogenicidad (anecoico/hipoecoico/isoecoico/hiperecoico), forma (más alto que ancho sugiere malignidad), bordes (lisos/irregulares/espiculados), calcificaciones (micro sugiere malignidad), vascularización (intranodular sugiere malignidad).
4. Clasifica nódulos TI-RADS 1-5. Recomienda PAAF si TI-RADS 4-5.
5. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Lóbulo D, Lóbulo I, istmo, nódulos, ganglios.
3. TABLA DE MEDICIONES
4. CLASIFICACIÓN TI-RADS (ACR 2025)
5. PATRONES PATOLÓGICOS IDENTIFICADOS
6. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
7. RECOMENDACIONES: ATA 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        musk: `Actúa como radiólogo especialista en ecografía musculoesquelética con 15 años de experiencia. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: tendones, músculos, ligamentos, bursa, inserción ósea.
2. Mide: tendones (<6mm), bursa (<2mm).
3. Patrones: tendinopatía (engrosamiento, hipoecogenicidad), rotura (defecto fibrilar), bursitis (líquido >2mm), entesitis (engrosamiento inserción), desgarro muscular (hematoma).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Tendones, músculos, ligamentos, articulación, inserción ósea.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ESSR 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        vascular: `Actúa como angiólogo especialista en Doppler vascular con 15 años de experiencia. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: carótidas comunes, internas, externas, vertebrales.
2. Mide: IMT (<0.9mm), VPS (<125cm/s), VDF (<40cm/s), IR (<0.7).
3. Patrones: placa ateromatosa (engrosamiento focal >1.5mm), estenosis (>50% si VPS >125cm/s), oclusión (ausencia de flujo).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Carótidas, Doppler, vertebrales.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: SVU 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        pelvica: `Actúa como ginecólogo imagenólogo con 15 años de experiencia, ecografía pélvica. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: útero, endometrio, ovarios, vejiga, Douglas.
2. Mide: útero (5-8cm), endometrio (2-15mm según fase), ovarios (2-5cm).
3. Patrones: miomas (masas hipoecoicas), adenomiosis (engrosamiento miometrial), pólipos endometriales, quistes de ovario (simples/complejos), endometriomas, síndrome de ovario poliquístico (>12 folículos), embarazo ectópico.
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Útero, endometrio, ovarios, vejiga, Douglas.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ISUOG 2026, ACOG 2026.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        mama: `Actúa como radiólogo especialista en ecografía mamaria con 15 años de experiencia, BI-RADS ACR 2024. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: mama D, mama I, axila, lesiones.
2. Patrones BI-RADS: forma (ovalada/redonda/irregular), orientación (paralela/no paralela sugiere malignidad), bordes (circunscritos/microlobulados/espiculados sugiere malignidad), ecogenicidad (anecoico/hipoecoico/isoecoico/hiperecoico), sombra acústica (posterior sugiere malignidad).
3. Clasifica lesiones BI-RADS 2-6. Recomienda PAAF si BI-RADS 4-5.
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Mama D, Mama I, axila, lesiones.
3. TABLA DE MEDICIONES
4. CLASIFICACIÓN BI-RADS (ACR 2025)
5. PATRONES PATOLÓGICOS IDENTIFICADOS
6. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
7. RECOMENDACIONES: AIUM 2026.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        prostatica: `Actúa como urólogo imagenólogo con 15 años de experiencia, ecografía prostática. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: próstata, vesículas seminales, vejiga.
2. Mide: AP, transversal, longitudinal. Volumen (20-30ml).
3. Patrones: hiperplasia benigna (aumento de volumen simétrico), cáncer (nódulo hipoecoico en zona periférica, cápsula irregular), prostatitis (ecogenicidad heterogénea), cálculos (sombras).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Próstata, vesículas, vejiga.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: AUA 2025, EAU 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        genital_masc: `Actúa como urólogo imagenólogo con 15 años de experiencia, ecografía testicular y escrotal. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: testículo D, testículo I, epidídimo, túnica, cordón.
2. Mide: testículo (15-25ml), epidídimo cabeza (<12mm).
3. Patrones: tumor testicular (masa hipoecoica, vascularizada), epididimitis (aumento de tamaño, hipervascularización), torsión (ausencia de flujo), varicocele (>2mm en reposo, aumenta con Valsalva), hidrocele (líquido anecoico).
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Testículo D, Testículo I, epidídimo, túnica, cordón.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: AUA 2025, EAU 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        pediatrico: `Actúa como radiólogo pediatra con 15 años de experiencia, ecografía infantil. Tu conocimiento incluye anatomía detallada, valores de referencia y patrones patológicos. Genera un informe médico formal estructurado.

INSTRUCCIONES:
1. Identifica: hígado, vesícula, bazo, riñones, páncreas, intestino.
2. Mide: según percentiles pediátricos (ESPR 2023).
3. Patrones: estenosis hipertrófica de píloro (engrosamiento >4mm, longitud >16mm), intususcepción (target sign), nefrocalcinosis, quistes.
4. 3 diagnósticos diferenciales con %.

DATOS: {NOMBRE}, {EDAD}a, {SEXO}. Motivo: {MOTIVO}. Antecedentes: {ANTECEDENTES}. Equipo: {EQUIPO} | {TRANSDUCTOR}.

FORMATO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS: Hígado, vesícula, bazo, riñones, páncreas, intestino.
3. TABLA DE MEDICIONES
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
6. RECOMENDACIONES: ESPR 2025, EFSUMB 2025.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`,

        partes_blandas: `Actúa como radiólogo especialista en ecografía de partes blandas con 15 años de experiencia, siguiendo las guías EFSUMB 2025 y AIUM 2026. Tu conocimiento incluye anatomía de tejidos blandos, patrones de lesiones benignas y malignas, y clasificaciones actualizadas. Genera un informe médico formal estructurado.

INSTRUCCIONES ESTRUCTURALES:

1. IDENTIFICACIÓN ANATÓMICA (obligatorio):
   - Describe la lesión en al menos dos planos (longitudinal y transversal).
   - Localiza la lesión en relación a planos anatómicos (ej. superficial, profundo, muscular, subcutáneo).
   - Describe la relación con estructuras adyacentes (músculos, tendones, vasos, nervios).

2. CARACTERIZACIÓN DE LA LESIÓN (obligatorio):
   - TAMAÑO: Medir en 3 dimensiones (AP, transversal, longitudinal). Indicar volumen aproximado.
   - MORFOLOGÍA: Bordes (regulares, irregulares, lobulados, espiculados), forma, eje (paralelo o no paralelo a la piel).
   - ECOGENICIDAD: Anecoico, hipoecoico, isoecoico, hiperecoico, mixto.
   - RETROECOGENICIDAD: Refuerzo acústico posterior, sombra acústica, cola de cometa.

3. VASCULARIZACIÓN (obligatorio):
   - Evaluar con Doppler color y potencia.
   - Describir patrón: avascular, periférica, central, mixta.

4. PATRONES PATOLÓGICOS (obligatorio):
   - QUISTE SIMPLE, QUISTE COMPLEJO, LIPOMA, HEMANGIOMA, NEUROFIBROMA/SCHWANNOMA, TUMOR DESMOIDE, SARCOMA, HEMATOMA, ABSCESO, CUERPO EXTRAÑO, GRANULOMA.

5. CLASIFICACIÓN Y SISTEMAS DE GRADAJE: Benigna, intermedia, sospechosa, maligna.

6. DIAGNÓSTICO DIFERENCIAL: 3 diagnósticos diferenciales con porcentaje de probabilidad.

7. MEDICIONES Y REFERENCIAS: Tabla con mediciones detalladas.

DATOS CLÍNICOS:
Paciente: {NOMBRE}, {EDAD} años, {SEXO}.
Motivo: {MOTIVO}
Antecedentes: {ANTECEDENTES}
Equipo: {EQUIPO} | Transductor: {TRANSDUCTOR} | Frecuencia: {FRECUENCIA} MHz

FORMATO EXACTO:
1. DATOS CLÍNICOS RELEVANTES
2. HALLAZGOS ECOGRÁFICOS: Localización, Tamaño, Morfología, Ecogenicidad, Retroecogenicidad, Vascularización, Estructuras adyacentes.
3. TABLA DE MEDICIONES Y CARACTERÍSTICAS
4. PATRONES PATOLÓGICOS IDENTIFICADOS
5. CLASIFICACIÓN Y SUGERENCIA DIAGNÓSTICA
6. ANÁLISIS CLÍNICO: Diagnóstico principal, 3 diferenciales con %.
7. RECOMENDACIONES

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos, ni dobles asteriscos, ni guiones bajos.
- Para enumerar usa "1.", "2.".
- Títulos en MAYÚSCULAS sin símbolos.
REGLAS ORTOGRÁFICAS OBLIGATORIAS:
- Español formal con tildes y eñes correctas.`
    };

    /* ═══════════════════════════════════════════════════════════
       3. NOMBRES CORTOS Y GUÍAS DE REFERENCIA
       ═══════════════════════════════════════════════════════════ */
    const NOMBRES_US = {
        abdomen: "Abdominal",
        obstetrica_ge: "Obstétrica - Gestación temprana",
        obstetrica_t1: "Obstétrica - 1er Trimestre",
        obstetrica_t2: "Obstétrica - 2do Trimestre",
        obstetrica_t3: "Obstétrica - 3er Trimestre",
        cardiaca: "Cardíaca",
        renal: "Renal",
        tiroidea: "Tiroidea (TI-RADS)",
        musk: "Musculoesquelética",
        vascular: "Doppler vascular",
        pelvica: "Pélvica",
        mama: "Mama (BI-RADS)",
        prostatica: "Próstata",
        genital_masc: "Testicular",
        pediatrico: "Pediátrica",
        partes_blandas: "Partes blandas (EFSUMB/AIUM)"
    };

    const GUIAIS_US = {
        abdomen: "ESR 2025, EFSUMB 2025, AASLD 2025, ACR 2026, SRU 2024",
        obstetrica_ge: "ISUOG 2026, NICE 2026, ACOG 2026",
        obstetrica_t1: "ISUOG 2026, FMF 2025, Intergrowth-21",
        obstetrica_t2: "ISUOG 2026, Intergrowth-21, AIUM 2026",
        obstetrica_t3: "ISUOG 2026, Intergrowth-21, ACOG 2026",
        cardiaca: "ASE 2026, ESC 2025",
        renal: "EFSUMB 2025, KDIGO 2025, AUA 2025",
        tiroidea: "ACR TI-RADS 2025, ATA 2025",
        musk: "ESSR 2025",
        vascular: "SVU 2025",
        pelvica: "ISUOG 2026, ACOG 2026",
        mama: "ACR BI-RADS 2025, AIUM 2026",
        prostatica: "AUA 2025, EAU 2025",
        genital_masc: "AUA 2025, EAU 2025",
        pediatrico: "ESPR 2025, EFSUMB 2025",
        partes_blandas: "EFSUMB 2025, AIUM 2026, ESSR 2025"
    };

    const ICONOS_US = {
        abdomen: "🫀",
        obstetrica_ge: "🤰",
        obstetrica_t1: "🤰",
        obstetrica_t2: "🤰",
        obstetrica_t3: "🤰",
        cardiaca: "❤️",
        renal: "🩺",
        tiroidea: "🦋",
        musk: "🦴",
        vascular: "🩸",
        pelvica: "🌸",
        mama: "🎗️",
        prostatica: "♂️",
        genital_masc: "♂️",
        pediatrico: "🧒",
        partes_blandas: "🔬"
    };

    const PRECIOS_US = {
        abdomen: { corp: 30, rural: 20 },
        obstetrica_ge: { corp: 25, rural: 15 },
        obstetrica_t1: { corp: 30, rural: 20 },
        obstetrica_t2: { corp: 35, rural: 22 },
        obstetrica_t3: { corp: 35, rural: 22 },
        cardiaca: { corp: 40, rural: 25 },
        renal: { corp: 25, rural: 15 },
        tiroidea: { corp: 25, rural: 15 },
        musk: { corp: 28, rural: 18 },
        vascular: { corp: 35, rural: 22 },
        pelvica: { corp: 28, rural: 18 },
        mama: { corp: 35, rural: 22 },
        prostatica: { corp: 30, rural: 20 },
        genital_masc: { corp: 25, rural: 15 },
        pediatrico: { corp: 30, rural: 20 },
        partes_blandas: { corp: 28, rural: 18 }
    };

    /* ═══════════════════════════════════════════════════════════
       4. INSTRUCCIÓN JSON UNIVERSAL (compatibilidad con el ecosistema)
       ═══════════════════════════════════════════════════════════ */
    const INSTRUCCION_JSON = `

⚠️ CRÍTICO: Este bloque JSON es OBLIGATORIO. Sin él, las interconsultas con especialistas IA fallarán.
Debes devolver SIEMPRE el bloque completo, incluso si el informe narrativo es largo.
Si no puedes llenar algún campo, usa null. NUNCA omitas el bloque completo.

===JSON_ESTRUCTURADO===
{
  "findings": {},
  "metrics": [],
  "riesgo_global": { "nivel": "BAJO", "score": 0 },
  "diagnostico_diferencial": [],
  "plan": {
    "no_farmacologico": [],
    "farmacologico": [],
    "metas": [],
    "laboratorios": [],
    "derivaciones": []
  },
  "interconsultas_sugeridas": []
}
===FIN_JSON===`;

    /* ═══════════════════════════════════════════════════════════
       5. CONSTRUIR LOS OBJETOS DE TAMIZAJE
       ═══════════════════════════════════════════════════════════ */
    function construirTamizajesUS() {
        return Object.keys(PROTOCOLOS_US).map((id, index) => {
            const precio = PRECIOS_US[id] || { corp: 25, rural: 15 };
            const protocolo = PROTOCOLOS_US[id];
            const guias = (GUIAIS_US[id] || "").split(",").map(g => g.trim()).filter(Boolean);

            // Generar etiquetas de imágenes a partir de los items del protocolo
            const etiquetas = protocolo.items.map(item => {
                const primera = item.split(":")[0].trim();
                return primera.length > 40 ? primera.substring(0, 40) : primera;
            });

            return {
                id: id,
                activo: true,
                meta: {
                    nombre: "ULTRASONIDO " + (NOMBRES_US[id] || protocolo.titulo),
                    nombre_corto: NOMBRES_US[id] || protocolo.titulo,
                    icono: ICONOS_US[id] || "📡",
                    descripcion: protocolo.titulo,
                    duracion_min: 15,
                    precio_basico: precio.corp,
                    orden: 100 + index
                },
                captura: {
                    requiere_labs: false,
                    requiere_clinica: true,
                    requiere_vitales: true,
                    imagenes_min: 1,
                    imagenes_max: 6,
                    etiquetas_imagenes: etiquetas
                },
                protocolo: {
                    titulo: protocolo.titulo,
                    items: protocolo.items
                },
                prompt_key: id,
                especialistas: {
                    fijos: ["radiologo"],
                    interconsultas_disponibles: [
                        "internista", "ginecologo", "cardiologo",
                        "endocrinologo", "nefrologo", "gastroenterologo"
                    ]
                },
                reglasInterconsulta: {},
                guias: guias,
                jsonSchema: {
                    findings: { hallazgo_principal: "" },
                    metrics: []
                }
            };
        });
    }

    /* ═══════════════════════════════════════════════════════════
       6. APLICAR EL WRAPPER
       ═══════════════════════════════════════════════════════════ */
    function aplicarWrapper() {
        let exitos = 0;
        let errores = 0;

        // ─── A. AÑADIR PROMPTS AL OBJETO GLOBAL ───
        if (typeof window.PROMPTS_ESTUDIO !== "undefined") {
            try {
                const promptsConJSON = {};
                Object.keys(PROMPTS_US).forEach(id => {
                    if (!window.PROMPTS_ESTUDIO[id]) {
                        // Añadimos la instrucción JSON al final del prompt
                        promptsConJSON[id] = PROMPTS_US[id] + INSTRUCCION_JSON;
                        console.log("  ✅ [Wrapper US] Prompt añadido: \"" + id + "\"");
                        exitos++;
                    }
                });
                Object.assign(window.PROMPTS_ESTUDIO, promptsConJSON);
            } catch (e) {
                console.error("  ❌ [Wrapper US] Error añadiendo prompts:", e);
                errores++;
            }
        } else {
            console.warn("  ⚠️ [Wrapper US] PROMPTS_ESTUDIO no disponible");
        }

        // ─── B. ENVOLVER TAMIZAJES_REGISTRY.listar ───
        if (typeof window.TAMIZAJES_REGISTRY !== "undefined" && !window.TAMIZAJES_REGISTRY._usWrapped) {
            try {
                const originalListar = window.TAMIZAJES_REGISTRY.listar.bind(window.TAMIZAJES_REGISTRY);
                const nuevosTamizajes = construirTamizajesUS();

                window.TAMIZAJES_REGISTRY.listar = function() {
                    const listaOriginal = originalListar();
                    // Evitar duplicados si el wrapper se aplica dos veces
                    const idsOriginales = new Set(listaOriginal.map(t => t.id));
                    const nuevosFiltrados = nuevosTamizajes.filter(t => !idsOriginales.has(t.id));
                    const resultado = [...listaOriginal, ...nuevosFiltrados];
                    // Ordenar por meta.orden
                    return resultado.sort((a, b) => (a.meta.orden || 99) - (b.meta.orden || 99));
                };
                window.TAMIZAJES_REGISTRY._usWrapped = true;
                console.log("  ✅ [Wrapper US] TAMIZAJES_REGISTRY.listar envuelto.");
                exitos++;

                // ─── C. ENVOLVER TAMIZAJES_REGISTRY.obtener ───
                const originalObtener = window.TAMIZAJES_REGISTRY.obtener.bind(window.TAMIZAJES_REGISTRY);
                window.TAMIZAJES_REGISTRY.obtener = function(id) {
                    const encontradoOriginal = originalObtener(id);
                    if (encontradoOriginal) return encontradoOriginal;
                    return nuevosTamizajes.find(t => t.id === id) || null;
                };
                window.TAMIZAJES_REGISTRY._usObtenerWrapped = true;
                console.log("  ✅ [Wrapper US] TAMIZAJES_REGISTRY.obtener envuelto.");
                exitos++;

                // ─── D. AÑADIR PRECIOS AL OBJETO GLOBAL ───
                if (typeof window.PRECIOS_TAMIZAJES !== "undefined") {
                    Object.keys(PRECIOS_US).forEach(id => {
                        if (!window.PRECIOS_TAMIZAJES[id]) {
                            const p = PRECIOS_US[id];
                            window.PRECIOS_TAMIZAJES[id] = {
                                corp: p.corp,
                                rural: p.rural,
                                tier: "ultrasonido",
                                nombre: NOMBRES_US[id]
                            };
                        }
                    });
                    console.log("  ✅ [Wrapper US] Precios añadidos a PRECIOS_TAMIZAJES.");
                    exitos++;
                }
            } catch (e) {
                console.error("  ❌ [Wrapper US] Error envolviendo TAMIZAJES_REGISTRY:", e);
                errores++;
            }
        } else if (window.TAMIZAJES_REGISTRY?._usWrapped) {
            console.log("  ℹ️ [Wrapper US] TAMIZAJES_REGISTRY ya estaba envuelto.");
        } else {
            console.warn("  ⚠️ [Wrapper US] TAMIZAJES_REGISTRY no disponible");
        }

        // ─── E. RE-RENDERIZAR LA UI ───
        setTimeout(() => {
            try {
                if (typeof window.renderSelectorEstudios === "function") {
                    window.renderSelectorEstudios();
                    console.log("  ✅ [Wrapper US] renderSelectorEstudios ejecutado");
                }
                if (typeof window.renderTamizajeHeader === "function") {
                    window.renderTamizajeHeader();
                }
                if (typeof window.renderEcosistema === "function") {
                    window.renderEcosistema();
                }
                if (typeof window.renderSteps === "function") {
                    window.renderSteps();
                }
                console.log("  ✅ [Wrapper US] UI re-renderizada.");
            } catch (e) {
                console.error("  ❌ [Wrapper US] Error re-renderizando UI:", e);
            }
        }, 300);

        console.log("");
        console.log("═══════════════════════════════════════════════════");
        console.log("🎉 [Wrapper US] INTEGRACIÓN COMPLETADA");
        console.log("   Exitos: " + exitos + " | Errores: " + errores);
        console.log("   Estudios de ultrasonido disponibles: " + Object.keys(PROTOCOLOS_US).length);
        console.log("═══════════════════════════════════════════════════");
        console.log("");
    }

    /* ═══════════════════════════════════════════════════════════
       7. ESPERAR A QUE EL SISTEMA PRINCIPAL ESTÉ LISTO
       ═══════════════════════════════════════════════════════════ */
    let intentos = 0;
    const MAX_INTENTOS = 60; // 60 * 250ms = 15s

    const intervalo = setInterval(() => {
        intentos++;
        const listo =
            typeof window.TAMIZAJES_REGISTRY !== "undefined" &&
            typeof window.PROMPTS_ESTUDIO !== "undefined" &&
            typeof window.PRECIOS_TAMIZAJES !== "undefined";

        if (listo) {
            clearInterval(intervalo);
            console.log("[Wrapper US] Sistema principal detectado tras " + intentos + " intento(s).");
            aplicarWrapper();
        } else if (intentos >= MAX_INTENTOS) {
            clearInterval(intervalo);
            console.error("❌ [Wrapper US] Timeout tras " + MAX_INTENTOS + " intentos. Verifica que el HTML principal cargó correctamente.");
            console.error("   Estado actual:");
            console.error("   - TAMIZAJES_REGISTRY: " + typeof window.TAMIZAJES_REGISTRY);
            console.error("   - PROMPTS_ESTUDIO: " + typeof window.PROMPTS_ESTUDIO);
            console.error("   - PRECIOS_TAMIZAJES: " + typeof window.PRECIOS_TAMIZAJES);
        }
    }, 250);

})();
